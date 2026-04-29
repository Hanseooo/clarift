from src.chains.summary_chain import SUMMARY_PROMPT


def test_summary_prompt_mentions_mermaid():
    assert "mermaid" in SUMMARY_PROMPT.lower()
