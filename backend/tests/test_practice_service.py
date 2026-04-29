from src.services.practice_service import MINI_LESSON_PROMPT


def test_mini_lesson_allows_latex():
    assert "LaTeX" in MINI_LESSON_PROMPT
