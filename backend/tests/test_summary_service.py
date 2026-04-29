from src.services.summary_service import _build_format_hints


def test_q_and_a_hint():
    hints = _build_format_hints(["q_and_a"])
    assert "Q:" in hints or "question" in hints.lower()


def test_examples_hint():
    hints = _build_format_hints(["examples"])
    assert "Examples" in hints
