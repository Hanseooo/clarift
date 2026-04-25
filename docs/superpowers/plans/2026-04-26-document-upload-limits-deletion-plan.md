# Document Upload Limits & Deletion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce lifetime document upload limits and add safe document deletion with proper R2 + pgvector cleanup and counter decrements.

**Architecture:** Add `documents_uploaded` counter to `user_usage`, wire it into the existing quota service, enforce it on FastAPI upload, expose a `DELETE` endpoint that cascade-cleans storage, and replace the frontend's direct Drizzle delete with an API call.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Cloudflare R2, Drizzle ORM, Next.js Server Actions

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/src/db/models.py` | Modify | Add `documents_uploaded` to `UserUsage` |
| `frontend/src/db/schema.ts` | Modify | Add `documentsUploaded` to `userUsage` |
| `backend/alembic/versions/` | Create | Migration adding `documents_uploaded` column |
| `backend/src/services/quota_service.py` | Modify | Wire `document_upload` into `check_quota`, `increment_quota`, `reset_if_needed`; add `decrement_quota` |
| `backend/src/services/s3_service.py` | Modify | Add `delete_file` method |
| `backend/src/api/routers/documents.py` | Modify | Add `enforce_quota` to upload; add `DELETE /api/v1/documents/{id}` |
| `backend/src/api/schemas/quota.py` | Modify | Add `documents_used` and `documents_limit` to `QuotaResponse` |
| `backend/src/api/routers/quota.py` | Modify | Populate new fields in quota response |
| `frontend/src/app/actions/documents.ts` | Modify | Replace Drizzle delete with API call |
| `backend/src/tests/test_documents.py` | Create | Upload quota enforcement and deletion tests |

---

## Chunk 1: Data Model & Schema

### Task 1: Add `documents_uploaded` to SQLAlchemy model

**Files:**
- Modify: `backend/src/db/models.py:278-286`

- [ ] **Step 1: Insert the new column**

```python
    chat_used: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )
    documents_uploaded: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )
    reset_at: Mapped[TIMESTAMP] = mapped_column(
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/db/models.py
git commit -m "feat: add documents_uploaded to UserUsage model"
```

### Task 2: Add `documentsUploaded` to Drizzle schema

**Files:**
- Modify: `frontend/src/db/schema.ts:106-114`

- [ ] **Step 1: Insert the new column**

```typescript
export const userUsage = pgTable("user_usage", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  summariesUsed: integer("summaries_used").notNull().default(0),
  quizzesUsed: integer("quizzes_used").notNull().default(0),
  practiceUsed: integer("practice_used").notNull().default(0),
  documentsUploaded: integer("documents_uploaded").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
})
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/db/schema.ts
git commit -m "feat: add documentsUploaded to userUsage schema"
```

### Task 3: Create Alembic migration

**Files:**
- Create: `backend/alembic/versions/2026_04_26_add_documents_uploaded_to_user_usage.py`

- [ ] **Step 1: Write migration file**

```python
"""add documents_uploaded to user_usage

Revision ID: 2026_04_26_add_documents_uploaded
Revises: <check latest alembic version>
Create Date: 2026-04-26 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "2026_04_26_add_documents_uploaded"
down_revision = "<LATEST_REVISION_ID>"  # TODO: replace with actual latest
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "user_usage",
        sa.Column("documents_uploaded", sa.Integer(), server_default="0", nullable=False),
    )


def downgrade():
    op.drop_column("user_usage", "documents_uploaded")
```

- [ ] **Step 2: Verify latest revision and set `down_revision`**

Run:
```bash
ls -la backend/alembic/versions/ | tail -5
```
Use the most recent revision ID as `down_revision`.

- [ ] **Step 3: Commit**

```bash
git add backend/alembic/versions/2026_04_26_add_documents_uploaded_to_user_usage.py
git commit -m "feat: alembic migration for documents_uploaded"
```

---

## Chunk 2: Quota Service

### Task 4: Wire `document_upload` into quota service

**Files:**
- Modify: `backend/src/services/quota_service.py`

- [ ] **Step 1: Update `check_quota` to enforce document_upload**

Replace lines 137-141:
```python
    elif feature == "document_upload":
        # document_upload is a lifetime limit for free tier,
        # stored in a separate column (not yet in schema).
        # For now, treat as unlimited.
        return
```

With:
```python
    elif feature == "document_upload":
        used = usage.documents_uploaded
```

- [ ] **Step 2: Update `increment_quota` column_map**

Replace lines 167-173:
```python
    column_map = {
        "summary": "summaries_used",
        "quiz": "quizzes_used",
        "practice": "practice_used",
        "chat": "chat_used",
        # document_upload not yet supported
    }
```

With:
```python
    column_map = {
        "summary": "summaries_used",
        "quiz": "quizzes_used",
        "practice": "practice_used",
        "chat": "chat_used",
        "document_upload": "documents_uploaded",
    }
```

- [ ] **Step 3: Ensure `reset_if_needed` does NOT reset `documents_uploaded`**

Verify lines 83-96 leave `documents_uploaded` out of the reset. It already does; no change needed. Confirm by reading:
```bash
grep -n "documents_uploaded" backend/src/services/quota_service.py
```
Expected: no results (it's not in reset_if_needed).

- [ ] **Step 4: Add `decrement_quota` helper after `increment_quota`**

Insert after line 191 (end of `increment_quota`):

```python

async def decrement_quota(
    db: AsyncSession,
    user: User,
    feature: Feature,
) -> None:
    """
    Decrement the usage counter for the given feature, flooring at 0.
    """
    usage = await get_or_create_user_usage(db, cast(UUID, user.id))
    column_map = {
        "summary": "summaries_used",
        "quiz": "quizzes_used",
        "practice": "practice_used",
        "chat": "chat_used",
        "document_upload": "documents_uploaded",
    }
    column = column_map.get(feature)
    if not column:
        logger.warning("No counter for feature %s, skipping decrement", feature)
        return

    current = getattr(usage, column, 0) or 0
    new_value = max(current - 1, 0)
    update_stmt = (
        update(UserUsage)
        .where(UserUsage.user_id == user.id)
        .values(**{column: new_value})
    )
    await db.execute(update_stmt)
    await db.commit()
    logger.debug(
        "Decremented %s for user %s (new count: %s)",
        feature,
        user.id,
        new_value,
    )
```

- [ ] **Step 5: Run backend lint**

```bash
cd backend && ruff check src/services/quota_service.py
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/quota_service.py
git commit -m "feat: enforce document_upload quota and add decrement helper"
```

---

## Chunk 3: S3 Service & Documents Router

### Task 5: Add `delete_file` to S3Service

**Files:**
- Modify: `backend/src/services/s3_service.py`

- [ ] **Step 1: Insert `delete_file` method after `download_file`**

After line 36 (end of `download_file`):

```python

    async def delete_file(self, object_name: str) -> None:
        """Delete an object from the configured bucket."""
        async with self._session.client(**self._client_kwargs) as client:
            await client.delete_object(Bucket=self._bucket, Key=object_name)
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/s3_service.py
git commit -m "feat: add delete_file to S3Service"
```

### Task 6: Update documents router

**Files:**
- Modify: `backend/src/api/routers/documents.py`

- [ ] **Step 1: Add imports**

Add to existing imports:
```python
from src.api.deps import enforce_quota
from src.services.quota_service import decrement_quota
from sqlalchemy import delete
```

- [ ] **Step 2: Add `enforce_quota` to upload route**

Change line 52 signature from:
```python
async def upload_document(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
```

To:
```python
async def upload_document(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _quota: None = Depends(enforce_quota("document_upload")),
):
```

- [ ] **Step 3: Add DELETE endpoint at end of file**

Append after line 134:

```python

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a document and its associated storage.
    Verifies ownership, deletes R2 object, cascades DB rows, and decrements upload counter.
    """
    # Fetch document and verify ownership
    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.user_id == user.id)
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Delete R2 object (ignore 404 if object doesn't exist)
    s3_service = S3Service()
    try:
        await s3_service.delete_file(document.r2_key)
    except Exception as e:
        logger.warning("Failed to delete R2 object %s: %s", document.r2_key, e)

    # Delete document row (cascades document_chunks, summaries, quizzes via FK)
    await db.delete(document)
    await db.commit()

    # Decrement upload counter
    await decrement_quota(db, user, "document_upload")

    return None
```

Also add `import logging` and `logger = logging.getLogger(__name__)` at top of file if not present.

- [ ] **Step 4: Run backend lint**

```bash
cd backend && ruff check src/api/routers/documents.py
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/routers/documents.py
git commit -m "feat: enforce upload quota and add document deletion endpoint"
```

---

## Chunk 4: Quota API Exposure

### Task 7: Update QuotaResponse schema

**Files:**
- Modify: `backend/src/api/schemas/quota.py`

- [ ] **Step 1: Add fields to `QuotaResponse`**

Add inside the model:
```python
    documents_used: int
    documents_limit: int
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/api/schemas/quota.py
git commit -m "feat: expose document upload quota in QuotaResponse"
```

### Task 8: Update quota router

**Files:**
- Modify: `backend/src/api/routers/quota.py`

- [ ] **Step 1: Populate new fields**

In the endpoint that builds `QuotaResponse`, add:
```python
    documents_used=usage.documents_uploaded,
    documents_limit=TIER_LIMITS[user.tier]["document_upload"],
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/api/routers/quota.py
git commit -m "feat: return document upload usage in quota endpoint"
```

---

## Chunk 5: Frontend Integration

### Task 9: Rewrite `deleteDocument` Server Action

**Files:**
- Modify: `frontend/src/app/actions/documents.ts`

- [ ] **Step 1: Read existing imports and add API client**

Replace the entire file content with:

```typescript
"use server";

import { db } from "@/db";
import { documents, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createAuthenticatedClient } from "@/lib/api";

export async function getDocuments() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return [];
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });

  if (!user) {
    return [];
  }

  const docs = await db.query.documents.findMany({
    where: eq(documents.userId, user.id),
    orderBy: [desc(documents.createdAt)],
  });

  return docs;
}

export async function deleteDocument(documentId: string) {
  const session = await auth();
  if (!session.userId) {
    throw new Error("Unauthorized");
  }

  const token = await session.getToken();
  if (!token) {
    throw new Error("Unauthorized");
  }

  const client = createAuthenticatedClient(token);
  const response = await client.DELETE("/api/v1/documents/{id}", {
    params: { path: { id: documentId } },
  });

  if (response.error) {
    throw new Error(response.error.detail || "Delete failed");
  }

  revalidatePath("/documents");
  return { success: true };
}
```

- [ ] **Step 2: Run frontend typecheck / build**

```bash
cd frontend && pnpm run generate:api-types
```

Verify `frontend/src/lib/api-types.ts` now includes the DELETE documents endpoint.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/actions/documents.ts frontend/src/lib/api-types.ts
git commit -m "feat: call backend API for document deletion"
```

---

## Chunk 6: Tests

### Task 10: Write backend tests

**Files:**
- Create: `backend/src/tests/test_documents.py`

- [ ] **Step 1: Write tests**

```python
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import Document, UserUsage
from src.services.quota_service import TIER_LIMITS


@pytest.mark.asyncio
async def test_upload_enforces_quota(
    client: AsyncClient,
    db: AsyncSession,
    auth_headers: dict,
    test_user,
):
    """Uploading beyond the tier limit should return 429."""
    limit = TIER_LIMITS[test_user.tier]["document_upload"]

    # Pre-fill usage counter to limit
    usage = UserUsage(user_id=test_user.id, reset_at="2099-01-01T00:00:00+00:00", documents_uploaded=limit)
    db.add(usage)
    await db.commit()

    response = await client.post(
        "/api/v1/documents/upload",
        headers=auth_headers,
        files={"file": ("test.txt", b"content", "text/plain")},
    )
    assert response.status_code == 429


@pytest.mark.asyncio
async def test_delete_document_cascade(
    client: AsyncClient,
    db: AsyncSession,
    auth_headers: dict,
    test_user,
):
    """Deleting a document decrements the counter and returns 204."""
    # Seed a document and usage counter
    doc = Document(
        user_id=test_user.id,
        title="test.pdf",
        r2_key="documents/test-key",
        mime_type="application/pdf",
        status="ready",
    )
    db.add(doc)
    usage = UserUsage(user_id=test_user.id, reset_at="2099-01-01T00:00:00+00:00", documents_uploaded=2)
    db.add(usage)
    await db.commit()

    response = await client.delete(f"/api/v1/documents/{doc.id}", headers=auth_headers)
    assert response.status_code == 204

    # Verify counter decremented
    await db.refresh(usage)
    assert usage.documents_uploaded == 1


@pytest.mark.asyncio
async def test_delete_other_user_document_returns_404(
    client: AsyncClient,
    db: AsyncSession,
    auth_headers: dict,
    other_user,
):
    """Users cannot delete documents they do not own."""
    doc = Document(
        user_id=other_user.id,
        title="other.pdf",
        r2_key="documents/other-key",
        mime_type="application/pdf",
        status="ready",
    )
    db.add(doc)
    await db.commit()

    response = await client.delete(f"/api/v1/documents/{doc.id}", headers=auth_headers)
    assert response.status_code == 404
```

- [ ] **Step 2: Run tests**

```bash
cd backend && pytest src/tests/test_documents.py -v
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/tests/test_documents.py
git commit -m "test: document upload quota and deletion"
```

---

## Chunk 7: Verification

### Task 11: Final verification

- [ ] **Step 1: Run full backend lint and tests**

```bash
cd backend && ruff check . && pytest
```

- [ ] **Step 2: Run frontend tests**

```bash
cd frontend && pnpm run test:run
```

- [ ] **Step 3: Manual verification checklist**

1. Upload a document → counter increments → quota response shows new count.
2. Upload up to tier limit → next upload returns 429.
3. Delete a document → counter decrements → R2 object removed → DB row gone.
4. Delete another user's document → 404.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address review feedback from document upload limits PR"
```

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-26-document-upload-limits-deletion-plan.md`. Ready to execute?**
