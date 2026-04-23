"""Tests for quiz chain: question generation, validation, retry, and fallback."""

from __future__ import annotations

import pytest

from src.chains.quiz_chain import (
    _fallback_questions,
    _normalize_question,
    _validate_questions,
    _parse_llm_questions,
    _build_generation_prompt,
)


class TestNormalizeQuestion:
    def test_mcq_normalization(self):
        raw = {
            "id": "q1",
            "type": "mcq",
            "question": "What is 2+2?",
            "options": ["3", "4", "5", "6"],
            "correct_answer": "4",
            "topic": "Math",
            "explanation": "Basic arithmetic.",
        }
        result = _normalize_question(raw, 0)
        assert result["id"] == "q1"
        assert result["type"] == "mcq"
        assert result["options"] == ["3", "4", "5", "6"]
        assert result["correct_answer"] == "4"
        assert result["topic"] == "Math"

    def test_true_false_normalization(self):
        raw = {
            "id": "q2",
            "type": "true_false",
            "question": "The sky is blue.",
            "correct_answer": True,
            "topic": "Science",
            "explanation": "Rayleigh scattering.",
        }
        result = _normalize_question(raw, 1)
        assert result["correct_answer"] is True

    def test_true_false_string_normalization(self):
        raw = {
            "id": "q2",
            "type": "true_false",
            "question": "The sky is blue.",
            "correct_answer": "true",
            "topic": "Science",
            "explanation": "",
        }
        result = _normalize_question(raw, 1)
        assert result["correct_answer"] is True

    def test_true_false_yes_normalization(self):
        raw = {
            "id": "q2",
            "type": "true_false",
            "question": "The sky is blue.",
            "correct_answer": "yes",
            "topic": "Science",
            "explanation": "",
        }
        result = _normalize_question(raw, 1)
        assert result["correct_answer"] is True

    def test_identification_normalization(self):
        raw = {
            "id": "q3",
            "type": "identification",
            "question": "The capital of France is ____.",
            "correct_answer": "Paris",
            "topic": "Geography",
            "explanation": "Paris is the capital.",
        }
        result = _normalize_question(raw, 2)
        assert result["correct_answer"] == "Paris"

    def test_multi_select_normalization(self):
        raw = {
            "id": "q4",
            "type": "multi_select",
            "question": "Which are prime numbers?",
            "options": ["2", "3", "4", "5"],
            "correct_answers": ["2", "3", "5"],
            "topic": "Math",
            "explanation": "Prime numbers have exactly two factors.",
        }
        result = _normalize_question(raw, 3)
        assert result["options"] == ["2", "3", "4", "5"]
        assert result["correct_answers"] == ["2", "3", "5"]

    def test_ordering_normalization(self):
        raw = {
            "id": "q5",
            "type": "ordering",
            "question": "Order the steps of the water cycle.",
            "steps": ["Evaporation", "Condensation", "Precipitation", "Collection"],
            "correct_order": [0, 1, 2, 3],
            "topic": "Science",
            "explanation": "Water cycle sequence.",
        }
        result = _normalize_question(raw, 4)
        assert len(result["steps"]) == 4
        assert result["correct_order"] == [0, 1, 2, 3]

    def test_default_id_when_missing(self):
        raw = {
            "type": "mcq",
            "question": "Test?",
            "options": ["A", "B", "C", "D"],
            "correct_answer": "A",
            "topic": "General",
            "explanation": "",
        }
        result = _normalize_question(raw, 5)
        assert result["id"] == "q6"

    def test_default_type_when_missing(self):
        raw = {
            "id": "q1",
            "question": "Test?",
            "topic": "General",
            "explanation": "",
        }
        result = _normalize_question(raw, 0)
        assert result["type"] == "mcq"


class TestValidateQuestions:
    def test_valid_mcq(self):
        questions = [
            {
                "id": "q1",
                "type": "mcq",
                "question": "What is 2+2?",
                "options": ["3", "4", "5", "6"],
                "correct_answer": "4",
                "topic": "Math",
                "explanation": "",
            }
        ]
        errors = _validate_questions(questions)
        assert errors == []

    def test_mcq_wrong_option_count(self):
        questions = [
            {
                "id": "q1",
                "type": "mcq",
                "question": "What is 2+2?",
                "options": ["3", "4", "5"],
                "correct_answer": "4",
                "topic": "Math",
                "explanation": "",
            }
        ]
        errors = _validate_questions(questions)
        assert len(errors) == 1
        assert "exactly 4 options" in errors[0]

    def test_mcq_correct_answer_not_in_options(self):
        questions = [
            {
                "id": "q1",
                "type": "mcq",
                "question": "What is 2+2?",
                "options": ["3", "4", "5", "6"],
                "correct_answer": "7",
                "topic": "Math",
                "explanation": "",
            }
        ]
        errors = _validate_questions(questions)
        assert len(errors) == 1
        assert "correct_answer not in options" in errors[0]

    def test_valid_true_false(self):
        questions = [
            {
                "id": "q1",
                "type": "true_false",
                "question": "The sky is blue.",
                "correct_answer": True,
                "topic": "Science",
                "explanation": "",
            }
        ]
        errors = _validate_questions(questions)
        assert errors == []

    def test_true_false_non_boolean(self):
        questions = [
            {
                "id": "q1",
                "type": "true_false",
                "question": "The sky is blue.",
                "correct_answer": "yes",
                "topic": "Science",
                "explanation": "",
            }
        ]
        errors = _validate_questions(questions)
        assert len(errors) == 1
        assert "must be boolean" in errors[0]

    def test_valid_identification(self):
        questions = [
            {
                "id": "q1",
                "type": "identification",
                "question": "Capital of France is ____.",
                "correct_answer": "Paris",
                "topic": "Geography",
                "explanation": "",
            }
        ]
        errors = _validate_questions(questions)
        assert errors == []

    def test_identification_empty_answer(self):
        questions = [
            {
                "id": "q1",
                "type": "identification",
                "question": "Capital of France is ____.",
                "correct_answer": "",
                "topic": "Geography",
                "explanation": "",
            }
        ]
        errors = _validate_questions(questions)
        assert len(errors) == 1
        assert "empty correct_answer" in errors[0]

    def test_valid_multi_select(self):
        questions = [
            {
                "id": "q1",
                "type": "multi_select",
                "question": "Which are primes?",
                "options": ["2", "3", "4", "5"],
                "correct_answers": ["2", "3", "5"],
                "topic": "Math",
                "explanation": "",
            }
        ]
        errors = _validate_questions(questions)
        assert errors == []

    def test_multi_select_too_few_correct(self):
        questions = [
            {
                "id": "q1",
                "type": "multi_select",
                "question": "Which are primes?",
                "options": ["2", "3", "4", "5"],
                "correct_answers": ["2"],
                "topic": "Math",
                "explanation": "",
            }
        ]
        errors = _validate_questions(questions)
        assert len(errors) == 1
        assert ">= 2 correct answers" in errors[0]

    def test_valid_ordering(self):
        questions = [
            {
                "id": "q1",
                "type": "ordering",
                "question": "Order the steps.",
                "steps": ["A", "B", "C", "D"],
                "correct_order": [0, 1, 2, 3],
                "topic": "General",
                "explanation": "",
            }
        ]
        errors = _validate_questions(questions)
        assert errors == []

    def test_ordering_too_few_steps(self):
        questions = [
            {
                "id": "q1",
                "type": "ordering",
                "question": "Order the steps.",
                "steps": ["A", "B", "C"],
                "correct_order": [0, 1, 2],
                "topic": "General",
                "explanation": "",
            }
        ]
        errors = _validate_questions(questions)
        assert len(errors) == 1
        assert ">= 4 steps" in errors[0]

    def test_ordering_invalid_permutation(self):
        questions = [
            {
                "id": "q1",
                "type": "ordering",
                "question": "Order the steps.",
                "steps": ["A", "B", "C", "D"],
                "correct_order": [0, 1, 2, 5],
                "topic": "General",
                "explanation": "",
            }
        ]
        errors = _validate_questions(questions)
        assert len(errors) == 1
        assert "valid permutation" in errors[0]

    def test_multiple_errors(self):
        questions = [
            {
                "id": "q1",
                "type": "mcq",
                "question": "Bad?",
                "options": ["A"],
                "correct_answer": "Z",
                "topic": "General",
                "explanation": "",
            },
            {
                "id": "q2",
                "type": "identification",
                "question": "Bad?",
                "correct_answer": "",
                "topic": "General",
                "explanation": "",
            },
        ]
        errors = _validate_questions(questions)
        assert len(errors) == 3


class TestFallbackQuestions:
    def test_returns_at_least_one(self):
        questions, types = _fallback_questions(1)
        assert len(questions) >= 1
        assert len(types) >= 1

    def test_returns_up_to_three(self):
        questions, types = _fallback_questions(10)
        assert len(questions) == 3

    def test_question_types_are_unique(self):
        _, types = _fallback_questions(5)
        assert len(types) == len(set(types))

    def test_mcq_fallback_has_required_fields(self):
        questions, _ = _fallback_questions(3)
        mcq = next(q for q in questions if q["type"] == "mcq")
        assert "options" in mcq
        assert "correct_answer" in mcq
        assert len(mcq["options"]) == 4

    def test_true_false_fallback_has_boolean(self):
        questions, _ = _fallback_questions(3)
        tf = next(q for q in questions if q["type"] == "true_false")
        assert isinstance(tf["correct_answer"], bool)

    def test_identification_fallback_has_answer(self):
        questions, _ = _fallback_questions(3)
        ident = next(q for q in questions if q["type"] == "identification")
        assert ident["correct_answer"]


class TestParseLlmQuestions:
    def test_parses_valid_json_array(self):
        raw = '[{"id": "q1", "type": "mcq", "question": "Test?", "options": ["A", "B", "C", "D"], "correct_answer": "A", "topic": "General", "explanation": ""}]'
        result = _parse_llm_questions(raw)
        assert len(result) == 1
        assert result[0]["id"] == "q1"

    def test_strips_json_code_block(self):
        raw = '```json\n[{"id": "q1", "type": "mcq", "question": "Test?", "options": ["A", "B", "C", "D"], "correct_answer": "A", "topic": "General", "explanation": ""}]\n```'
        result = _parse_llm_questions(raw)
        assert len(result) == 1

    def test_strips_plain_code_block(self):
        raw = '```\n[{"id": "q1", "type": "mcq", "question": "Test?", "options": ["A", "B", "C", "D"], "correct_answer": "A", "topic": "General", "explanation": ""}]\n```'
        result = _parse_llm_questions(raw)
        assert len(result) == 1

    def test_raises_on_non_list(self):
        raw = '{"id": "q1"}'
        with pytest.raises(ValueError, match="not a list"):
            _parse_llm_questions(raw)

    def test_handles_non_string_input(self):
        raw = [
            {
                "id": "q1",
                "type": "mcq",
                "question": "Test?",
                "options": ["A", "B", "C", "D"],
                "correct_answer": "A",
                "topic": "General",
                "explanation": "",
            }
        ]
        with pytest.raises(Exception):
            _parse_llm_questions(raw)


class TestBuildGenerationPrompt:
    def test_includes_chunks(self):
        chunks = ["Chunk 1", "Chunk 2"]
        prompt = _build_generation_prompt(chunks, {"mcq": 5})
        assert "Chunk 1" in prompt
        assert "Chunk 2" in prompt

    def test_includes_type_instructions(self):
        prompt = _build_generation_prompt([], {"mcq": 3, "true_false": 2})
        assert "3 multiple choice" in prompt
        assert "2 true/false" in prompt

    def test_includes_error_context(self):
        prompt = _build_generation_prompt([], {"mcq": 1}, error_context="Bad options")
        assert "Bad options" in prompt
        assert "Fix the errors" in prompt

    def test_handles_empty_chunks(self):
        prompt = _build_generation_prompt([], {"mcq": 1})
        assert "No document context" in prompt
