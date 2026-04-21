from __future__ import annotations

from src.services.quota_service import TIER_LIMITS


def test_quota_limits_include_all_core_features() -> None:
    for tier in ("free", "pro"):
        assert "summary" in TIER_LIMITS[tier]
        assert "quiz" in TIER_LIMITS[tier]
        assert "practice" in TIER_LIMITS[tier]
        assert "chat" in TIER_LIMITS[tier]


def test_quota_ordering_free_vs_pro() -> None:
    assert TIER_LIMITS["pro"]["summary"] > TIER_LIMITS["free"]["summary"]
    assert TIER_LIMITS["pro"]["quiz"] > TIER_LIMITS["free"]["quiz"]
    assert TIER_LIMITS["pro"]["practice"] > TIER_LIMITS["free"]["practice"]
    assert TIER_LIMITS["pro"]["chat"] > TIER_LIMITS["free"]["chat"]
