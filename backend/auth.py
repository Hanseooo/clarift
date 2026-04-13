"""
Clerk JWT verification utilities.
"""

import json
from typing import Any
from urllib.request import urlopen
from jose import jwt, JWTError
from jose.constants import ALGORITHMS
from jose.utils import base64url_decode
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
