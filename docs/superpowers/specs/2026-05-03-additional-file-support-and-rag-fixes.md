# Design Spec: Additional File Support & RAG Chat Improvements

> Date: 2026-05-03  
> Scope: Backend file extraction, storage strategy, frontend document viewers, RAG chat bug fixes  
> Status: Draft — pending approval

---

## 1. Problem Statement

### 1.1 File Support Gap
The document upload pipeline currently supports PDFs end-to-end but rejects or crashes on other file types. The backend router already accepts `text/plain` and `text/markdown`, but:
- The frontend dropzone hard-rejects non-PDFs
- The ARQ worker tries to open every file with PyMuPDF, causing crashes
- No viewer components exist for MD, TXT, DOCX, or PPTX

### 1.2 RAG Chat Quality Issues
The grounded chat feature fails to answer broad questions (e.g., "explain the different types of...") even when the information exists in the document. Root cause analysis identified four compounding issues:
1. **5-chunk hard limit** is too small for broad queries (~13% document coverage)
2. **Wrong embedding task type** (`retrieval_document` used for queries instead of `retrieval_query`)
3. **No document metadata in prompt** — LLM assumes 5 chunks = entire document
4. **Overly cautious fallback prompt** rewards saying "not explained in the text"

---

## 2. Goals

1. Enable upload, processing, and viewing of **DOCX, PPTX, MD, and TXT** files
2. Fix RAG chat to handle **broad/summarization queries** without false negatives
3. Maintain **design system consistency** across all new viewers
4. **Minimize architectural changes** — reuse existing patterns (RichMarkdown, prose-brand, Card system)

---

## 3. Non-Goals

1. **No OCR for images** — image upload support is already accepted by the backend but not wired up; out of scope
2. **No DOCX/PPTX-to-PDF conversion** — extracted text viewers only, not pixel-perfect rendering
3. **No server-side HTML generation** for DOCX/PPTX
4. **No chunking strategy overhaul** — keep `RecursiveCharacterTextSplitter` at 1000 chars / 200 overlap for now
5. **No streaming chat refactor** — keep synchronous JSON response, frontend word-by-word animation

---

## 4. Architecture

### 4.1 File Processing Pipeline

```
User uploads file
    ↓
Frontend dropzone (accepts PDF, DOCX, PPTX, MD, TXT)
    ↓
POST /api/v1/documents/upload
    ↓
Cloudflare R2 (all files, unified key: documents/{user_id}/{uuid}-{filename})
    ↓
ARQ Worker: process_document()
    ├─ PDF → PyMuPDF (existing)
    ├─ DOCX → markitdown
    ├─ PPTX → markitdown
    ├─ MD → read as-is
    └─ TXT → read as-is
    ↓
RecursiveCharacterTextSplitter (chunk_size=1000, chunk_overlap=200)
    ↓
Gemini Embeddings (gemini-embedding-001, 768-dim)
    ↓
PostgreSQL + pgvector (document_chunks table)
```

### 4.2 Document Viewer Architecture

```
Document Detail Page
    ├─ Sidebar (metadata, actions, status)
    └─ Main Content Area
         ├─ PDF → iframe (existing, unchanged)
         ├─ MD → RichMarkdown + prose-brand
         ├─ TXT → TextViewer (monospace, wrapped)
         ├─ DOCX → RichMarkdown + prose-brand (converted to markdown)
         └─ PPTX → SlideViewer (slide-by-slide cards)
```

### 4.3 RAG Chat Fix Architecture

```
User asks question
    ↓
Query embedding (FIXED: task_type="retrieval_query")
    ↓
Cosine similarity search over chunks (FIXED: limit=10)
    ↓
Chat chain assembles prompt:
    - System persona
    - Mode rules (strict_rag / tutor / socratic)
    - Document metadata (NEW: "Excerpts from {title} ({total_chunks} chunks total)")
    - Chunks [1]...[10]
    - Question
    ↓
Gemini 2.5 Flash Lite → JSON response with <answer> and <used_citations>
```

---

## 5. Detailed Design

### 5.1 Backend: File Extraction

**Library:** `markitdown` (single dependency for DOCX + PPTX)  
**Fallback:** If `markitdown` fails on a file, fall back to plain text extraction (for DOCX: `python-docx`; for PPTX: `python-pptx`).

**Worker logic (`backend/src/worker.py`):**
```python
mime_type = document.mime_type

if mime_type == "application/pdf":
    text = extract_with_pymupdf(file_bytes)
elif mime_type in ("application/vnd.openxmlformats-officedocument.wordprocessingml.document",):
    text = extract_with_markitdown(file_bytes)
elif mime_type in ("application/vnd.openxmlformats-officedocument.presentationml.presentation",):
    text = extract_with_markitdown(file_bytes)
elif mime_type in ("text/plain", "text/markdown"):
    text = file_bytes.decode("utf-8")
else:
    raise ValueError(f"Unsupported mime type: {mime_type}")
```

**PPTX-specific handling:** `markitdown` outputs slide content with `---` or slide number markers. We preserve these as section boundaries during chunking by prepending `Slide {n}:` before each slide's text.

### 5.2 Storage Strategy

**Decision: R2 for all original files, including MD and TXT.**

| Aspect | R2 for All | DB for Text |
|---|---|---|
| Consistency | ✅ Single pipeline | ❌ Special-cased logic everywhere |
| Deletion | ✅ One S3Service.delete_file() call | ❌ Conditional: delete from DB or R2? |
| Signed URLs | ✅ Unified | ❌ Must serve DB content differently |
| Complexity | ✅ Low | ❌ Higher |
| Cost | Negligible | Negligible |

**Rationale:** The consistency benefit outweighs any theoretical overhead. MD/TXT files are typically small (<1MB), and R2 storage/bandwidth costs are negligible at this scale. The existing deletion flow, signed URL generation, and frontend download logic all work unchanged.

### 5.3 Frontend: Document Viewers

#### 5.3.1 Shared Viewer Shell

All non-PDF viewers share a common shell:

```tsx
<DocumentViewerShell
  title={document.title}
  mimeType={document.mime_type}
  status={document.status}
  onDownload={() => window.open(signedUrl, "_blank")}
>
  {/* Viewer-specific content */}
</DocumentViewerShell>
```

**Shell specs (per design.md):**
- Container: `max-w-[640px] mx-auto` (matches `layout-content`)
- Card: `bg-surface-card border border-border-default rounded-2xl overflow-hidden`
- Sticky header: `px-[18px] py-3.5 border-b border-border-default flex justify-between items-center`
  - Left: document title (`text-sm font-medium text-primary`)
  - Right: format pill badge (`bg-brand-100 border-brand-200 text-brand-500 text-xs font-medium rounded-full px-2.5 py-0.5`)
  - Download button: ghost icon button (`FileDown` icon, 16px)
- Content area: `p-5 md:p-6` with `min-h-[400px]`

#### 5.3.2 Markdown Viewer (`MarkdownViewer`)

Uses existing `RichMarkdown` component with `prose-brand` class.

```tsx
<div className="prose-brand">
  <RichMarkdown content={extractedText} />
</div>
```

**Features:**
- Full `remark-gfm` support (tables, strikethrough, task lists)
- Code highlighting via `rehype-highlight`
- MermaidJS diagrams via `MermaidBlock`
- Math via `remark-math` + `rehype-katex`
- Dark mode: `dark:prose-invert` (handled by `prose-brand`)

#### 5.3.3 Plain Text Viewer (`TextViewer`)

Simple but polished monospace display:

```tsx
<pre className="font-mono text-sm text-primary leading-relaxed whitespace-pre-wrap break-words">
  {extractedText}
</pre>
```

**Enhancements:**
- Line numbers (optional, toggleable): `text-xs text-tertiary select-none` in a left gutter
- Copy button in sticky header
- Word wrap toggle
- Search/filter (future enhancement)

#### 5.3.4 DOCX Viewer (`DocxViewer`)

Same as `MarkdownViewer` — `markitdown` converts DOCX to Markdown, so we render the converted text through `RichMarkdown`.

**Key difference:** If the conversion produces poor Markdown (e.g., complex tables), we may want to show a "View as plain text" toggle. But for MVP, Markdown-only is sufficient.

#### 5.3.5 PPTX Viewer (`SlideViewer`) ⭐

**Design decision: Slide-by-slide card layout.** Each slide is a distinct card to preserve the spatial/sequential nature of presentations.

```tsx
<div className="space-y-6">
  {slides.map((slide, index) => (
    <SlideCard key={index} number={index + 1} content={slide.content} />
  ))}
</div>
```

**SlideCard specs:**
- Container: `bg-surface-subtle border border-border-default rounded-xl p-5`
- Slide number badge: `bg-brand-100 text-brand-800 text-xs font-semibold rounded-full w-7 h-7 flex items-center justify-center`
- Title (if extracted): `text-base font-semibold text-primary mb-3`
- Content: `prose-brand prose-sm` (rendered via `RichMarkdown` for bullet points)
- Bullet hierarchy preserved from original slide

**Navigation:**
- Desktop: scroll naturally, slide numbers in a floating mini-toc on the right
- Mobile: same, but mini-toc is hidden (just scroll)

**Why cards over continuous flow:**
- Preserves cognitive chunking — each slide is a unit of information
- Prevents "wall of text" fatigue
- Matches how students actually consume presentation material

### 5.4 Frontend: Upload Dropzone Updates

**Changes to `frontend/src/components/upload-dropzone.tsx`:**

1. **Accept new MIME types:**
   ```tsx
   accept: {
     'application/pdf': ['.pdf'],
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
     'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
     'text/markdown': ['.md'],
     'text/plain': ['.txt'],
   }
   ```

2. **Add file type chips** (per design.md spec):
   ```tsx
   <div className="flex justify-center gap-1.5 mt-4">
     {['PDF', 'DOCX', 'PPTX', 'MD', 'TXT'].map(type => (
       <span key={type} className="bg-brand-500/[0.08] border border-brand-500/[0.2] rounded-full px-2.5 py-0.5 text-[11px] font-medium text-brand-500">
         {type}
       </span>
     ))}
   </div>
   ```

3. **Replace solid progress bar with gradient + glow** (per design.md):
   ```css
   .progress-fill {
     background: linear-gradient(90deg, brand-500, brand-400);
   }
   .progress-glow::after {
     content: '';
     position: absolute;
     right: 0;
     top: -1px;
     width: 12px;
     height: 5px;
     background: white;
     opacity: 0.6;
     filter: blur(2px);
   }
   ```

4. **Add radial glow to dropzone** (per design.md):
   ```css
   .dropzone::before {
     content: '';
     position: absolute;
     inset: 0;
     pointer-events: none;
     background: radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 70%);
   }
   ```

5. **Add step label during upload** (e.g., "Uploading...", "Processing...") — pull from SSE events if available, or generic heuristic.

### 5.5 Frontend: File Type Icons

Create a `FileTypeIcon` component mapping MIME types to Lucide icons:

```tsx
const iconMap = {
  'application/pdf': FileText,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileText,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': Presentation,
  'text/markdown': FileCode,
  'text/plain': FileType,
};
```

Use this in:
- Document list cards
- Upload dropzone file card
- Document detail page sidebar
- Chat document selector

### 5.6 RAG Chat Fixes

#### Fix 1: Embedding Task Type
**File:** `backend/src/services/retrieval_service.py`  
**Change:** `task_type="retrieval_document"` → `task_type="retrieval_query"`

#### Fix 2: Chunk Limit
**File:** `backend/src/services/chat_service.py`  
**Change:** `limit=5` → `limit=10`

**File:** `backend/src/chains/chat_chain.py`  
**Change:** `chunks = input["chunks"][:5]` → `chunks = input["chunks"][:10]`

**Rationale for 10:** Coverage math shows 10 chunks ≈ 27% of a typical document (vs. 13% for 5). Token cost is ~2,500 tokens, well within Gemini 2.5 Flash Lite's 1M context. Practice service already uses 10, establishing precedent.

#### Fix 3: Document Metadata in Prompt
**File:** `backend/src/chains/chat_chain.py`

Add a metadata preamble to the context assembly:

```python
numbered_context = (
    f"The following are relevant excerpts from the document '{document_title}' "
    f"(total {total_chunks} excerpts available). Use only these excerpts to answer:\n\n" +
    "\n\n".join(f"[{i + 1}] {content}" for i, content in enumerate(context_parts))
)
```

**Impact:** LLM now knows it's seeing a subset, reducing false-confidence statements like "not explained in the text."

#### Fix 4: Prompt Wording (Optional)
Consider softening the tutor mode fallback from:
> "If the answer is not in the chunks and you genuinely don't know, say 'I don't have enough information...'"

To:
> "If the answer is not in the provided excerpts, say 'I don't see that in the excerpts I've reviewed.' Do not claim the information is absent from the entire document."

**Decision:** This is lower priority than Fixes 1-3. Include as a fast-follow if Fixes 1-3 don't fully resolve the issue.

---

## 6. Data Model Changes

### 6.1 No Schema Changes Required

The existing `documents` table already has:
- `mime_type` column (varchar)
- `r2_key` column (varchar)
- `status` enum (pending, processing, ready, failed)

No new columns needed. The worker branches on `mime_type` at runtime.

### 6.2 Vector Dimensions

No changes. Continue using `gemini-embedding-001` with `output_dimensionality=768`. The `DocumentChunk.embedding` column is already `Vector(768)`.

---

## 7. API Changes

### 7.1 Upload Endpoint

**File:** `backend/src/api/routers/documents.py`

Update allowed MIME types:
```python
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/markdown",
    "text/plain",
}
```

No other API changes needed.

### 7.2 OpenAPI Type Regeneration

After backend changes, run:
```bash
cd frontend && pnpm run generate:api
```

---

## 8. Error Handling

| Scenario | Behavior |
|---|---|
| Unsupported MIME type | Backend returns 400 with clear message; frontend validates before upload |
| markitdown fails on DOCX/PPTX | Fall back to raw text extraction; if that fails, mark job as failed |
| TXT/MD decode error | Try UTF-8, then latin-1, then mark as failed |
| Empty extracted text | Mark job as failed with "No text could be extracted" |
| R2 upload failure | ARQ job marked as failed; user sees error in UI |
| Embedding API failure | Tenacity retries 5x; if all fail, job marked as failed |

---

## 9. Testing Strategy

### 9.1 Backend Tests
- Unit test: `test_extract_pdf`, `test_extract_docx`, `test_extract_pptx`, `test_extract_md`, `test_extract_txt`
- Integration test: Upload DOCX/PPTX/MD/TXT, verify chunks are created and embedded
- Regression test: Verify PDF extraction still works exactly as before
- RAG fix test: Verify `task_type="retrieval_query"` is passed to embedding model
- RAG fix test: Verify `limit=10` is used in chat service

### 9.2 Frontend Tests
- Component test: `MarkdownViewer` renders `RichMarkdown` correctly
- Component test: `TextViewer` shows line numbers and wraps text
- Component test: `SlideViewer` renders slide cards with correct numbering
- Component test: `FileTypeIcon` returns correct icon for each MIME type
- E2E test: Upload a DOCX, verify it appears in document list with correct icon
- E2E test: Open a TXT file, verify text is readable

---

## 10. Implementation Phases

### Phase 1: RAG Fixes (Fastest Win)
1. Fix `task_type` in `retrieval_service.py`
2. Raise chunk limit to 10 in `chat_service.py` and `chat_chain.py`
3. Add document metadata to chat prompt
4. Run chat regression tests

### Phase 2: Backend File Support
1. Add `markitdown` to `requirements.txt`
2. Update `ALLOWED_MIME_TYPES` in documents router
3. Implement MIME-type branching in `process_document()` worker
4. Add PPTX slide boundary preservation
5. Run backend tests for all file types

### Phase 3: Frontend Viewers
1. Create `FileTypeIcon` component
2. Create `DocumentViewerShell` shared component
3. Create `MarkdownViewer` (reuses `RichMarkdown`)
4. Create `TextViewer`
5. Create `SlideViewer`
6. Update document detail page to branch by MIME type
7. Run frontend component tests

### Phase 4: Upload Dropzone Polish
1. Update dropzone to accept new MIME types
2. Add file type chips
3. Replace progress bar with gradient + glow
4. Add radial glow pseudo-element
5. Run E2E upload tests

### Phase 5: Integration & QA
1. End-to-end test: Upload each file type → process → view → chat with it
2. Verify RAG chat quality improvement with broad queries
3. Run full test suite: `pytest` + `pnpm run test:run`
4. Run `ruff check .` and `pnpm run lint`
5. Regenerate OpenAPI types: `pnpm run generate:api`

---

## 11. Design System Gaps to Fill

| Gap | Priority | Phase |
|---|---|---|
| Upload dropzone: file type chips | High | 4 |
| Upload dropzone: gradient progress bar + glow | Medium | 4 |
| Upload dropzone: radial glow | Medium | 4 |
| Prose `h2` left bar marker (`::before`) | Low | 3 |
| Concept callout block | Low | Post-MVP |
| File type icon mapping | High | 3 |

---

## 12. Open Questions

1. **PPTX slide detection:** How robust is `markitdown` at detecting slide boundaries? Should we add a regex post-processor to split on `---` or `Slide \d+:` patterns?
2. **TXT encoding:** Should we attempt `chardet` for unknown encodings, or stick to UTF-8 with latin-1 fallback?
3. **DOCX table rendering:** `markitdown` converts tables to Markdown tables. `RichMarkdown` handles these via `remark-gfm`. Are complex tables (merged cells) acceptable to lose?

---

## 13. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `markitdown` adds heavy dependency | It's ~50MB with Pandoc. If too heavy, fall back to `python-docx` + `python-pptx` (lighter but lower quality). |
| PPTX viewer feels clunky vs. PowerPoint | Extracted text is a known limitation. Add "Download Original" button prominently. Communicate expectation in UI. |
| RAG fix (limit=10) increases token cost | 10 chunks ≈ 2,500 tokens. Gemini 2.5 Flash Lite is cheap; cost increase is negligible. |
| Prompt size + 8-message history exceeds context | 10 chunks + 8 messages ≈ 5k tokens total. Well under 1M limit. Monitor if users have very long conversations. |
| Breaking existing PDF flow | Keep PDF extraction path completely unchanged. Add branching logic alongside, not replacing. |

---

## 14. Success Criteria

1. ✅ User can upload DOCX, PPTX, MD, TXT through the dropzone
2. ✅ Each file type is processed into chunks and embedded within 60 seconds
3. ✅ Each file type renders in a readable viewer matching design.md specs
4. ✅ RAG chat answers broad "explain the types of..." questions correctly for all supported file types
5. ✅ No regressions in existing PDF upload, summary generation, quiz generation, or chat
6. ✅ All tests pass: `pytest` + `pnpm run test:run`
7. ✅ Lint clean: `ruff check .` + `pnpm run lint`

---

## 15. Appendix: Relevant Files

### Backend
- `backend/src/worker.py` — ARQ worker, text extraction, chunking
- `backend/src/api/routers/documents.py` — upload endpoint
- `backend/src/services/retrieval_service.py` — chunk retrieval, embedding query
- `backend/src/services/chat_service.py` — chat orchestration
- `backend/src/chains/chat_chain.py` — LLM prompt assembly
- `backend/src/core/config.py` — constants, quota limits

### Frontend
- `frontend/src/components/upload-dropzone.tsx` — file upload UI
- `frontend/src/app/(app)/documents/[id]/page.tsx` — document detail page
- `frontend/src/components/ui/rich-markdown.tsx` — markdown renderer
- `frontend/src/app/globals.css` — design tokens, prose-brand styles
- `frontend/src/components/ui/card.tsx` — card variants

### Shared
- `frontend/src/db/schema.ts` — Drizzle schema
- `backend/src/db/models.py` — SQLAlchemy models
- `docs/dev/design.md` — design system source of truth
