# Env-based Pro Override Design Spec

## Overview
This feature implements a "backdoor" environment variable that grants Pro status to specific email addresses for testing purposes. This avoids the need for real payment transactions while developing and testing Pro features.

## Implementation Design

1. A new backend configuration variable `PRO_OVERRIDE_EMAILS` will be added to `config.py` (e.g., `PRO_OVERRIDE_EMAILS="test@example.com,admin@clarift.app"`).
2. The `require_pro_user` and `enforce_quota` dependencies in `deps.py` will be updated to check this override.
3. The logic for determining Pro status will be:
   - Check if `user.tier == "pro"`.
   - If not, check if `user.email` exists in the `PRO_OVERRIDE_EMAILS` list.
   - If either condition is true, the user is considered a Pro user.
4. The user profile or context endpoint (e.g., `/api/me`) will be updated to return an `is_pro` boolean reflecting this override, rather than just returning the raw DB `tier`. This ensures the frontend accurately displays the user's Pro quota limits.
