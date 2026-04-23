"""Tests for content analysis chain: parsing, flag ordering, and fallback behavior."""

from __future__ import annotations

import pytest

from src.chains.content_analysis_chain import (
    _parse_analysis_response,
)


class TestParseAnalysisResponse:
    def test_parses_valid_json(self):
        raw = """
        {
            "true_false": {"applicable": true, "reason": "Clear factual claims"},
            "identification": {"applicable": true, "reason": "Named terms present"},
            "multi_select": {"applicable": false, "reason": "No grouped concepts"},
            "ordering": {"applicable": false, "reason": "No sequences"}
        }
        """
        result = _parse_analysis_response(raw)
        assert result["mcq"]["applicable"] is True
        assert result["true_false"]["applicable"] is True
        assert result["identification"]["applicable"] is True
        assert result["multi_select"]["applicable"] is False
        assert result["ordering"]["applicable"] is False

    def test_mcq_always_applicable(self):
        raw = """
        {
            "true_false": {"applicable": false, "reason": "No binary facts"},
            "identification": {"applicable": false, "reason": "No terms"},
            "multi_select": {"applicable": false, "reason": "No groups"},
            "ordering": {"applicable": false, "reason": "No sequences"}
        }
        """
        result = _parse_analysis_response(raw)
        assert result["mcq"]["applicable"] is True
        assert result["mcq"]["reason"] == "Content has factual statements"

    def test_strips_json_code_block(self):
        raw = """```json
        {
            "true_false": {"applicable": true, "reason": "Factual content"},
            "identification": {"applicable": false, "reason": ""},
            "multi_select": {"applicable": false, "reason": ""},
            "ordering": {"applicable": true, "reason": "Has sequences"}
        }
        ```"""
        result = _parse_analysis_response(raw)
        assert result["true_false"]["applicable"] is True
        assert result["ordering"]["applicable"] is True

    def test_strips_plain_code_block(self):
        raw = """```
        {
            "true_false": {"applicable": true, "reason": "Test"},
            "identification": {"applicable": false, "reason": ""},
            "multi_select": {"applicable": false, "reason": ""},
            "ordering": {"applicable": false, "reason": ""}
        }
        ```"""
        result = _parse_analysis_response(raw)
        assert result["true_false"]["applicable"] is True

    def test_handles_missing_fields_with_defaults(self):
        raw = """
        {
            "true_false": {"applicable": true},
            "identification": {},
            "multi_select": {"reason": "test"},
            "ordering": {"applicable": false, "reason": ""}
        }
        """
        result = _parse_analysis_response(raw)
        assert result["true_false"]["applicable"] is True
        assert result["identification"]["applicable"] is False
        assert result["multi_select"]["applicable"] is False
        assert result["ordering"]["applicable"] is False

    def test_handles_non_dict_flag(self):
        raw = """
        {
            "true_false": "yes",
            "identification": {"applicable": true, "reason": "terms"},
            "multi_select": {"applicable": false, "reason": ""},
            "ordering": {"applicable": false, "reason": ""}
        }
        """
        result = _parse_analysis_response(raw)
        assert result["true_false"]["applicable"] is False
        assert result["identification"]["applicable"] is True

    def test_all_flags_true(self):
        raw = """
        {
            "true_false": {"applicable": true, "reason": "binary facts"},
            "identification": {"applicable": true, "reason": "named terms"},
            "multi_select": {"applicable": true, "reason": "categories"},
            "ordering": {"applicable": true, "reason": "sequences"}
        }
        """
        result = _parse_analysis_response(raw)
        assert result["mcq"]["applicable"] is True
        assert result["true_false"]["applicable"] is True
        assert result["identification"]["applicable"] is True
        assert result["multi_select"]["applicable"] is True
        assert result["ordering"]["applicable"] is True

    def test_ordering_flag_for_sequential_content(self):
        raw = """
        {
            "true_false": {"applicable": true, "reason": "facts"},
            "identification": {"applicable": false, "reason": ""},
            "multi_select": {"applicable": false, "reason": ""},
            "ordering": {"applicable": true, "reason": "step-by-step process"}
        }
        """
        result = _parse_analysis_response(raw)
        assert result["ordering"]["applicable"] is True
        assert "step-by-step" in result["ordering"]["reason"]

    def test_multi_select_flag_for_categorical_content(self):
        raw = """
        {
            "true_false": {"applicable": false, "reason": ""},
            "identification": {"applicable": false, "reason": ""},
            "multi_select": {"applicable": true, "reason": "multiple categories"},
            "ordering": {"applicable": false, "reason": ""}
        }
        """
        result = _parse_analysis_response(raw)
        assert result["multi_select"]["applicable"] is True
        assert "categories" in result["multi_select"]["reason"]

    def test_definition_list_implies_identification(self):
        raw = """
        {
            "true_false": {"applicable": false, "reason": ""},
            "identification": {"applicable": true, "reason": "definitions with terms"},
            "multi_select": {"applicable": false, "reason": ""},
            "ordering": {"applicable": false, "reason": ""}
        }
        """
        result = _parse_analysis_response(raw)
        assert result["identification"]["applicable"] is True
        assert "definitions" in result["identification"]["reason"]

    def test_sequential_content_implies_ordering(self):
        raw = """
        {
            "true_false": {"applicable": false, "reason": ""},
            "identification": {"applicable": false, "reason": ""},
            "multi_select": {"applicable": false, "reason": ""},
            "ordering": {"applicable": true, "reason": "timeline with defined order"}
        }
        """
        result = _parse_analysis_response(raw)
        assert result["ordering"]["applicable"] is True

    def test_handles_string_input(self):
        raw = (
            '{"true_false": {"applicable": true, "reason": "test"}, '
            '"identification": {"applicable": false, "reason": ""}, '
            '"multi_select": {"applicable": false, "reason": ""}, '
            '"ordering": {"applicable": false, "reason": ""}}'
        )
        result = _parse_analysis_response(raw)
        assert result["true_false"]["applicable"] is True

    def test_raises_on_invalid_json(self):
        raw = "not valid json"
        with pytest.raises(Exception):
            _parse_analysis_response(raw)

    def test_returns_all_five_keys(self):
        raw = """
        {
            "true_false": {"applicable": true, "reason": "test"},
            "identification": {"applicable": false, "reason": ""},
            "multi_select": {"applicable": false, "reason": ""},
            "ordering": {"applicable": false, "reason": ""}
        }
        """
        result = _parse_analysis_response(raw)
        assert set(result.keys()) == {
            "mcq",
            "true_false",
            "identification",
            "multi_select",
            "ordering",
        }
