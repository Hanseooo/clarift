"""
Summary chain (5‑step) for generating structured summaries and diagrams.

Steps:
1. Extract key concepts
2. Identify relationships
3. Generate structured summary
4. Generate diagram syntax (Mermaid/Graphviz)
5. Flag quiz‑worthy sections
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Iterable
from typing import Optional, TypedDict

from langchain_google_genai import ChatGoogleGenerativeAI
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from src.chains import is_retryable_error
from src.core.config import settings

logger = logging.getLogger(__name__)


class SummaryChainInput(TypedDict):
    """Input for the summary chain."""

    format: str  # "bullet", "outline", "paragraph"
    chunks: list[str]
    user_preferences: Optional[dict]


class SummaryChainOutput(TypedDict):
    """Output from the summary chain."""

    content: str
    diagram_syntax: Optional[str]
    diagram_type: Optional[str]
    quiz_type_flags: dict[str, bool]


def _normalize_llm_text(raw_content: object) -> str:
    if isinstance(raw_content, str):
        return raw_content.strip()
    if isinstance(raw_content, Iterable):
        return "".join(str(part) for part in raw_content).strip()
    return str(raw_content).strip()


@retry(
    wait=wait_exponential(min=1, max=8),
    stop=stop_after_attempt(3),
    retry=retry_if_exception(is_retryable_error),
    reraise=True,
)
async def _invoke_with_retry(llm: ChatGoogleGenerativeAI, prompt: str) -> str:
    response = await llm.ainvoke(prompt)
    return _normalize_llm_text(response.content)


async def run_summary_chain(input: SummaryChainInput) -> SummaryChainOutput:
    """
    Execute the 5‑step summary chain.

    This implementation uses Gemini via LangChain to generate a structured summary.
    """
    logger.info("Running summary chain")

    # Initialize Gemini LLM
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite",
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0.2,
    )

    context_text = "\n\n".join(input["chunks"]).strip()
    if not context_text:
        raise ValueError("No chunks available for summary generation")

    # Step 1-3: Generate structured summary in Markdown format
    summary_prompt = f"""You are a study assistant. Create a comprehensive study summary of the following text.

Text: {context_text}

Generate a structured summary using advanced Markdown formatting:

## Formatting Requirements:
1. **Use Markdown Tables** for comparisons when appropriate
2. **Use LaTeX syntax** for math equations:
   - Inline math: `$E = mc^2$`
   - Display math: `$$\\int_a^b f(x) dx$$`
3. **Use GitHub alert syntax** for key concepts:
   - `> [!NOTE]` for important notes
   - `> [!IMPORTANT]` for critical information
   - `> [!TIP]` for helpful tips
4. **Structure with Heading 2 (`##`)** for major sections - each `##` will create a new page in the UI
5. Use bullet points, numbered lists, and bold/italic formatting as needed

## Content Requirements:
- Start with a brief overview
- List key concepts with explanations
- Explain relationships between concepts
- Include examples where helpful
- End with a summary paragraph

Format: Use clean, well-structured Markdown with proper spacing."""

    user_prefs = input.get("user_preferences")
    if user_prefs:
        prefs = []
        level = user_prefs.get("education_level")
        if level:
            prefs.append(f"{level} level")

        formats = user_prefs.get("output_formats")
        if formats:
            prefs.append(f"formats: {', '.join(formats)}")

        styles = user_prefs.get("explanation_styles")
        if styles:
            prefs.append(f"styles: {', '.join(styles)}")

        custom = user_prefs.get("custom_instructions")
        if custom:
            prefs.append(f"Custom instructions: {custom}")

        if prefs:
            prefs_str = "; ".join(prefs)
            summary_prompt += f"\n\nApply these user preferences: {prefs_str}"

    summary_content = await _invoke_with_retry(llm, summary_prompt)

    # Throttle between LLM calls to avoid rate limits (similar to embeddings worker)
    await asyncio.sleep(2)

    # Step 4: Generate diagram syntax (simplified)
    diagram_prompt = f"""Based on the key concepts and relationships from this summary, generate Mermaid.js diagram syntax.

Summary: {summary_content}

Focus on the main entities and their connections.

Return only the Mermaid syntax, no extra text."""

    diagram_syntax = await _invoke_with_retry(llm, diagram_prompt)
    diagram_type = "mermaid"

    # Step 5: Flag quiz‑worthy sections (simplified)
    quiz_flags = {
        "multiple_choice": True,
        "fill_in_blanks": bool(summary_content),
    }

    return {
        "content": summary_content,
        "diagram_syntax": diagram_syntax,
        "diagram_type": diagram_type,
        "quiz_type_flags": quiz_flags,
    }
