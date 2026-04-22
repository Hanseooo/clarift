"""Quiz chain for generating structured quiz questions."""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any, TypedDict

from langchain_google_genai import ChatGoogleGenerativeAI
from tenacity import retry, stop_after_attempt, wait_exponential

from src.core.config import settings

logger = logging.getLogger(__name__)


class QuizChainInput(TypedDict):
    document_id: str
    user_id: str
    question_count: int
    auto_mode: bool


class QuizQuestion(TypedDict):
    id: str
    question: str
    options: list[str]
    correct_answer: str
    topic: str


class QuizChainOutput(TypedDict):
    quiz_id: str
    questions: list[QuizQuestion]
    question_types: list[str]
    weak_topics: list[str]
    weak_area_flags: dict[str, bool]


def _fallback_questions(question_count: int) -> tuple[list[QuizQuestion], list[str]]:
    defaults: list[QuizQuestion] = [
        {
            "id": "q1",
            "question": "Which statement best matches your uploaded notes?",
            "options": ["A", "B", "C", "D"],
            "correct_answer": "A",
            "topic": "General",
        },
        {
            "id": "q2",
            "question": "True or False: The notes include key definitions and examples.",
            "options": ["True", "False"],
            "correct_answer": "True",
            "topic": "General",
        },
        {
            "id": "q3",
            "question": "Fill in the blank: The central concept is ____.",
            "options": [],
            "correct_answer": "core concept",
            "topic": "General",
        },
    ]

    selected = defaults[: max(1, min(question_count, len(defaults)))]
    question_types = [
        "multiple_choice" if item["options"] and len(item["options"]) > 2 else "fill_in"
        for item in selected
    ]
    return selected, question_types


def _normalize_question(raw_question: dict[str, Any], index: int) -> QuizQuestion:
    question_id = str(raw_question.get("id") or f"q{index + 1}")
    question_text = str(raw_question.get("question") or "")
    topic = str(raw_question.get("topic") or "General")
    correct_answer = str(raw_question.get("correct_answer") or "")

    raw_options = raw_question.get("options")
    options: list[str]
    if isinstance(raw_options, list):
        options = [str(option) for option in raw_options]
    else:
        options = []

    if not options and raw_question.get("type") == "true_false":
        options = ["True", "False"]

    return {
        "id": question_id,
        "question": question_text,
        "options": options,
        "correct_answer": correct_answer,
        "topic": topic,
    }


@retry(wait=wait_exponential(min=1, max=8), stop=stop_after_attempt(3), reraise=True)
async def _generate_questions_from_llm(question_count: int) -> list[QuizQuestion]:
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite",
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0.2,
    )

    prompt = (
        "Return JSON only. Generate quiz questions as an array of objects with keys: "
        "id, question, options (string array), correct_answer, topic. "
        "Create a mix of multiple_choice, true_false, and fill_in styles. "
        f"Count: {question_count}."
    )
    response = await llm.ainvoke(prompt)
    raw_content = response.content
    if isinstance(raw_content, str):
        content = raw_content.strip()
    else:
        content = "".join(str(part) for part in raw_content).strip()
    if "```json" in content:
        content = content.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in content:
        content = content.split("```", 1)[1].split("```", 1)[0].strip()

    payload = json.loads(content)
    if not isinstance(payload, list):
        raise ValueError("Quiz chain payload is not a list")
    return [_normalize_question(item, index) for index, item in enumerate(payload)]


async def run_quiz_chain(input: QuizChainInput) -> QuizChainOutput:
    logger.info(
        "Running quiz chain for document %s (user %s)",
        input["document_id"],
        input["user_id"],
    )

    try:
        questions = await _generate_questions_from_llm(input["question_count"])
        if not questions:
            questions, question_types = _fallback_questions(input["question_count"])
        else:
            question_types = [
                "multiple_choice"
                if question["options"] and len(question["options"]) > 2
                else "fill_in"
                for question in questions
            ]
    except Exception as exc:  # noqa: BLE001
        logger.warning("Quiz generation failed, using fallback questions: %s", exc)
        questions, question_types = _fallback_questions(input["question_count"])

    weak_topics = sorted({question["topic"] for question in questions})[:3]

    return {
        "quiz_id": str(uuid.uuid4()),
        "questions": questions,
        "question_types": question_types,
        "weak_topics": weak_topics,
        "weak_area_flags": {"needs_review": bool(weak_topics)},
    }
