---
phase: 01-backend-foundation
plan: 08
subsystem: auth
tags: [next-auth, google-oauth, jwt]

# Dependency graph
requires:
  - phase: 01-04
    provides: Backend auth endpoints (POST /api/v1/auth/sync, GET /api/v1/auth/me)
provides:
  - NextAuth v5 configuration with Google OAuth provider
  - Login UI with Google sign-in button
  - Session sync callback to backend
affects: [frontend-ui, user-sync]

# Tech tracking
tech-stack:
  added: [next-auth@beta]
  patterns: [NextAuth v5 configuration with jwt callback for backend sync]

key-files:
  created:
    - frontend/src/auth.ts
    - frontend/src/app/api/auth/[...nextauth]/route.ts
    - frontend/src/app/login/page.tsx
    - frontend/src/components/login-button.tsx
  modified:
    - frontend/package.json
    - frontend/pnpm-lock.yaml

key-decisions:
  - "Use Google ID token for backend sync (JWT token not accessible in NextAuth v5 jwt callback)"
  - "Added synced flag to token to avoid repeated sync calls"
  - "Used @/ path alias for cleaner imports"

patterns-established:
  - "NextAuth v5 configuration with Google OAuth provider and custom jwt callback"
  - "Login page as a static page with branded design"

requirements-completed: [1.2]

# Metrics
duration: 30min
completed: 2026-04-12
---

# Phase 1 Plan 8: Frontend Authentication UI Summary

**NextAuth v5 configuration with Google OAuth provider, login UI, and backend session sync**

## Performance

- **Duration:** 30 min
- **Started:** 2026-04-12T22:30:00Z (approx)
- **Completed:** 2026-04-12T23:00:00Z (approx)
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Installed NextAuth v5 beta package
- Configured NextAuth with Google OAuth provider and jwt callback to sync users with backend
- Created API route handler for NextAuth endpoints
- Built clean login page with branded design and Google sign-in button
- Verified build success with TypeScript and Next.js

## task Commits

Each task was committed atomically:

1. **task 1: install next-auth** - `2773438` (feat) - installed next-auth@beta
2. **task 2: configure nextauth** - `efa49fc` (feat) - created auth.ts and route.ts with sync callback
3. **task 3: build login UI** - `f933de2` (feat) - created login page and login button component

## Files Created/Modified

- `frontend/src/auth.ts` - NextAuth v5 configuration with Google OAuth provider and jwt callback for backend sync
- `frontend/src/app/api/auth/[...nextauth]/route.ts` - NextAuth API route handler
- `frontend/src/app/login/page.tsx` - Login page component with branding and sign-in button
- `frontend/src/components/login-button.tsx` - Reusable button component that triggers Google sign-in
- `frontend/package.json` - Added next-auth dependency
- `frontend/pnpm-lock.yaml` - Updated lockfile

## Decisions Made

- Used Google ID token for backend sync because NextAuth v5 does not expose the signed JWT token in the jwt callback. This requires backend to verify Google ID tokens (currently expects JWT signed with JWT_SECRET). This is a known gap that will need alignment between frontend and backend secrets.
- Added a `synced` flag to the token object to prevent repeated sync calls on each jwt callback invocation.
- Used the `@/` path alias for cleaner imports, aligning with existing tsconfig.json configuration.
- Created a static login page (prerendered) for better performance.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed import path in route.ts**
- **Found during:** task 2
- **Issue:** Relative import `../../../../src/auth` could not be resolved, causing build failure
- **Fix:** Changed to use `@/auth` alias as defined in tsconfig.json
- **Files modified:** frontend/src/app/api/auth/[...nextauth]/route.ts
- **Verification:** Build succeeded after change
- **Committed in:** efa49fc (task 2 commit)

**2. [Rule 2 - Missing Critical] Added missing JWT token access in jwt callback**
- **Found during:** task 2
- **Issue:** NextAuth v5 jwt callback does not provide the raw JWT token (`token.token` or `token.jwt`), which is needed for backend sync. The plan assumed token.token exists.
- **Fix:** Used Google ID token (`account.id_token`) as alternative for sync. Added fallback and warning.
- **Files modified:** frontend/src/auth.ts
- **Verification:** TypeScript compilation passes; build succeeds.
- **Committed in:** efa49fc (task 2 commit)

**3. [Rule 3 - Blocking] Created .env.local placeholder for build**
- **Found during:** task 2 verification (build)
- **Issue:** NextAuth requires environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET) to build. Missing env would cause build failure.
- **Fix:** Created frontend/.env.local with dummy values to allow build verification. Actual values must be supplied by user.
- **Files modified:** frontend/.env.local
- **Verification:** Build succeeded with dummy values.
- **Committed in:** not committed (excluded from git)

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 missing critical)
**Impact on plan:** All deviations necessary for functionality and build success. No scope creep.

## Issues Encountered

- NextAuth v5 beta API differences from training data: jwt callback signature and token object structure required adaptation.
- Backend sync endpoint expects a JWT signed with JWT_SECRET, while frontend currently sends Google ID token. This mismatch will need to be resolved (either backend accepts Google ID tokens, or frontend sends NextAuth JWT). This is a known gap flagged in the threat model.

## User Setup Required

**External services require manual configuration.** 
- Google OAuth: Create OAuth 2.0 credentials in Google Cloud Console, set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in frontend/.env.local
- NextAuth secret: Generate a secure random string for NEXTAUTH_SECRET (must match backend JWT_SECRET for sync to work)
- Backend JWT_SECRET: Ensure backend .env uses same secret as NEXTAUTH_SECRET

## Next Phase Readiness

- Frontend authentication UI is ready for user testing.
- Backend sync endpoint exists but token verification mismatch needs resolution.
- Environment variables need to be configured for OAuth flow to work in development.

## Self-Check: PASSED

- All created files exist: auth.ts, route.ts, login/page.tsx, login-button.tsx
- All task commits present in frontend repository: 2773438, efa49fc, f933de2
- Build verification passed (pnpm build succeeds with dummy environment variables)

---
*Phase: 01-backend-foundation*
*Completed: 2026-04-12*