"""Content analysis chain for determining quiz-type applicability flags."""

from __future__ import annotations

import json
import logging
from typing import TypedDict

from langchain_google_genai import ChatGoogleGenerativeAI
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from src.chains.retry import is_retryable_error
from src.core.config import settings

logger = logging.getLogger(__name__)

ANALYSIS_PROMPT = """You are a precise content analyzer for a Filipino study assistant. Analyze the study material below and determine which quiz question types are supported.

## ABSOLUTE RULES
1. Base your analysis ONLY on the provided text. Do not use outside knowledge.
2. If the text is empty, irrelevant, or too short to evaluate, set all booleans to `false` and set each `reason` to "Insufficient material provided."

## TASK
Evaluate whether the text supports each question type below. Think step-by-step:
1. Scan the text for evidence matching the type's criteria.
2. Decide `true` or `false`.
3. Write a 1-sentence reason citing specific evidence from the text (e.g., "The text lists sequential steps of the Calvin cycle").

## EVALUATION CRITERIA
- true_false: True only if the text contains explicit factual propositions, binary properties, or clear definitions that can be stated as true or false. Example evidence: definitions, direct statements of fact, properties with clear yes/no answers.
- identification: True only if the text contains specific named terms, technical vocabulary, numbers, dates, formulas, or short labels a student must recall verbatim. Example evidence: "mitochondria", "1946", "F = ma".
- multi_select: True only if the text contains grouped items, categories, lists with shared attributes, or concepts where multiple items satisfy a condition. Example evidence: "The three branches of government are...", "Symptoms include...".
- ordering: True only if the text describes a clear sequence, numbered steps, timeline, process flow, or ranked order. Example evidence: "Step 1...", "First... then... finally", chronological dates.

## OUTPUT FORMAT
Return ONLY a valid JSON object. No markdown code fences, no extra text.

{
  "true_false":   { "applicable": bool, "reason": "string (max 120 chars)" },
  "identification": { "applicable": bool, "reason": "string (max 120 chars)" },
  "multi_select": { "applicable": bool, "reason": "string (max 120 chars)" },
  "ordering":     { "applicable": bool, "reason": "string (max 120 chars)" }
}

## SELF-CHECK (perform before outputting)
- [ ] Did I analyze ONLY the provided text?
- [ ] Are all `applicable` values raw booleans (`true`/`false`), not strings?
- [ ] Does each `reason` cite specific evidence from the text?
- [ ] Is the output valid JSON with no trailing commas?
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
