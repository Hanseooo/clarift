from src.chains.practice_chain import DRILL_GENERATION_PROMPT


def test_drill_prompt_allows_markdown():
    assert "LaTeX" in DRILL_GENERATION_PROMPT
    assert "code blocks" in DRILL_GENERATION_PROMPT
    assert "tables" in DRILL_GENERATION_PROMPT
