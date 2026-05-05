from src.services.quiz_service import grade_question


class TestGradeQuestion:
    # --- Multi-select ---
    def test_multi_select_all_correct(self):
        q = {"type": "multi_select", "correct_answers": ["A", "B"]}
        assert grade_question(q, ["A", "B"]) is True

    def test_multi_select_wrong_set(self):
        q = {"type": "multi_select", "correct_answers": ["A", "B"]}
        assert grade_question(q, ["A", "C"]) is False

    def test_multi_select_missing_one(self):
        q = {"type": "multi_select", "correct_answers": ["A", "B"]}
        assert grade_question(q, ["A"]) is False

    def test_multi_select_case_insensitive(self):
        q = {"type": "multi_select", "correct_answers": ["Flexible interaction"]}
        assert grade_question(q, ["flexible interaction"]) is True

    # --- Identification ---
    def test_identification_exact_match(self):
        q = {"type": "identification", "correct_answer": "HTTPS"}
        assert grade_question(q, "HTTPS") is True

    def test_identification_case_insensitive(self):
        q = {"type": "identification", "correct_answer": "HTTPS"}
        assert grade_question(q, "https") is True

    def test_identification_alias_match(self):
        q = {
            "type": "identification",
            "correct_answer": "HTTPS",
            "acceptable_answers": ["Hypertext Transfer Protocol"],
        }
        assert grade_question(q, "Hypertext Transfer Protocol") is True

    def test_identification_fuzzy_typo(self):
        q = {"type": "identification", "correct_answer": "photosynthesis"}
        assert grade_question(q, "photosynthesys") is True  # fuzzy match

    def test_identification_wrong_answer(self):
        q = {"type": "identification", "correct_answer": "HTTPS"}
        assert grade_question(q, "FTP") is False

    # --- True/False ---
    def test_true_false_boolean(self):
        q = {"type": "true_false", "correct_answer": True}
        assert grade_question(q, True) is True
        assert grade_question(q, False) is False

    def test_true_false_string(self):
        q = {"type": "true_false", "correct_answer": "true"}
        assert grade_question(q, "true") is True

    def test_true_false_string_false(self):
        q = {"type": "true_false", "correct_answer": False}
        assert grade_question(q, "False") is True

    # --- MCQ ---
    def test_mcq_match(self):
        q = {"type": "mcq", "correct_answer": "A"}
        assert grade_question(q, "A") is True
        assert grade_question(q, "B") is False
