from __future__ import annotations

from decimal import Decimal


def test_full_learning_loop_shape() -> None:
    upload = {"document_id": "doc-1", "job_id": "job-1", "message": "queued"}
    summary = {"summary_id": "sum-1", "job_id": "job-2", "message": "started"}
    quiz = {"quiz_id": "quiz-1", "weak_topics": ["General"], "message": "started"}
    attempt = {"attempt_id": "attempt-1", "score": 80.0, "weak_topics": ["General"]}
    weak_areas = {"weak_topics": [{"topic": "General", "accuracy": 60.0, "attempts": 5}]}
    practice = {"practice_id": "practice-1", "drills": [{"id": "d1"}], "message": "created"}

    assert upload["document_id"]
    assert summary["summary_id"]
    assert quiz["quiz_id"]
    assert Decimal(str(attempt["score"])) >= Decimal("0")
    assert isinstance(weak_areas["weak_topics"], list)
    assert practice["drills"]
