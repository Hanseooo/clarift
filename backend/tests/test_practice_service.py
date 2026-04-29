import os

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

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.services.practice_service import MINI_LESSON_PROMPT, get_weak_areas


def test_mini_lesson_allows_latex():
    assert "LaTeX" in MINI_LESSON_PROMPT


@pytest.mark.asyncio
async def test_get_weak_areas_uses_lowered_threshold():
    """Practice should show weak topics after 1 quiz with 3+ attempts."""
    mock_db = AsyncMock()
    mock_result = MagicMock()

    mock_perf = MagicMock()
    mock_perf.topic = "Cardiology"
    mock_perf.attempts = 3
    mock_perf.correct = 1
    mock_perf.quiz_count = 1
    mock_perf.last_updated = MagicMock()

    mock_result.scalars.return_value.all.return_value = [mock_perf]
    mock_db.execute.return_value = mock_result

    weak_areas = await get_weak_areas(mock_db, uuid.UUID("12345678-1234-5678-1234-567812345678"))

    assert len(weak_areas) == 1
    assert weak_areas[0]["topic"] == "Cardiology"
    assert weak_areas[0]["accuracy"] == 33.33
