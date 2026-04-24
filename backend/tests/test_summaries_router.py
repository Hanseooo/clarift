from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

from src.api.routers.summaries import _to_summary_response


def test_to_summary_response_serializes_expected_fields() -> None:
    summary = SimpleNamespace(
        id=uuid4(),
        document_id=uuid4(),
        format="bullet",
        content="Key points",
        quiz_type_flags={"multiple_choice": True, "fill_in_blanks": False},
        created_at=datetime(2026, 4, 18, 12, 0, 0, tzinfo=timezone.utc),
    )

    response = _to_summary_response(summary)

    assert response.id == str(summary.id)
    assert response.document_id == str(summary.document_id)
    assert response.format == "bullet"
    assert response.content == "Key points"
    assert response.quiz_type_flags == {"multiple_choice": True, "fill_in_blanks": False}
    assert response.created_at == "2026-04-18T12:00:00+00:00"
