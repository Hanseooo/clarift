# Feature: Auth

> Clerk authentication only for MVP.  
> See [`architecture.md`](../architecture.md#auth-flow) for the full auth flow diagram.

---

## How Auth Works

Clerk handles the OAuth dance and session management. FastAPI verifies the Clerk JWT on every request using Clerk's JWKS endpoint.

**Full flow:** See [`architecture.md`](../architecture.md#auth-flow)

---

## Clerk Configuration

Location: `frontend/src/app/layout.tsx`

```typescript
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      {children}
    </ClerkProvider>
  );
}
```

Middleware: `frontend/src/middleware.ts`

```typescript
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
```

Environment variables:

```bash
# .env.local (Next.js)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your-clerk-publishable-key"
CLERK_SECRET_KEY="your-clerk-secret-key"
# Backend API
NEXT_PUBLIC_API_URL="http://localhost:8000"
```

**Note:** OAuth providers are configured in the Clerk dashboard, not in environment variables.

---

## FastAPI JWT Verification

Location: `backend/auth.py`

```python
"""
Clerk JWT verification utilities.
"""
import json
from typing import Any
from urllib.request import urlopen
from jose import jwt, JWTError
from jose.constants import ALGORITHMS
from src.core.config import settings


class ClerkJWKS:
    """Cache for Clerk JWKS."""

    _jwks_url = "https://api.clerk.com/v1/jwks"
    _jwks_cache = None
    _last_fetch = 0

    @classmethod
    def get_jwks(cls):
        """Fetch JWKS from Clerk API."""
        # Simple caching: fetch once per runtime
        if cls._jwks_cache is None:
            with urlopen(cls._jwks_url) as response:
                data = json.load(response)
                cls._jwks_cache = data
        return cls._jwks_cache

    @classmethod
    def get_public_key(cls, kid: str) -> dict:
        """Get public key by key ID from JWKS."""
        jwks = cls.get_jwks()
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                return key
        raise ValueError(f"Key with kid {kid} not found in JWKS")


def verify_clerk_token(token: str) -> dict[str, Any]:
    """
    Verify a Clerk JWT token and return its payload.

    Args:
        token: JWT token string

    Returns:
        Decoded token payload

    Raises:
        JWTError: If token is invalid, expired, or verification fails
    """
    # Decode header to get key ID
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as e:
        raise JWTError(f"Invalid token header: {e}")

    kid = header.get("kid")
    if not kid:
        raise JWTError("Token missing key ID (kid)")

    # Get public key from JWKS
    public_key = ClerkJWKS.get_public_key(kid)

    # Verify token
    payload = jwt.decode(
        token,
        public_key,
        algorithms=[ALGORITHMS.RS256],
        audience=settings.CLERK_PUBLISHABLE_KEY,
        issuer="clerk",
    )
    return payload
```

Location: `backend/src/api/deps.py`

```python
"""
Dependencies for FastAPI routes.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.core.config import settings
from src.db.session import get_db
from src.db.models import User
from auth import verify_clerk_token

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

    # Clerk JWT payload includes "sub" (user ID) and "email"
    email = payload.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing required claim: email",
        )

    # Find user by email
    result = await db.execute(select(User).where(User.email == email))
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
```

---

## Secret Alignment

`CLERK_SECRET_KEY` (Clerk dashboard) and `CLERK_PUBLISHABLE_KEY` (Clerk dashboard) must match the values used in the frontend environment variables. The backend uses `CLERK_PUBLISHABLE_KEY` as the JWT audience.

```bash
# .env.local (Next.js)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
CLERK_SECRET_KEY="sk_live_..."

# backend/.env
CLERK_PUBLISHABLE_KEY="pk_live_..."  # same as frontend publishable key
```

---

## User Sync Endpoint

`POST /api/v1/auth/sync`

```python
# Upsert user on every login
# Returns: { id: UUID, tier: str }
# Called by Clerk webhook or frontend after sign-in
```

This endpoint may be called by a Clerk webhook or by the frontend after authentication to ensure the user exists in the database.

---

## Protected Routes (Next.js)

```typescript
// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
```

All routes except public ones require authentication. Unauthenticated users are redirected to the Clerk sign-in page.

---

## Tests

- `test_auth_sync_creates_user` — new user row created on first login
- `test_auth_sync_upsert` — existing user not duplicated
- `test_invalid_token` — 401 on bad JWT
- `test_expired_token` — 401 on expired JWT
- `test_wrong_user_id` — cannot access another user's data
```