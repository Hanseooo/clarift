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
from typing import Any, NotRequired, Optional, TypedDict

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
    format_hints: NotRequired[Optional[str]]


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


def _extract_json(text: str) -> dict | None:
    """Extract a JSON object from LLM output, stripping markdown fences if present."""
    text = text.strip()
    # Strip markdown code fences
    if text.startswith("```"):
        lines = text.splitlines()
        # Remove first line if it starts with ```
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        # Remove last line if it starts with ```
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    # Find the first '{' and last '}' to isolate the JSON object
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None

    json_str = text[start : end + 1]
    try:
        parsed = json.loads(json_str)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass
    return None


@retry(
    wait=wait_exponential(min=1, max=8),
    stop=stop_after_attempt(3),
    retry=retry_if_exception(is_retryable_error),
    reraise=True,
)
async def _invoke_with_retry(llm: ChatGoogleGenerativeAI, prompt: str) -> str:
    response = await llm.ainvoke(prompt)
    return _normalize_llm_text(response.content)


SUMMARY_PROMPT = """You are a precise study assistant for Filipino students. Your job is to extract and organize information from the provided study material into a structured summary.

## ABSOLUTE RULES
1. Base the ENTIRE summary STRICTLY on the provided text below. Do NOT use outside knowledge.
2. Do NOT invent facts, examples, definitions, or relationships not explicitly present in the text.
3. If the text lacks detail on a topic, omit that topic rather than elaborating.
4. If the text is insufficient to create a meaningful summary, return a JSON with `"title": "Insufficient Material"` and `"content": "The provided text is too short or unclear to summarize. Please upload more detailed study material."`.

## PROVIDED TEXT
{context_text}

## OUTPUT FORMAT
Return ONLY a single valid JSON object. No markdown code fences, no extra text.

JSON schema:
{
  "title": "string (max 32 chars, descriptive of the text's main topic)",
  "content": "string (full markdown summary, max 1500 words)",
  "quiz_type_flags": {
    "mcq": true,
    "true_false": bool,
    "identification": bool,
    "multi_select": bool,
    "ordering": bool
  }
}

## CONTENT STRUCTURE (markdown string inside "content")
Follow this structure in your markdown:
1. Start with a 2-3 sentence overview of the text.
2. Use Heading 2 (`##`) for major sections. Each `##` renders as a new page in the UI.
3. Under each `##`, use bullet points or numbered lists for key concepts.
4. Use **bold** for critical terms the first time they appear.
5. Use GitHub alert syntax ONLY when the text explicitly highlights important information:
   - `> [!NOTE]` for noteworthy points
   - `> [!IMPORTANT]` for critical warnings or exam essentials
   - `> [!TIP]` for helpful mnemonics or study shortcuts
6. Use Markdown tables ONLY for explicit comparisons in the source text.
7. **Mermaid diagrams**: if the content describes a process, flow, hierarchy, or relationship, include a Mermaid diagram inside a fenced code block labeled `mermaid`. Example:
   ```mermaid
   flowchart TD
     A[Start] --> B{Decision}
     B -->|Yes| C[Action 1]
     B -->|No| D[Action 2]
   ```
8. Use LaTeX for math:
   - Inline: `$E = mc^2$`
   - Display: `$$\\int_a^b f(x) dx$$`
9. End with a brief 2-3 sentence summary paragraph.

## QUIZ_TYPE_FLAGS EVALUATION
Evaluate the text and set booleans:
- `true_false`: true if the text contains clear factual statements that can be affirmed or denied (e.g., definitions, properties, historical facts).
- `identification`: true if the text contains specific named terms, technical vocabulary, numbers, dates, or labels a student must recall verbatim.
- `multi_select`: true if the text contains categories, groups, lists with shared attributes, or "which of the following" style content.
- `ordering`: true if the text describes sequential steps, processes, timelines, or ranked stages.

## SELF-CHECK (perform before outputting)
- [ ] Is every fact in the summary found in the provided text?
- [ ] Is the title ≤ 32 characters?
- [ ] Is the content ≤ 1500 words?
- [ ] Are all `quiz_type_flags` booleans (not strings)?
- [ ] Is the output valid JSON with no trailing commas?"""


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
    summary_prompt = SUMMARY_PROMPT.replace("{context_text}", context_text)

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
            summary_prompt += (
                f"\n\nApply these user preferences ONLY if they fit the material: {prefs_str}. "
                "Do NOT force a preference if the text does not naturally support it "
                "(e.g., do not create tables if no comparisons exist, do not use analogies if none are appropriate, "
                "do not change the education level if the text is already clear). "
                "When in doubt, prioritize accuracy and fidelity to the source text over satisfying the preference."
            )

    format_hints = input.get("format_hints")
    if format_hints:
        summary_prompt += f"\n\n## FORMAT HINTS\n{format_hints}\n"

    llm_output = await _invoke_with_retry(llm, summary_prompt)

    # Parse JSON response from LLM
    title = "Untitled summary"
    summary_content = llm_output
    quiz_type_flags: dict[str, Any] = {}
    parsed = _extract_json(llm_output)
    if parsed is not None:
        title = str(parsed.get("title", title))[:32]
        summary_content = str(parsed.get("content", llm_output))
        quiz_type_flags = dict(parsed.get("quiz_type_flags", {}))
    else:
        logger.warning("Failed to parse JSON from summary chain output; storing raw response.")

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
