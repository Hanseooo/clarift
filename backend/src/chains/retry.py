"""Retry helpers for AI chains."""

from __future__ import annotations


def is_retryable_error(exc: Exception) -> bool:
    """Return True if the error is retryable (not quota/RESOURCE_EXHAUSTED)."""
    error_msg = str(exc).lower()
    if "quota" in error_msg or "resource_exhausted" in error_msg:
        return False
    return True
