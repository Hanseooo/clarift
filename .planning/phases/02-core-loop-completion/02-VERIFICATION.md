# Phase 02 Verification

- Phase goal checked: quiz, practice, chat, quota, and UI integration paths are now implemented with generated API contract updates.
- Backend verification commands:
  - `uv run ruff check src/api/deps.py src/api/routers/documents.py src/api/routers/quizzes.py src/api/routers/practice.py src/api/routers/chat.py src/services/quota_service.py src/services/quiz_chain.py src/services/practice_chain.py src/services/chat_chain.py src/services/retrieval_service.py tests/conftest.py tests/test_quota_and_weak_areas.py tests/test_quota_enforcement.py tests/test_integration_loop.py`
  - `uv run pytest tests/test_quota_and_weak_areas.py tests/test_quota_enforcement.py tests/test_integration_loop.py -q`
  - `uv run alembic current`
- Frontend verification commands:
  - `pnpm run generate:openapi`
  - `pnpm run generate:api-types`
  - `pnpm exec tsc --noEmit`
- Verification gaps:
  - No real Playwright runtime in repo yet; `frontend/src/tests/integration/chat.spec.ts` is a scaffold only.
  - No full E2E execution of upload->summary->quiz->attempt->practice in live environment.
- Security checks observed:
  - Chat retrieval enforces user scoping via `user_id` in `retrieval_service`.
  - Quota enforcement wired as route dependencies, not in services.
