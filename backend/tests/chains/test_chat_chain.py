from src.chains.chat_chain import build_numbered_context


def test_build_numbered_context_includes_metadata():
    """Context must include document title and total chunk count."""
    chunks = [
        {"content": "chunk one"},
        {"content": "chunk two"},
    ]
    context = build_numbered_context(
        chunks=chunks,
        document_title="Biology 101",
        total_chunks=37,
    )
    assert "Biology 101" in context
    assert "37 excerpts available" in context
    assert "[1] chunk one" in context
    assert "[2] chunk two" in context


def test_build_numbered_context_defaults():
    """Context uses defaults when metadata is not provided."""
    chunks = [{"content": "chunk one"}]
    context = build_numbered_context(chunks=chunks)
    assert "your document" in context
    assert "1 excerpts available" in context
    assert "[1] chunk one" in context


def test_build_numbered_context_empty_chunks():
    """Empty chunks return empty string."""
    assert build_numbered_context([]) == ""
