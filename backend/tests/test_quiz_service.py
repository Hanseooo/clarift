"""Tests for quiz service layer."""

from __future__ import annotations

import pytest

from src.services.quiz_service import (
    QuizSettings,
    QuizTypeSettings,
    calculate_question_count,
    distribute_questions,
    resolve_quiz_settings,
)


class TestResolveQuizSettings:
    def test_auto_mode_returns_all_applicable(self):
        flags = {
            "mcq": {"applicable": True, "reason": "test"},
            "true_false": {"applicable": True, "reason": "test"},
            "identification": {"applicable": False, "reason": "test"},
            "multi_select": {"applicable": True, "reason": "test"},
            "ordering": {"applicable": False, "reason": "test"},
        }
        result = resolve_quiz_settings(None, flags)
        assert set(result) == {"mcq", "true_false", "multi_select"}

    def test_auto_mode_with_settings(self):
        flags = {
            "mcq": {"applicable": True, "reason": "test"},
            "true_false": {"applicable": True, "reason": "test"},
        }
        settings = QuizSettings(auto_mode=True)
        result = resolve_quiz_settings(settings, flags)
        assert set(result) == {"mcq", "true_false"}

    def test_manual_mode_excludes_inapplicable(self):
        flags = {
            "mcq": {"applicable": True, "reason": "test"},
            "ordering": {"applicable": False, "reason": "test"},
        }
        type_overrides = QuizTypeSettings(mcq=True, ordering=True)
        settings = QuizSettings(auto_mode=False, type_overrides=type_overrides)
        result = resolve_quiz_settings(settings, flags)
        assert result == ["mcq"]

    def test_manual_mode_with_partial_selection(self):
        flags = {
            "mcq": {"applicable": True, "reason": "test"},
            "true_false": {"applicable": True, "reason": "test"},
            "identification": {"applicable": True, "reason": "test"},
        }
        type_overrides = QuizTypeSettings(mcq=True, true_false=False, identification=True)
        settings = QuizSettings(auto_mode=False, type_overrides=type_overrides)
        result = resolve_quiz_settings(settings, flags)
        assert set(result) == {"mcq", "identification"}

    def test_empty_applicable_returns_empty(self):
        flags = {
            "mcq": {"applicable": False, "reason": "test"},
            "true_false": {"applicable": False, "reason": "test"},
        }
        result = resolve_quiz_settings(None, flags)
        assert result == []


class TestCalculateQuestionCount:
    def test_short_content(self):
        assert calculate_question_count(3, 2) == 5

    def test_medium_content(self):
        assert calculate_question_count(5, 2) == 10

    def test_long_content(self):
        assert calculate_question_count(10, 2) == 15

    def test_very_long_content(self):
        assert calculate_question_count(20, 2) == 20

    def test_many_types_adds_bonus(self):
        assert calculate_question_count(5, 4) == 13

    def test_max_cap_at_25(self):
        assert calculate_question_count(20, 5) == 23


class TestDistributeQuestions:
    def test_mcq_majority_with_others(self):
        result = distribute_questions(10, ["mcq", "true_false", "identification"])
        assert result["mcq"] == 5
        assert result["true_false"] + result["identification"] == 5

    def test_single_type(self):
        result = distribute_questions(10, ["mcq"])
        assert result["mcq"] == 10

    def test_two_types_no_mcq(self):
        result = distribute_questions(10, ["true_false", "identification"])
        assert result["true_false"] == 5
        assert result["identification"] == 5

    def test_empty_types(self):
        result = distribute_questions(10, [])
        assert result == {}

    def test_mcq_only(self):
        result = distribute_questions(7, ["mcq"])
        assert result["mcq"] == 7

    def test_distribution_sums_to_total(self):
        for total in [5, 10, 15, 20]:
            for types in [
                ["mcq"],
                ["mcq", "true_false"],
                ["mcq", "true_false", "identification"],
                ["true_false", "identification", "multi_select", "ordering"],
            ]:
                result = distribute_questions(total, types)
                assert sum(result.values()) == total
