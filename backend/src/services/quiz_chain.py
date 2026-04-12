"""
Quiz chain for generating quizzes from document content and detecting weak areas.

Steps:
1. Retrieve relevant document chunks
2. Generate quiz questions (multiple choice, fill-in-blanks)
3. Detect weak topics based on past performance (if any)
4. Return quiz with metadata and weak area flags
"""

import logging
import uuid
from typing import TypedDict, Optional, List, Dict, Any

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage
from pydantic import BaseModel

from src.core.config import settings

logger = logging.getLogger(__name__)


class QuizChainInput(TypedDict):
    """Input for the quiz chain."""

    document_id: str
    user_id: str
    question_count: int
    auto_mode: bool


class QuizChainOutput(TypedDict):
    """Output from the quiz chain."""

    quiz_id: str
    questions: List[Dict[str, Any]]
    question_types: List[str]
    weak_topics: List[str]
    # Additional metadata for weak area detection
    weak_area_flags: Dict[str, bool]


async def run_quiz_chain(input: QuizChainInput) -> QuizChainOutput:
    """
    Execute the quiz generation chain with weak area detection.

    This implementation uses Gemini via LangChain to generate quiz questions.
    """
    logger.info(
        "Running quiz chain for document %s (user %s)",
        input["document_id"],
        input["user_id"],
    )

    # Initialize Gemini LLM
    llm = ChatGoogleGenerativeAI(
        model="gemini-pro",
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.3,
    )

    # In a real implementation, we would retrieve document chunks here.
    placeholder_text = (
        "This is a placeholder for document content. "
        "In production, this would be the extracted text from the uploaded file."
    )

    # Generate quiz questions using LLM
    quiz_prompt = f"""You are a quiz generator for study materials. Based on the following text, create two multiple-choice quiz questions.

Text: {placeholder_text}

For each question, provide:
- id (like "q1", "q2")
- text (the question)
- options (list of 4 choices, each with id "a"-"d" and text)
- correct_answer (the id of the correct option)
- explanation (why this answer is correct)
- topic (a short topic name)

Return your answer as a JSON list of question objects.
Example format:
[
  {{
    "id": "q1",
    "text": "...",
    "options": [
      {{"id": "a", "text": "..."}},
      {{"id": "b", "text": "..."}},
      {{"id": "c", "text": "..."}},
      {{"id": "d", "text": "..."}}
    ],
    "correct_answer": "a",
    "explanation": "...",
    "topic": "..."
  }}
]"""

    try:
        response = await llm.ainvoke(quiz_prompt)
        # Parse JSON from response content
        import json

        # Extract JSON from markdown code block if present
        content = response.content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        questions = json.loads(content)
        # Ensure each question has required fields
        for q in questions:
            q.setdefault("id", q.get("id", "q1"))
            q.setdefault("topic", q.get("topic", "General"))
        question_types = ["multiple_choice"] * len(questions)
    except Exception as exc:
        logger.error("Quiz generation failed: %s", exc)
        # Fallback to placeholder questions
        questions = [
            {
                "id": "q1",
                "text": "What is the main topic of the uploaded document?",
                "options": [
                    {"id": "a", "text": "Topic A"},
                    {"id": "b", "text": "Topic B"},
                    {"id": "c", "text": "Topic C"},
                    {"id": "d", "text": "Topic D"},
                ],
                "correct_answer": "a",
                "explanation": "This is a placeholder explanation.",
                "topic": "Introduction",
            },
            {
                "id": "q2",
                "text": "Which of the following is a key concept?",
                "options": [
                    {"id": "a", "text": "Concept X"},
                    {"id": "b", "text": "Concept Y"},
                    {"id": "c", "text": "Concept Z"},
                    {"id": "d", "text": "Concept W"},
                ],
                "correct_answer": "b",
                "explanation": "This is a placeholder explanation.",
                "topic": "Key Concepts",
            },
        ]
        question_types = ["multiple_choice", "multiple_choice"]

    # Weak topics detection (stub – would analyze past performance)
    weak_topics = ["Introduction", "Key Concepts"]
    weak_area_flags = {"needs_review": True}

    # Generate a unique quiz ID
    quiz_id = str(uuid.uuid4())

    return {
        "quiz_id": quiz_id,
        "questions": questions,
        "question_types": question_types,
        "weak_topics": weak_topics,
        "weak_area_flags": weak_area_flags,
    }
