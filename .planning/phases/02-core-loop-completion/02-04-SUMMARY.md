# 02-04 Summary

- Enforced chat quota in `backend/src/api/routers/chat.py` via `Depends(enforce_quota("chat"))`.
- Added service-layer retrieval in `backend/src/services/retrieval_service.py` with mandatory user scoping.
- Reworked `backend/src/services/chat_chain.py` to be DB-free and accept pre-fetched chunks, with fallback behavior and citations.
- Added `DocumentChunk` model and migration for retrieval context storage.
- Regenerated OpenAPI and verified backend lint/tests.
