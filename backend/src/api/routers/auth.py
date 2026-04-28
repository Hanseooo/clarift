"""
Auth router for user synchronization and profile.
"""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from auth import verify_clerk_token
from src.core.config import settings
from src.db.models import User, UserUsage
from src.db.session import get_db

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

security = HTTPBearer(auto_error=False)


class SyncRequest(BaseModel):
    """Request body for auth/sync endpoint."""

    token: str


class UserResponse(BaseModel):
    """User profile response."""

    id: UUID
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

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token missing clerk_user_id (sub)",
        )

    email = payload.get("email")
    name = payload.get("name")
    image = payload.get("picture")

    # If email or name is missing, fetch from Clerk API
    if not email or not name or not image:
        import httpx

        # Fetch user from Clerk REST API
        clerk_user = None
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://api.clerk.dev/v1/users/{sub}",
                headers={"Authorization": f"Bearer {settings.CLERK_SECRET_KEY}"},
            )
            if resp.status_code == 200:
                clerk_user = resp.json()
        if clerk_user:
            email = email or (
                clerk_user["email_addresses"][0]["email_address"]
                if clerk_user.get("email_addresses")
                else None
            )
            name = name or clerk_user.get("first_name") or None
            image = image or clerk_user.get("image_url") or None

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No email found in token or Clerk API",
        )

    # Upsert user by clerk_user_id
    stmt = insert(User).values(
        clerk_user_id=sub,
        email=email,
        name=name,
        image=image,
        tier="free",  # default tier
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[User.clerk_user_id],
        set_={"email": email, "name": name, "image": image},
    ).returning(User)

    result = await db.execute(stmt)
    user = result.scalar_one()

    # Ensure user usage row exists with reset_at = tomorrow
    tomorrow = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    ) + timedelta(days=1)
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

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing clerk_user_id/sub",
        )

    result = await db.execute(select(User).where(User.clerk_user_id == sub))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserResponse.from_orm(user)
