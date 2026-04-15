# Feature: Document Upload + Processing

> Part of the **Ingest** step in the core learning loop.  
> See [`master-spec.md`](../master-spec.md) for schema and API contract.  
> See [`modularity-guidelines.md`](../modularity-guidelines.md) for implementation patterns.

---

## What This Feature Does

Accepts a file from the user, stores it, and processes it asynchronously into vector embeddings that all subsequent AI features (summary, quiz, practice, chat) depend on.

The user experience:
1. User drops or selects a file
2. Upload begins immediately, shows progress
3. File is stored; user gets a job ID back instantly
4. SSE stream shows processing steps (extracting, chunking, embedding)
5. When complete, document appears in their list, unlocking summary and quiz buttons

---

## Supported File Types

| Type | MIME | Extraction Method |
|---|---|---|
| PDF | `application/pdf` | PyMuPDF |
| PNG | `image/png` | Gemini Vision |
| JPG/JPEG | `image/jpeg` | Gemini Vision |
| Plain text | `text/plain` | Direct read |

Maximum file size: **10MB**

---

## Backend Implementation

### Route: `POST /api/v1/documents/upload`

```python
# Input: multipart/form-data with file
# Output: { document_id: UUID, job_id: UUID }
# Errors: INVALID_FILE_TYPE (422), FILE_TOO_LARGE (413), QUOTA_EXCEEDED (429)
```

Steps:
1. Validate MIME type with `python-magic` (not just extension)
2. Validate file size
3. Upload to R2 with key format: `{user_id}/{document_id}/{filename}`
4. Insert document row with status `pending`
5. Enqueue `process_document` ARQ job
6. Return `{ document_id, job_id }` — do not wait for processing

### ARQ Worker: `process_document`

Emits SSE events at each step. Updates `jobs` table status throughout.

```
Step 1: Extract text
  - PDF → pymupdf: fitz.open() → extract text per page → join
  - Image → Gemini Vision: upload image bytes, prompt for text extraction
  - Text → read directly
  - Emit: { step: "extracting", pct: 10 }

Step 2: Chunk text
  - Use tiktoken to count tokens
  - Split into 200–300 token windows with 50-token overlap
  - Generate SHA-256 hash per chunk for deduplication
  - Skip chunks whose hash already exists for this document
  - Emit: { step: "chunking", pct: 40 }

Step 3: Generate embeddings
  - Batch chunks (max 100 per API call)
  - Use Gemini embedding model: models/embedding-001
  - task_type: "RETRIEVAL_DOCUMENT"
  - Emit: { step: "embedding", pct: 70 }

Step 4: Store
  - Bulk insert document_chunks with embeddings
  - Update document status to "ready"
  - Update job status to "complete"
  - Emit: { step: "complete", pct: 100 }
```

**Error handling:**
- On any step failure: update document status to `failed`, set error message, emit SSE error event
- ARQ retries: 2 retries with exponential backoff
- If extraction yields 0 text: fail with `EXTRACTION_FAILED`

### SSE Route: `GET /api/v1/jobs/{job_id}/stream`

```python
# Returns: text/event-stream
# Auth: JWT required, job must belong to current user
# Closes: when job reaches complete or error status
```

Polls the `jobs` table every 500ms and emits the current status. When status is `complete` or `failed`, emit final event and close connection.

---

## Frontend Implementation

### Upload Component

Location: `components/features/documents/document-upload.tsx`

- File input + drag-and-drop zone (shadcn `DropZone` pattern)
- Client-side validation: file type, file size before upload
- Progress bar for upload (axios `onUploadProgress`)
- On success: opens SSE connection for processing status
- Processing progress bar driven by SSE events (pct field)
- On complete: invalidate `["documents"]` React Query key

### SSE Hook

Location: `hooks/use-job-stream.ts`

```typescript
export function useJobStream(jobId: string | null, onComplete: () => void) {
  // Opens EventSource connection
  // Parses progress and complete events
  // Calls onComplete on "complete" event
  // Returns { step, pct, error }
}
```

### Document List

Location: `app/(app)/dashboard/page.tsx` (Server Component)

Fetches documents via Drizzle directly. Documents with status `processing` or `pending` show a spinner. Documents with status `failed` show an error state with retry option. Documents with status `ready` show action buttons (Summarize, Quiz).

---

## Drizzle Queries (Next.js)

```typescript
// Get user's documents
const documents = await db
  .select()
  .from(documentsTable)
  .where(eq(documentsTable.userId, session.user.id))
  .orderBy(desc(documentsTable.createdAt))

// Update document title (Server Action)
await db
  .update(documentsTable)
  .set({ title: newTitle })
  .where(
    and(
      eq(documentsTable.id, documentId),
      eq(documentsTable.userId, session.user.id) // always scope by userId
    )
  )
```

---

## Chunking Strategy

```
Window size:  250 tokens (target)
Overlap:      50 tokens (maintains context across chunk boundaries)
Minimum:      50 tokens (discard smaller trailing chunks)
Dedup:        SHA-256 hash of content string
```

Why overlap? Without overlap, a concept that spans a chunk boundary gets split and neither chunk has full context. 50-token overlap ensures retrieval catches cross-boundary concepts.

---

## Quota Notes

Document upload does not consume quota. Processing is free. Quota is consumed when the user generates a summary, quiz, or practice session from the processed document.

---

## Tests

**Backend (`pytest`):**
- `test_upload_valid_pdf` — happy path, document created, job enqueued
- `test_upload_invalid_type` — returns 422
- `test_upload_too_large` — returns 413
- `test_process_document_pdf` — worker extracts, chunks, embeds correctly
- `test_process_document_image` — Gemini Vision extraction works
- `test_deduplication` — re-uploading same file doesn't duplicate chunks
- `test_process_failure` — document status set to failed on extraction error

**Frontend (`vitest`):**
- `DocumentUpload` renders drop zone
- Shows upload progress during upload
- Opens SSE on success and shows processing steps
- Shows error state on failure
