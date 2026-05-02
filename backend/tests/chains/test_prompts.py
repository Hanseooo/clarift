from src.chains.prompts import build_preference_context, get_mode_rules, get_persona_description


class TestBuildPreferenceContext:
    def test_empty_prefs_returns_empty(self):
        assert build_preference_context(None) == ""
        assert build_preference_context({}) == ""

    def test_education_level(self):
        result = build_preference_context({"education_level": "High School"})
        assert "High School" in result
        assert "Adapt complexity" in result

    def test_explanation_styles(self):
        result = build_preference_context({"explanation_styles": ["simple_direct", "analogy_based"]})
        assert "simple_direct" in result
        assert "analogy_based" in result

    def test_custom_instructions_sanitized(self):
        result = build_preference_context({"custom_instructions": "Focus on --- nursing ### cases"})
        assert "---" not in result
        assert "###" not in result
        assert "nursing" in result
        assert "cases" in result

    def test_custom_instructions_truncated(self):
        long_text = "x" * 600
        result = build_preference_context({"custom_instructions": long_text})
        assert len(result) < 850  # 500 chars truncated + wrapper text overhead

    def test_all_prefs_combined(self):
        prefs = {
            "education_level": "College",
            "explanation_styles": ["detailed_academic"],
            "custom_instructions": "Use medical examples",
        }
        result = build_preference_context(prefs)
        assert "College" in result
        assert "detailed_academic" in result
        assert "medical examples" in result


class TestGetPersonaDescription:
    def test_default_persona(self):
        desc = get_persona_description("default")
        assert "Clarift" in desc

    def test_encouraging_persona(self):
        desc = get_persona_description("encouraging")
        assert "warm" in desc.lower()

    def test_invalid_persona_falls_back(self):
        desc = get_persona_description("nonexistent")  # type: ignore[arg-type]
        assert "Clarift" in desc


class TestGetModeRules:
    def test_strict_rag_mode(self):
        rules = get_mode_rules("strict_rag")
        assert "ONLY based on the provided context" in rules

    def test_tutor_mode(self):
        rules = get_mode_rules("tutor")
        assert "[AI Knowledge]:" in rules

    def test_socratic_mode(self):
        rules = get_mode_rules("socratic")
        assert "guiding questions" in rules
