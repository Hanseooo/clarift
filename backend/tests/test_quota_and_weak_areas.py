from __future__ import annotations

import sys
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from src.services.quota_service import TIER_LIMITS, check_quota


def test_chat_limits_present() -> None:
    assert TIER_LIMITS["free"]["chat"] == 15
    assert TIER_LIMITS["pro"]["chat"] == 60


@pytest.mark.asyncio
async def test_check_quota_raises_when_chat_limit_reached(monkeypatch: pytest.MonkeyPatch) -> None:
    usage = SimpleNamespace(
        user_id=uuid.uuid4(),
        summaries_used=0,
        quizzes_used=0,
        practice_used=0,
        chat_used=15,
        reset_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    user = SimpleNamespace(id=uuid.uuid4(), tier="free")

    async def fake_get_or_create(_db, _user_id):
        return usage

    async def fake_reset(_db, _usage):
        return False

    monkeypatch.setattr("src.services.quota_service.get_or_create_user_usage", fake_get_or_create)
    monkeypatch.setattr("src.services.quota_service.reset_if_needed", fake_reset)

    with pytest.raises(Exception):
        await check_quota(SimpleNamespace(), user, "chat")


def _is_weak_topic(attempts: int, correct: int, quiz_count: int) -> bool:
    if attempts < 5 or quiz_count < 2:
        return False
    accuracy = Decimal(correct) / Decimal(attempts)
    return accuracy < Decimal("0.7")


def test_weak_topic_rule_matches_plan() -> None:
    assert _is_weak_topic(attempts=5, correct=3, quiz_count=2)
    assert not _is_weak_topic(attempts=4, correct=1, quiz_count=2)
    assert not _is_weak_topic(attempts=8, correct=6, quiz_count=2)
    assert not _is_weak_topic(attempts=8, correct=5, quiz_count=1)
