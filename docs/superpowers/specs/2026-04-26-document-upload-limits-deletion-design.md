# Document Upload Limits & Deletion Design

## Goal
Enforce per-user lifetime document upload limits and provide safe document deletion that properly frees storage (R2 + pgvector embeddings) and decrements the upload counter.

## Architecture
Add a `documents_uploaded` counter to the existing `user_usage` table. Enforce the limit in FastAPI at upload time via the existing `enforce_quota` dependency. Expose a new `DELETE /api/v1/documents/{id}` endpoint that performs tenant-verified cascade cleanup (R2 object, document_chunks, Document row) and decrements the counter. Replace the frontend's direct Drizzle deletion with a call to this endpoint.

## Tech Stack
- FastAPI, SQLAlchemy (async), Alembic
- Cloudflare R2 (S3-compatible)
- Drizzle ORM (frontend schema sync)
- Next.js Server Actions

---

## Data Model Changes

### Backend: `backend/src/db/models.py`
Add `documents_uploaded` to `UserUsage`:
```python
documents_uploaded: Mapped[int] = mapped_column(
    Integer,
    nullable=False,
    server_default=text("0"),
)
```

### Frontend: `frontend/src/db/schema.ts`
Add `documentsUploaded` to `userUsage`:
```typescript
documentsUploaded: integer("documents_uploaded").notNull().default(0),
```

### Migration
Alembic migration adding `documents_uploaded INTEGER NOT NULL DEFAULT 0` to `user_usage`.

## Quota Service Changes

### `backend/src/services/quota_service.py`
1. In `check_quota`, handle `feature == "document_upload"` by reading `usage.documents_uploaded` against `TIER_LIMITS[tier]["document_upload"]` instead of returning early.
2. In `increment_quota`, add `"document_upload": "documents_uploaded"` to `column_map`.
3. In `reset_if_needed`, **do not** reset `documents_uploaded` (it is a lifetime counter).

## Upload Flow Changes

### `backend/src/api/routers/documents.py`
Apply `Depends(enforce_quota("document_upload"))` to the `upload_document` route. The dependency will check and increment the counter automatically.

## Deletion Endpoint

### New: `DELETE /api/v1/documents/{id}`
Responsibilities:
1. Auth & tenant isolation: verify `Document.user_id == current_user.id`.
2. Delete R2 object via `S3Service.delete_file(object_name)` (new method).
3. Delete `document_chunks` rows for this document.
4. Delete `Document` row.
5. Decrement `documents_uploaded` counter via `quota_service.decrement_quota(db, user, "document_upload")` (new helper).
6. Return `204 No Content`.

### `backend/src/services/s3_service.py`
Add:
```python
async def delete_file(self, object_name: str) -> None:
    async with self._session.client(**self._client_kwargs) as client:
        await client.delete_object(Bucket=self._bucket, Key=object_name)
```

### `backend/src/services/quota_service.py`
Add:
```python
async def decrement_quota(db: AsyncSession, user: User, feature: Feature) -> None:
    # mirrors increment_quota but subtracts 1, floors at 0
```

## Frontend Changes

### `frontend/src/app/actions/documents.ts`
Rewrite `deleteDocument` to call the backend API instead of Drizzle:
```typescript
export async function deleteDocument(documentId: string) {
  // auth check still happens here
  const response = await authClient.DELETE(`/api/v1/documents/{id}`, {
    params: { path: { id: documentId } },
  });
  if (response.error) throw new Error(response.error.detail || "Delete failed");
  revalidatePath("/documents");
  return { success: true };
}
```

## Testing Strategy
- Backend unit test: `test_upload_enforces_quota`, `test_delete_cascades_and_decrements`, `test_delete_404_for_other_user_document`.
- Frontend: verify `deleteDocument` action calls the correct API endpoint.
- Integration: upload → check counter → delete → check counter → re-upload up to limit.

## Risks & Mitigations
- **Race condition on counter**: Acceptable for MVP; single-user upload/delete is serial in UI.
- **R2 delete failure leaves orphan DB row**: Catch S3 errors, still delete DB rows and decrement counter to avoid leaking quota. Log warning.
- **Missing R2 key on delete**: Document may not have been uploaded to R2 yet (rare). S3 404 is acceptable; proceed with DB cleanup.

## Out of Scope
- Soft deletes / trash can.
- Refund logic for failed uploads (if upload fails after increment, counter is not rolled back in this version).
