"""
Quota router for fetching current usage and limits.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user
from src.api.schemas.quota import QuotaResponse
from src.db.models import User
from src.db.session import get_db
from src.services.quota_service import TIER_LIMITS, get_or_create_user_usage, reset_if_needed

router = APIRouter(prefix="/api/v1/quota", tags=["quota"])


@router.get("", response_model=QuotaResponse)
async def get_quota(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current quota usage for the authenticated user."""
    usage = await get_or_create_user_usage(db, user.id)
    await reset_if_needed(db, usage)

    limits = TIER_LIMITS.get(user.tier, TIER_LIMITS["free"])

    return QuotaResponse(
        summaries_used=usage.summaries_used,
        summaries_limit=limits["summary"],
        quizzes_used=usage.quizzes_used,
        quizzes_limit=limits["quiz"],
        practice_used=usage.practice_used,
        practice_limit=limits["practice"],
        chat_used=usage.chat_used,
        chat_limit=limits["chat"],
        reset_at=usage.reset_at,
        tier=user.tier,
    )
