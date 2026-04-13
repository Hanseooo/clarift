"""
Auth router for user synchronization and profile.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from src.core.config import settings
from src.db.session import get_db
from src.db.models import User, UserPreference, UserUsage
from datetime import datetime, timezone
from auth import verify_clerk_token

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

security = HTTPBearer(auto_error=False)


class SyncRequest(BaseModel):
    """Request body for auth/sync endpoint."""

    token: str


class UserResponse(BaseModel):
    """User profile response."""

    id: str
    email: str
    name: str | None
    image: str | None
    tier: str

    class Config:
        from_attributes = True


@router.post("/sync", response_model=UserResponse)
async def sync_user(
    request: SyncRequest,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Upsert user from Clerk JWT token.
    Called by frontend after successful Clerk login.
    """
    try:
        payload = verify_clerk_token(request.token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Clerk token",
        )

    email = payload.get("email")
    name = payload.get("name")
    image = payload.get("picture")  # Clerk uses "picture"
    sub = payload.get("sub")  # subject (provider ID)

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token missing email",
        )

    # Upsert user
    stmt = insert(User).values(
        email=email,
        name=name,
        image=image,
        tier="free",  # default tier
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[User.email],
        set_={"name": name, "image": image},
    ).returning(User)

    result = await db.execute(stmt)
    user = result.scalar_one()

    # Ensure user preferences row exists
    pref_stmt = insert(UserPreference).values(
        user_id=user.id,
        output_format="bullet",
    )
    pref_stmt = pref_stmt.on_conflict_do_nothing(index_elements=[UserPreference.user_id])
    await db.execute(pref_stmt)

    # Ensure user usage row exists with reset_at = tomorrow
    tomorrow = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = tomorrow.replace(day=tomorrow.day + 1)
    usage_stmt = insert(UserUsage).values(
        user_id=user.id,
        summaries_used=0,
        quizzes_used=0,
        practice_used=0,
        reset_at=tomorrow,
    )
    usage_stmt = usage_stmt.on_conflict_do_nothing(index_elements=[UserUsage.user_id])
    await db.execute(usage_stmt)

    await db.commit()

    return UserResponse.from_orm(user)


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Get current user profile using JWT from Authorization header.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )

    token = credentials.credentials

    try:
        payload = verify_clerk_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Clerk token",
        )

    email = payload.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing email",
        )

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserResponse.from_orm(user)
