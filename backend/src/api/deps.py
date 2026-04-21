"""
Dependencies for FastAPI routes.
"""

from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import verify_clerk_token
from src.db.models import User
from src.db.session import get_db
from src.services.quota_service import Feature, check_and_increment_quota

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Validate JWT token and return the authenticated user.
    Raises HTTP 401 if token is missing or invalid.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header with Bearer token",
        )

    token = credentials.credentials

    try:
        payload = verify_clerk_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Clerk token",
        )

    # Clerk JWT payload includes "sub" (user ID)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing required claim: clerk_user_id/sub",
        )

    # Find user by Clerk user ID
    result = await db.execute(select(User).where(User.clerk_user_id == sub))
    user = result.scalar_one_or_none()
    if not user:
        # This should not happen if auth/sync has been called
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


# Optional dependency for routes that require a Pro tier user
async def require_pro_user(user: User = Depends(get_current_user)) -> User:
    if user.tier != "pro":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pro subscription required",
        )
    return user


def enforce_quota(feature: Feature) -> Callable:
    async def quota_dependency(
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> None:
        await check_and_increment_quota(db, user, feature)

    return quota_dependency
