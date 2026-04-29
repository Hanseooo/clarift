from __future__ import annotations

import asyncio
import os
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from fastapi import status

# Set dummy env vars before importing main (triggers Settings() on import)
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("CLERK_SECRET_KEY", "test")
os.environ.setdefault("CLERK_PUBLISHABLE_KEY", "test")
os.environ.setdefault("GOOGLE_API_KEY", "test")
os.environ.setdefault("R2_ACCOUNT_ID", "test")
os.environ.setdefault("R2_ACCESS_KEY_ID", "test")
os.environ.setdefault("R2_SECRET_ACCESS_KEY", "test")
os.environ.setdefault("R2_BUCKET_NAME", "test")
os.environ.setdefault("PAYMONGO_SECRET_KEY", "test")
os.environ.setdefault("PAYMONGO_WEBHOOK_SECRET", "test")

from main import app
from src.api.deps import get_current_user
from src.db.session import get_db
from src.services.quota_service import check_and_increment_quota


@pytest.mark.asyncio
async def test_submit_practice_answers_success(test_user_id: str) -> None:
    """Test submitting practice answers computes score and updates UserTopicPerformance."""
    practice_id = str(uuid.uuid4())

    # Setup mock user
    mock_user = SimpleNamespace(
        id=uuid.UUID(test_user_id),
        clerk_user_id="test_clerk",
        email="test@example.com",
        tier="free",
    )

    # Setup mock practice session
    mock_session = SimpleNamespace(
        id=uuid.UUID(practice_id),
        user_id=mock_user.id,
        weak_topics=["Git"],
        drills=[
            {
                "id": "drill-1",
                "topic": "Git",
                "type": "identification",
                "question": "...",
                "correct_answer": "Initialize a repo",
                "explanation": "...",
                "difficulty": 1,
            },
            {
                "id": "drill-2",
                "topic": "Git",
                "type": "true_false",
                "options": ["True", "False"],
                "correct_answer": "True",
                "explanation": "...",
                "difficulty": 1,
            },
        ],
        created_at=datetime.now(timezone.utc),
    )

    # Setup mock existing performance
    mock_perf = SimpleNamespace(
        id=uuid.uuid4(),
        user_id=mock_user.id,
        topic="Git",
        attempts=5,
        correct=3,
        quiz_count=2,
        last_updated=datetime.now(timezone.utc),
    )

    # Setup mock DB
    mock_db = AsyncMock()

    practice_result = MagicMock()
    practice_result.scalar_one_or_none.return_value = mock_session

    perf_result = MagicMock()
    perf_result.scalar_one_or_none.return_value = mock_perf

    mock_db.execute.side_effect = [practice_result, perf_result]
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    # Override dependencies
    async def override_get_current_user():
        return mock_user

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_db] = override_get_db

    payload = {
        "answers": {
            "drill-1": "Initialize a repo",
            "drill-2": "True",
        }
    }

    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post(
                f"/api/v1/practice/{practice_id}/submit",
                json=payload,
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert "score" in data
        assert "correct_count" in data
        assert "total_count" in data
        assert "results" in data
        assert "performance_entries" in data

        assert data["correct_count"] == 2
        assert data["total_count"] == 2
        assert data["score"] == 100.0

        # Verify performance updated: attempts and correct incremented, quiz_count unchanged
        assert mock_perf.attempts == 7
        assert mock_perf.correct == 5
        assert mock_perf.quiz_count == 2

        mock_db.commit.assert_awaited_once()

    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_create_practice_timeout(monkeypatch):
    async def slow_create(*args, **kwargs):
        await asyncio.sleep(30)

    monkeypatch.setattr("src.api.routers.practice.create_practice_session", slow_create)
    monkeypatch.setattr(
        "src.api.deps.check_and_increment_quota",
        AsyncMock(return_value=None),
    )

    mock_user = SimpleNamespace(
        id=uuid.uuid4(),
        clerk_user_id="test_clerk",
        email="test@example.com",
        tier="free",
    )
    mock_db = AsyncMock()

    async def override_get_current_user():
        return mock_user

    async def override_get_db():
        return mock_db

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_db] = override_get_db

    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/practice",
                json={"weak_topics": ["A"], "drill_count": 5},
            )

        assert response.status_code == status.HTTP_504_GATEWAY_TIMEOUT
        assert "too long" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()
