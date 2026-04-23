"""Content analysis chain for determining quiz-type applicability flags."""

from __future__ import annotations

import json
import logging
from typing import TypedDict

from langchain_google_genai import ChatGoogleGenerativeAI
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from src.chains import is_retryable_error
from src.core.config import settings

logger = logging.getLogger(__name__)

ANALYSIS_PROMPT = """
Analyze this study content and determine which question types are applicable.

For each type, respond with applicable: true or false and a brief reason.

Types to evaluate:
- true_false: Does the content have clear true/false propositions or binary facts?
- identification: Does the content have specific named terms, values, or definitions to recall?
- multi_select: Does the content have grouped concepts, categories, or lists where multiple items share a property?
- ordering: Does the content describe sequential steps, processes, or timelines with a defined order?

Note: MCQ is always applicable and does not need evaluation.

Return JSON only:
{
  "true_false":   { "applicable": bool, "reason": "..." },
  "identification": { "applicable": bool, "reason": "..." },
  "multi_select": { "applicable": bool, "reason": "..." },
  "ordering":     { "applicable": bool, "reason": "..." }
}
"""


class ContentAnalysisChainInput(TypedDict):
    chunks: list[str]


class FlagResult(TypedDict):
    applicable: bool
    reason: str


class ContentAnalysisChainOutput(TypedDict):
    mcq: FlagResult
    true_false: FlagResult
    identification: FlagResult
    multi_select: FlagResult
    ordering: FlagResult


def _parse_analysis_response(raw_content: object) -> ContentAnalysisChainOutput:
    if isinstance(raw_content, str):
        content = raw_content.strip()
    else:
        content = "".join(str(part) for part in raw_content).strip()

    if "```json" in content:
        content = content.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in content:
        content = content.split("```", 1)[1].split("```", 1)[0].strip()

    payload = json.loads(content)

    def to_flag(obj: object) -> FlagResult:
        if isinstance(obj, dict):
            return {
                "applicable": bool(obj.get("applicable", False)),
                "reason": str(obj.get("reason", "")),
            }
        return {"applicable": False, "reason": ""}

    return {
        "mcq": {"applicable": True, "reason": "Content has factual statements"},
        "true_false": to_flag(payload.get("true_false")),
        "identification": to_flag(payload.get("identification")),
        "multi_select": to_flag(payload.get("multi_select")),
        "ordering": to_flag(payload.get("ordering")),
    }


@retry(
    wait=wait_exponential(min=1, max=8),
    stop=stop_after_attempt(3),
    retry=retry_if_exception(is_retryable_error),
    reraise=True,
)
async def _run_analysis_llm(chunks: list[str]) -> ContentAnalysisChainOutput:
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite",
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0,
    )

    context = "\n\n".join(chunks) if chunks else "No content available."
    prompt = f"{ANALYSIS_PROMPT}\n\nStudy content:\n{context}"

    response = await llm.ainvoke(prompt)
    return _parse_analysis_response(response.content)


async def run_content_analysis_chain(
    input: ContentAnalysisChainInput,
) -> ContentAnalysisChainOutput:
    """Analyze content and return quiz-type applicability flags."""
    logger.info("Running content analysis chain on %d chunks", len(input["chunks"]))
    try:
        result = await _run_analysis_llm(input["chunks"])
        return result
    except Exception:  # noqa: BLE001
        logger.warning("Content analysis LLM call failed, returning safe defaults")
        return {
            "mcq": {"applicable": True, "reason": "Content has factual statements"},
            "true_false": {"applicable": True, "reason": "Fallback: assuming factual content"},
            "identification": {
                "applicable": True,
                "reason": "Fallback: assuming named terms exist",
            },
            "multi_select": {"applicable": False, "reason": "LLM analysis failed"},
            "ordering": {"applicable": False, "reason": "LLM analysis failed"},
        }
