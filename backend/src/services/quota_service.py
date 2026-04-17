"""
Quota service for enforcing daily usage limits per user.

Features:
- summary: daily summary generations
- quiz: daily quiz generations
- practice: daily practice session generations
- document_upload: total document uploads (lifetime limit for free tier)

Quota limits are defined per user tier (free/pro) and reset daily at UTC midnight.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Literal, cast
from uuid import UUID

from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import QuotaExceededException
from src.db.models import User, UserUsage

logger = logging.getLogger(__name__)

Feature = Literal["summary", "quiz", "practice", "chat", "document_upload"]

# Daily limits per tier
TIER_LIMITS = {
    "free": {
        "summary": 3,
        "quiz": 3,
        "practice": 1,
        "chat": 5,
        "document_upload": 5,  # lifetime limit, not daily
    },
    "pro": {
        "summary": 10,
        "quiz": 15,
        "practice": 10,
        "chat": 20,
        "document_upload": None,  # unlimited
    },
}


async def get_or_create_user_usage(db: AsyncSession, user_id: UUID) -> UserUsage:
    """
    Get the user's usage row, creating it if it doesn't exist.
    Sets reset_at to tomorrow UTC midnight if missing.
    """
    stmt = select(UserUsage).where(UserUsage.user_id == user_id)
    result = await db.execute(stmt)
    usage = result.scalar_one_or_none()
    if usage:
        return usage

    # Create new usage row with reset_at = tomorrow UTC midnight
    tomorrow = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    ) + timedelta(days=1)
    insert_stmt = insert(UserUsage).values(user_id=user_id, reset_at=tomorrow).returning(UserUsage)
    result = await db.execute(insert_stmt)
    await db.commit()
    return result.scalar_one()


async def reset_if_needed(db: AsyncSession, usage: UserUsage) -> bool:
    """
    Check if reset_at has passed; if so, reset all daily counters
    and set new reset_at to tomorrow UTC midnight.
    Returns True if reset was performed.
    """
    now = datetime.now(timezone.utc)
    if usage.reset_at:
        # Ensure reset_at is timezone-aware (UTC)
        reset_at = cast(datetime, usage.reset_at)
        if reset_at.tzinfo is None:
            reset_at = reset_at.replace(tzinfo=timezone.utc)
        else:
            reset_at = reset_at.astimezone(timezone.utc)
        if now >= reset_at:
            # Reset daily counters (but not document upload count)
            reset_tomorrow = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(
                days=1
            )
            update_stmt = (
                update(UserUsage)
                .where(UserUsage.user_id == usage.user_id)
                .values(
                    summaries_used=0,
                    quizzes_used=0,
                    practice_used=0,
                    chat_used=0,
                    reset_at=reset_tomorrow,
                )
            )
            await db.execute(update_stmt)
            await db.commit()
            logger.info(
                "Reset daily quotas for user %s (new reset_at: %s)",
                usage.user_id,
                reset_tomorrow,
            )
            return True
    return False


async def check_quota(
    db: AsyncSession,
    user: User,
    feature: Feature,
) -> None:
    """
    Check if the user has quota remaining for the given feature.
    Raises QuotaExceededException if not.
    This function does NOT increment usage.
    """
    usage = await get_or_create_user_usage(db, cast(UUID, user.id))
    await reset_if_needed(db, usage)

    tier = user.tier
    limit = TIER_LIMITS[tier].get(feature)
    if limit is None:
        # Unlimited for this tier/feature
        return

    # Determine which column to check
    if feature == "summary":
        used = usage.summaries_used
    elif feature == "quiz":
        used = usage.quizzes_used
    elif feature == "practice":
        used = usage.practice_used
    elif feature == "chat":
        used = usage.chat_used
    elif feature == "document_upload":
        # document_upload is a lifetime limit for free tier,
        # stored in a separate column (not yet in schema).
        # For now, treat as unlimited.
        return
    else:
        raise ValueError(f"Unknown feature: {feature}")

    if used >= limit:
        raise QuotaExceededException(
            feature=feature,
            used=used,
            limit=limit,
            reset_at=usage.reset_at,
        )


async def increment_quota(
    db: AsyncSession,
    user: User,
    feature: Feature,
) -> None:
    """
    Increment the usage counter for the given feature.
    Assumes quota has already been checked.
    """
    usage = await get_or_create_user_usage(db, cast(UUID, user.id))
    await reset_if_needed(db, usage)

    # Determine which column to update
    column_map = {
        "summary": "summaries_used",
        "quiz": "quizzes_used",
        "practice": "practice_used",
        "chat": "chat_used",
        # document_upload not yet supported
    }
    if feature not in column_map:
        logger.warning("No counter for feature %s, skipping increment", feature)
        return

    column = column_map[feature]
    update_stmt = (
        update(UserUsage)
        .where(UserUsage.user_id == user.id)
        .values(**{column: getattr(usage, column) + 1})
    )
    await db.execute(update_stmt)
    await db.commit()
    logger.debug(
        "Incremented %s for user %s (new count: %s)",
        feature,
        user.id,
        getattr(usage, column) + 1,
    )


async def check_and_increment_quota(
    db: AsyncSession,
    user: User,
    feature: Feature,
) -> None:
    """
    Convenience function that checks quota and increments if allowed.
    Raises QuotaExceededException if quota exceeded.
    """
    await check_quota(db, user, feature)
    await increment_quota(db, user, feature)
