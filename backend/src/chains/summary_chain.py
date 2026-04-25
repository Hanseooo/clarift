"""
Summary chain for generating structured summaries and quiz analysis.

Process:
1. Generate a structured Markdown summary from text chunks.
2. Analyze content to flag quiz‑worthy sections.
"""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Iterable
from typing import Any, Optional, TypedDict

from langchain_google_genai import ChatGoogleGenerativeAI
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from src.chains.content_analysis_chain import ContentAnalysisChainInput, run_content_analysis_chain
from src.chains.retry import is_retryable_error
from src.core.config import settings

logger = logging.getLogger(__name__)


class SummaryChainInput(TypedDict):
    """Input for the summary chain."""

    chunks: list[str]
    user_preferences: Optional[dict]


class SummaryChainOutput(TypedDict):
    """Output from the summary chain."""

    title: str
    content: str
    quiz_type_flags: dict[str, Any]


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
    Execute the summary chain.

    This implementation uses Gemini via LangChain to generate a structured summary
    and analyze content for quiz opportunities.
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

    # Generate structured summary in Markdown format
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

Rules:
1. Incorporate the requested formats and styles where they naturally fit.
2. Generate a concise, descriptive title for this summary (max 32 characters).
3. Return ONLY valid JSON with keys: "title", "content", "quiz_type_flags".
   - "title": string, max 32 chars
   - "content": string, the full Markdown summary
   - "quiz_type_flags": object with boolean flags for quiz types (mcq, true_false, identification, multi_select, ordering)

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

    llm_output = await _invoke_with_retry(llm, summary_prompt)

    # Parse JSON response from LLM
    title = "Untitled summary"
    summary_content = llm_output
    quiz_type_flags: dict[str, Any] = {}
    try:
        parsed = json.loads(llm_output)
        if isinstance(parsed, dict):
            title = str(parsed.get("title", title))[:32]
            summary_content = str(parsed.get("content", llm_output))
            quiz_type_flags = dict(parsed.get("quiz_type_flags", {}))
    except json.JSONDecodeError:
        pass

    # Throttle between LLM calls to avoid rate limits (similar to embeddings worker)
    await asyncio.sleep(2)

    # Analyze content for quiz-worthiness
    analysis_result = await run_content_analysis_chain(
        ContentAnalysisChainInput(chunks=input["chunks"])
    )
    if not quiz_type_flags:
        quiz_type_flags = dict(analysis_result)

    return {
        "title": title,
        "content": summary_content,
        "quiz_type_flags": quiz_type_flags,
    }
