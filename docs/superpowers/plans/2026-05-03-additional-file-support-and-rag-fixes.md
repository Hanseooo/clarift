# Additional File Support & RAG Chat Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable DOCX, PPTX, MD, TXT file uploads with readable viewers and fix RAG chat false negatives on broad queries.

**Architecture:** Branch file extraction by MIME type in the ARQ worker using `markitdown`, store all originals in R2, render non-PDFs with custom viewers (RichMarkdown for MD/DOCX, monospace for TXT, slide cards for PPTX). Fix RAG by correcting embedding task type, raising chunk limit from 5 to 10, and injecting document metadata into prompts.

**Tech Stack:** Next.js 15 + Tailwind 4 + shadcn/ui (frontend); FastAPI + LangChain + ARQ (backend); Cloudflare R2 (storage); Gemini Embeddings (pgvector).

---

## File Structure Map

### Backend — New Files
- `backend/src/services/extraction_service.py` — MIME-type branching text extraction (PDF, DOCX, PPTX, MD, TXT)

### Backend — Modified Files
- `backend/src/worker.py` — Replace inline PyMuPDF call with `extraction_service.extract_text()`
- `backend/src/api/routers/documents.py` — Expand `ALLOWED_MIME_TYPES`
- `backend/src/services/retrieval_service.py` — Fix `task_type` to `"retrieval_query"`
- `backend/src/services/chat_service.py` — Raise `limit=5` to `limit=10`
- `backend/src/chains/chat_chain.py` — Remove `[:5]` slice; add document metadata preamble
- `backend/requirements.txt` — Add `markitdown`

### Frontend — New Files
- `frontend/src/components/features/documents/file-type-icon.tsx` — Lucide icon mapping by MIME type
- `frontend/src/components/features/documents/document-viewer-shell.tsx` — Shared sticky-header card shell
- `frontend/src/components/features/documents/markdown-viewer.tsx` — Wraps RichMarkdown + prose-brand
- `frontend/src/components/features/documents/text-viewer.tsx` — Monospace display with line numbers
- `frontend/src/components/features/documents/slide-viewer.tsx` — Slide-by-slide card layout for PPTX

### Frontend — Modified Files
- `frontend/src/components/upload-dropzone.tsx` — Accept new MIME types, add file type chips, gradient progress bar
- `frontend/src/app/(app)/documents/[id]/page.tsx` — Branch viewer by MIME type
- `frontend/src/app/globals.css` — Add `.progress-fill`, `.progress-glow`, `.dropzone-radial-glow` utilities

### Tests — New Files
- `backend/tests/services/test_extraction_service.py` — Unit tests for all extraction paths
- `backend/tests/services/test_retrieval_service.py` — Test embedding task_type fix
- `backend/tests/services/test_chat_service.py` — Test chunk limit fix
- `frontend/src/components/features/documents/__tests__/file-type-icon.test.tsx`
- `frontend/src/components/features/documents/__tests__/text-viewer.test.tsx`
- `frontend/src/components/features/documents/__tests__/slide-viewer.test.tsx`

---

## Phase 1: RAG Fixes (Fastest Win)

### Task 1: Fix Embedding Task Type

**Files:**
- Modify: `backend/src/services/retrieval_service.py`
- Test: `backend/tests/services/test_retrieval_service.py`

- [ ] **Step 1: Write failing test**

Create `backend/tests/services/test_retrieval_service.py`:
```python
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from backend.src.services.retrieval_service import get_relevant_chunks


@pytest.mark.asyncio
async def test_embed_query_uses_retrieval_query_task_type():
    """Query embeddings must use task_type='retrieval_query' not 'retrieval_document'."""
    from backend.src.services.retrieval_service import _embed_query

    with patch("backend.src.services.retrieval_service.GoogleGenerativeAIEmbeddings") as MockEmbeddings:
        mock_instance = MagicMock()
        mock_instance.aembed_query = AsyncMock(return_value=[0.1] * 768)
        MockEmbeddings.return_value = mock_instance

        result = await _embed_query("explain the types of")

        MockEmbeddings.assert_called_once_with(
            model="models/gemini-embedding-001",
            task_type="retrieval_query",
            output_dimensionality=768,
        )
        assert len(result) == 768
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd backend
pytest tests/services/test_retrieval_service.py::test_embed_query_uses_retrieval_query_task_type -v
```

Expected: FAIL (assertion error on `task_type`)

- [ ] **Step 3: Fix task_type in retrieval_service.py**

Read `backend/src/services/retrieval_service.py`, find the `_embed_query` function (around line 50) and change:

```python
# OLD:
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    task_type="retrieval_document",
    output_dimensionality=768,
)

# NEW:
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    task_type="retrieval_query",
    output_dimensionality=768,
)
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pytest tests/services/test_retrieval_service.py::test_embed_query_uses_retrieval_query_task_type -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/retrieval_service.py backend/tests/services/test_retrieval_service.py
git commit -m "fix(rag): use retrieval_query task type for query embeddings"
```

---

### Task 2: Raise Chat Chunk Limit to 10

**Files:**
- Modify: `backend/src/services/chat_service.py`
- Modify: `backend/src/chains/chat_chain.py`
- Test: `backend/tests/services/test_chat_service.py`

- [ ] **Step 1: Write failing test**

Create `backend/tests/services/test_chat_service.py`:
```python
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_chat_uses_limit_10():
    """Chat retrieval must request 10 chunks, not 5."""
    from backend.src.services.chat_service import send_chat_message

    mock_db = MagicMock()
    mock_user = MagicMock()
    mock_user.id = "user-123"

    with patch("backend.src.services.chat_service.get_relevant_chunks", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = []

        with patch("backend.src.services.chat_service.run_chat_chain", new_callable=AsyncMock) as mock_chain:
            mock_chain.return_value = {"answer": "test", "citations": []}

            await send_chat_message(
                db=mock_db,
                user=mock_user,
                request=MagicMock(message="test", document_ids=["doc-1"], mode="strict_rag", persona_override=None),
            )

            mock_get.assert_awaited_once()
            call_kwargs = mock_get.call_kwargs
            assert call_kwargs.get("limit") == 10
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pytest tests/services/test_chat_service.py::test_chat_uses_limit_10 -v
```

Expected: FAIL (assertion on limit)

- [ ] **Step 3: Fix limit in chat_service.py**

Read `backend/src/services/chat_service.py`, find the `get_relevant_chunks` call (around line 38) and change:

```python
# OLD:
chunks = await get_relevant_chunks(
    db,
    user_id=user_id,
    query=question,
    document_ids=document_ids,
    limit=5,
)

# NEW:
chunks = await get_relevant_chunks(
    db,
    user_id=user_id,
    query=question,
    document_ids=document_ids,
    limit=10,
)
```

- [ ] **Step 4: Fix slice in chat_chain.py**

Read `backend/src/chains/chat_chain.py`, find the chunk slice (around line 111) and change:

```python
# OLD:
chunks = input["chunks"][:5]

# NEW:
chunks = input["chunks"][:10]
```

- [ ] **Step 5: Run test — expect PASS**

```bash
pytest tests/services/test_chat_service.py::test_chat_uses_limit_10 -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/chat_service.py backend/src/chains/chat_chain.py backend/tests/services/test_chat_service.py
git commit -m "fix(rag): raise chat chunk limit from 5 to 10"
```

---

### Task 3: Inject Document Metadata into Chat Prompt

**Files:**
- Modify: `backend/src/chains/chat_chain.py`
- Test: `backend/tests/chains/test_chat_chain.py`

- [ ] **Step 1: Read chat_chain.py to understand current context assembly**

Read `backend/src/chains/chat_chain.py`, lines 100-140, to find where `numbered_context` is built.

- [ ] **Step 2: Modify context assembly to include metadata**

Find the lines building `numbered_context` (around 127-129) and replace with:

```python
document_title = input.get("document_title", "your document")
total_chunks = input.get("total_chunks", len(context_parts))

numbered_context = (
    f"The following are relevant excerpts from the document '{document_title}' "
    f"(total {total_chunks} excerpts available). Use only these excerpts to answer:\n\n"
    + "\n\n".join(f"[{i + 1}] {content}" for i, content in enumerate(context_parts))
)
```

- [ ] **Step 3: Update chat_service.py to pass metadata**

Read `backend/src/services/chat_service.py` and find where `run_chat_chain` is called. Add document title and total chunks:

```python
# Find the chain invocation and update the input dict:
result = await run_chat_chain(
    question=request.message,
    chunks=chunks,
    history=history,
    mode=request.mode,
    persona_override=request.persona_override,
    document_title=document.title if document else "your notes",
    total_chunks=len(chunks),
)
```

(Exact variable names may differ — read the file and adapt. If `document` is not available in scope, pass `None` and let the chain default to `"your notes"`.)

- [ ] **Step 4: Write test**

Create `backend/tests/chains/test_chat_chain.py`:
```python
import pytest
from backend.src.chains.chat_chain import build_numbered_context


def test_build_numbered_context_includes_metadata():
    """Context must include document title and total chunk count."""
    context = build_numbered_context(
        chunks=["chunk one", "chunk two"],
        document_title="Biology 101",
        total_chunks=37,
    )
    assert "Biology 101" in context
    assert "37 excerpts available" in context
    assert "[1] chunk one" in context
    assert "[2] chunk two" in context
```

If `build_numbered_context` is not a standalone function, refactor the relevant logic into one in `chat_chain.py` so it can be tested in isolation. Or patch the chain invocation and inspect the prompt.

- [ ] **Step 5: Run test — expect PASS**

```bash
pytest tests/chains/test_chat_chain.py -v
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/chains/chat_chain.py backend/src/services/chat_service.py backend/tests/chains/test_chat_chain.py
git commit -m "fix(rag): inject document metadata into chat prompt for subset awareness"
```

---

## Phase 2: Backend File Support

### Task 4: Add markitdown Dependency

**Files:**
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add markitdown to requirements**

Read `backend/requirements.txt` and append:

```
markitdown>=0.0.1a3
```

- [ ] **Step 2: Install in venv**

```bash
cd backend
.venv\Scripts\python -m pip install markitdown
```

(Or `uv pip install markitdown` if using uv.)

- [ ] **Step 3: Commit**

```bash
git add backend/requirements.txt
git commit -m "chore(deps): add markitdown for docx/pptx extraction"
```

---

### Task 5: Create Extraction Service

**Files:**
- Create: `backend/src/services/extraction_service.py`
- Test: `backend/tests/services/test_extraction_service.py`

- [ ] **Step 1: Write extraction_service.py**

```python
"""Text extraction from various document formats."""

import io
from typing import Callable

import fitz  # PyMuPDF
from markitdown import MarkItDown


# Registry of extractors by MIME type
_EXTRACTORS: dict[str, Callable[[bytes], str]] = {}


def _register(mime_type: str):
    def decorator(fn: Callable[[bytes], str]) -> Callable[[bytes], str]:
        _EXTRACTORS[mime_type] = fn
        return fn
    return decorator


@_register("application/pdf")
def _extract_pdf(file_bytes: bytes) -> str:
    text_parts = []
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for page in doc:
            text_parts.append(page.get_text())
    return "\n".join(text_parts)


@_register("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
def _extract_docx(file_bytes: bytes) -> str:
    md = MarkItDown()
    result = md.convert_stream(io.BytesIO(file_bytes))
    return result.text_content


@_register("application/vnd.openxmlformats-officedocument.presentationml.presentation")
def _extract_pptx(file_bytes: bytes) -> str:
    md = MarkItDown()
    result = md.convert_stream(io.BytesIO(file_bytes))
    text = result.text_content
    # Preserve slide boundaries with markers
    lines = text.splitlines()
    slide_lines = []
    current_slide = 1
    for line in lines:
        if line.strip() == "---":
            current_slide += 1
            slide_lines.append(f"\n--- Slide {current_slide} ---\n")
        else:
            slide_lines.append(line)
    # Prepend Slide 1 marker if not already present
    if slide_lines and not slide_lines[0].startswith("--- Slide"):
        slide_lines.insert(0, "--- Slide 1 ---\n")
    return "\n".join(slide_lines)


@_register("text/plain")
@_register("text/markdown")
def _extract_text(file_bytes: bytes) -> str:
    for encoding in ("utf-8", "latin-1"):
        try:
            return file_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError("Could not decode text file with utf-8 or latin-1")


def extract_text(file_bytes: bytes, mime_type: str) -> str:
    """Extract plain text from a document given its bytes and MIME type."""
    extractor = _EXTRACTORS.get(mime_type)
    if extractor is None:
        raise ValueError(f"Unsupported MIME type: {mime_type}")
    text = extractor(file_bytes)
    if not text or not text.strip():
        raise ValueError("No text could be extracted from the file")
    return text.strip()
```

- [ ] **Step 2: Write tests**

Create `backend/tests/services/test_extraction_service.py`:

```python
import pytest
from backend.src.services.extraction_service import extract_text


def test_extract_pdf():
    # Use a minimal valid PDF or mock fitz
    # For now, verify the function exists and routes correctly
    with pytest.raises(ValueError, match="No text could be extracted"):
        extract_text(b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n", "application/pdf")


def test_extract_txt():
    text = extract_text(b"Hello, world!\nThis is a test.", "text/plain")
    assert "Hello, world!" in text


def test_extract_md():
    text = extract_text(b"# Heading\n\nSome **bold** text.", "text/markdown")
    assert "# Heading" in text


def test_extract_docx():
    # Requires a real .docx file or mocking MarkItDown
    # For unit test, mock the dependency
    from unittest.mock import patch, MagicMock
    with patch("backend.src.services.extraction_service.MarkItDown") as MockMD:
        mock_instance = MagicMock()
        mock_instance.convert_stream.return_value = MagicMock(text_content="Hello from DOCX")
        MockMD.return_value = mock_instance

        text = extract_text(b"fake-docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        assert text == "Hello from DOCX"


def test_extract_pptx_preserves_slide_markers():
    from unittest.mock import patch, MagicMock
    with patch("backend.src.services.extraction_service.MarkItDown") as MockMD:
        mock_instance = MagicMock()
        mock_instance.convert_stream.return_value = MagicMock(
            text_content="Slide 1 content\n---\nSlide 2 content"
        )
        MockMD.return_value = mock_instance

        text = extract_text(b"fake-pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation")
        assert "--- Slide 1 ---" in text
        assert "--- Slide 2 ---" in text


def test_unsupported_mime_type():
    with pytest.raises(ValueError, match="Unsupported MIME type"):
        extract_text(b"data", "image/png")


def test_empty_text_raises():
    with pytest.raises(ValueError, match="No text could be extracted"):
        extract_text(b"   \n   ", "text/plain")
```

- [ ] **Step 3: Run tests — expect PASS**

```bash
pytest tests/services/test_extraction_service.py -v
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/extraction_service.py backend/tests/services/test_extraction_service.py
git commit -m "feat(extraction): add mime-type branching extraction service with markitdown"
```

---

### Task 6: Update Worker to Use Extraction Service

**Files:**
- Modify: `backend/src/worker.py`

- [ ] **Step 1: Read worker.py around text extraction**

Read `backend/src/worker.py`, lines 100-125, to find the current PyMuPDF extraction block.

- [ ] **Step 2: Replace inline extraction with extraction_service**

Replace the PyMuPDF inline block (roughly lines 110-119):

```python
# OLD:
with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
    text = "\n".join(page.get_text() for page in doc)

# NEW:
from backend.src.services.extraction_service import extract_text

text = extract_text(file_bytes, document.mime_type)
```

Make sure `file_bytes` (or `pdf_bytes`) is the raw bytes from R2. If the variable is named `pdf_bytes`, rename it to `file_bytes` for clarity.

- [ ] **Step 3: Run existing worker tests**

```bash
pytest tests/worker/ -v
```

Expected: PASS (or identify which tests need updating for the new import)

- [ ] **Step 4: Commit**

```bash
git add backend/src/worker.py
git commit -m "refactor(worker): use extraction_service for mime-type branching"
```

---

### Task 7: Expand Allowed MIME Types in Upload Router

**Files:**
- Modify: `backend/src/api/routers/documents.py`

- [ ] **Step 1: Read documents.py to find ALLOWED_MIME_TYPES**

Read `backend/src/api/routers/documents.py`, find the `ALLOWED_MIME_TYPES` set.

- [ ] **Step 2: Expand to include new types**

```python
# OLD (likely):
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "text/plain",
    "text/markdown",
}

# NEW:
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/markdown",
    "text/plain",
}
```

Note: If `image/jpeg` and `image/png` are currently present, keep or remove them based on whether image OCR is in scope (it's not per Non-Goals, but removing might break existing behavior — check with product). **Safest: keep images but they will still fail in worker; that's pre-existing.**

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/routers/documents.py
git commit -m "feat(upload): expand allowed mime types to docx, pptx, md, txt"
```

---

## Phase 3: Frontend Viewers

### Task 8: Create FileTypeIcon Component

**Files:**
- Create: `frontend/src/components/features/documents/file-type-icon.tsx`
- Test: `frontend/src/components/features/documents/__tests__/file-type-icon.test.tsx`

- [ ] **Step 1: Write component**

```tsx
"use client";

import { FileText, FileCode, FileType, Presentation, type LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  "application/pdf": FileText,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": FileText,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": Presentation,
  "text/markdown": FileCode,
  "text/plain": FileType,
};

interface FileTypeIconProps {
  mimeType: string;
  className?: string;
  size?: number;
}

export function FileTypeIcon({ mimeType, className, size = 18 }: FileTypeIconProps) {
  const Icon = ICON_MAP[mimeType] || FileText;
  return <Icon size={size} className={className} />;
}

export function getFileLabel(mimeType: string): string {
  const labels: Record<string, string> = {
    "application/pdf": "PDF",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
    "text/markdown": "MD",
    "text/plain": "TXT",
  };
  return labels[mimeType] || "DOC";
}
```

- [ ] **Step 2: Write test**

```tsx
import { render, screen } from "@testing-library/react";
import { FileTypeIcon, getFileLabel } from "../file-type-icon";

describe("FileTypeIcon", () => {
  it("renders PDF icon", () => {
    render(<FileTypeIcon mimeType="application/pdf" data-testid="icon" />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("renders fallback for unknown mime type", () => {
    render(<FileTypeIcon mimeType="unknown/type" data-testid="icon" />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });
});

describe("getFileLabel", () => {
  it("returns correct labels", () => {
    expect(getFileLabel("application/pdf")).toBe("PDF");
    expect(getFileLabel("text/markdown")).toBe("MD");
    expect(getFileLabel("unknown")).toBe("DOC");
  });
});
```

- [ ] **Step 3: Run test — expect PASS**

```bash
cd frontend
pnpm run test:run src/components/features/documents/__tests__/file-type-icon.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/features/documents/file-type-icon.tsx frontend/src/components/features/documents/__tests__/file-type-icon.test.tsx
git commit -m "feat(frontend): add FileTypeIcon component with mime mapping"
```

---

### Task 9: Create DocumentViewerShell

**Files:**
- Create: `frontend/src/components/features/documents/document-viewer-shell.tsx`

- [ ] **Step 1: Write component**

```tsx
"use client";

import { FileDown } from "lucide-react";
import { FileTypeIcon, getFileLabel } from "./file-type-icon";

interface DocumentViewerShellProps {
  title: string;
  mimeType: string;
  children: React.ReactNode;
  onDownload?: () => void;
}

export function DocumentViewerShell({
  title,
  mimeType,
  children,
  onDownload,
}: DocumentViewerShellProps) {
  return (
    <div className="max-w-[640px] mx-auto">
      <div className="bg-surface-card border border-border-default rounded-2xl overflow-hidden">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-surface-card px-[18px] py-3.5 border-b border-border-default flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <FileTypeIcon mimeType={mimeType} size={16} className="text-brand-400 shrink-0" />
            <span className="text-sm font-medium text-primary truncate">{title}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="bg-brand-100 border border-brand-200 text-brand-500 text-xs font-medium rounded-full px-2.5 py-0.5">
              {getFileLabel(mimeType)}
            </span>
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-1.5 rounded-md hover:bg-surface-subtle transition-colors"
                aria-label="Download original file"
              >
                <FileDown size={16} className="text-text-secondary" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 md:p-6 min-h-[400px]">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/documents/document-viewer-shell.tsx
git commit -m "feat(frontend): add DocumentViewerShell shared component"
```

---

### Task 10: Create MarkdownViewer

**Files:**
- Create: `frontend/src/components/features/documents/markdown-viewer.tsx`

- [ ] **Step 1: Write component**

```tsx
"use client";

import { RichMarkdown } from "@/components/ui/rich-markdown";

interface MarkdownViewerProps {
  content: string;
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  return (
    <div className="prose-brand">
      <RichMarkdown content={content} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/documents/markdown-viewer.tsx
git commit -m "feat(frontend): add MarkdownViewer wrapping RichMarkdown + prose-brand"
```

---

### Task 11: Create TextViewer

**Files:**
- Create: `frontend/src/components/features/documents/text-viewer.tsx`
- Test: `frontend/src/components/features/documents/__tests__/text-viewer.test.tsx`

- [ ] **Step 1: Write component**

```tsx
"use client";

import { useState } from "react";
import { WrapText, Copy, Check } from "lucide-react";

interface TextViewerProps {
  content: string;
}

export function TextViewer({ content }: TextViewerProps) {
  const [wrap, setWrap] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = content.split("\n");

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2 mb-3">
        <button
          onClick={() => setWrap((w) => !w)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            wrap
              ? "bg-brand-100 text-brand-700"
              : "bg-surface-subtle text-text-secondary hover:bg-surface-overlay"
          }`}
          aria-pressed={wrap}
        >
          <WrapText size={14} />
          Wrap
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-surface-subtle text-text-secondary hover:bg-surface-overlay transition-colors"
        >
          {copied ? <Check size={14} className="text-success-500" /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Text content */}
      <div className="overflow-x-auto">
        <pre
          className={`font-mono text-sm text-primary leading-relaxed ${
            wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"
          }`}
        >
          {lines.map((line, i) => (
            <div key={i} className="table-row">
              <span className="table-cell text-xs text-text-tertiary select-none pr-4 text-right w-10">
                {i + 1}
              </span>
              <span className="table-cell">{line || " "}</span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write test**

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { TextViewer } from "../text-viewer";

describe("TextViewer", () => {
  it("renders content with line numbers", () => {
    render(<TextViewer content="Line 1\nLine 2" />);
    expect(screen.getByText("Line 1")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("toggles word wrap", () => {
    render(<TextViewer content="test" />);
    const wrapBtn = screen.getByRole("button", { name: /wrap/i });
    fireEvent.click(wrapBtn);
    expect(wrapBtn).toHaveAttribute("aria-pressed", "false");
  });
});
```

- [ ] **Step 3: Run test — expect PASS**

```bash
pnpm run test:run src/components/features/documents/__tests__/text-viewer.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/features/documents/text-viewer.tsx frontend/src/components/features/documents/__tests__/text-viewer.test.tsx
git commit -m "feat(frontend): add TextViewer with line numbers, wrap toggle, copy"
```

---

### Task 12: Create SlideViewer

**Files:**
- Create: `frontend/src/components/features/documents/slide-viewer.tsx`
- Test: `frontend/src/components/features/documents/__tests__/slide-viewer.test.tsx`

- [ ] **Step 1: Write component**

```tsx
"use client";

import { RichMarkdown } from "@/components/ui/rich-markdown";

interface Slide {
  number: number;
  title?: string;
  content: string;
}

interface SlideViewerProps {
  content: string;
}

function parseSlides(text: string): Slide[] {
  const slides: Slide[] = [];
  const parts = text.split(/--- Slide (\d+) ---/);

  // parts[0] is preamble before first slide marker, ignore if empty
  for (let i = 1; i < parts.length; i += 2) {
    const number = parseInt(parts[i], 10);
    const content = parts[i + 1] || "";
    // Try to extract a title from the first line
    const lines = content.trim().split("\n");
    const firstLine = lines[0]?.trim();
    const title = firstLine && !firstLine.startsWith("-") && !firstLine.startsWith("*") ? firstLine : undefined;
    const body = title ? lines.slice(1).join("\n").trim() : content.trim();

    slides.push({ number, title, content: body });
  }

  // Fallback: no slide markers found — treat entire text as one slide
  if (slides.length === 0 && text.trim()) {
    slides.push({ number: 1, content: text.trim() });
  }

  return slides;
}

function SlideCard({ slide }: { slide: Slide }) {
  return (
    <div className="bg-surface-subtle border border-border-default rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="bg-brand-100 text-brand-800 text-xs font-semibold rounded-full w-7 h-7 flex items-center justify-center shrink-0">
          {slide.number}
        </span>
        {slide.title && (
          <h3 className="text-base font-semibold text-primary">{slide.title}</h3>
        )}
      </div>
      <div className="prose-brand prose-sm">
        <RichMarkdown content={slide.content} />
      </div>
    </div>
  );
}

export function SlideViewer({ content }: SlideViewerProps) {
  const slides = parseSlides(content);

  return (
    <div className="space-y-6">
      {slides.map((slide) => (
        <SlideCard key={slide.number} slide={slide} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write test**

```tsx
import { render, screen } from "@testing-library/react";
import { SlideViewer } from "../slide-viewer";

describe("SlideViewer", () => {
  it("parses and renders slide markers", () => {
    const content = "--- Slide 1 ---\nTitle A\n- bullet\n\n--- Slide 2 ---\nTitle B\n- bullet 2";
    render(<SlideViewer content={content} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Title A")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Title B")).toBeInTheDocument();
  });

  it("falls back to single slide when no markers", () => {
    render(<SlideViewer content="Just some text" />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Just some text")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test — expect PASS**

```bash
pnpm run test:run src/components/features/documents/__tests__/slide-viewer.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/features/documents/slide-viewer.tsx frontend/src/components/features/documents/__tests__/slide-viewer.test.tsx
git commit -m "feat(frontend): add SlideViewer with slide-card layout for PPTX"
```

---

### Task 13: Update Document Detail Page to Branch by MIME Type

**Files:**
- Modify: `frontend/src/app/(app)/documents/[id]/page.tsx`

- [ ] **Step 1: Read current document detail page**

Read `frontend/src/app/(app)/documents/[id]/page.tsx` to understand the current `DocumentViewer` inline component and iframe usage.

- [ ] **Step 2: Refactor to branch by MIME type**

Replace the inline `DocumentViewer` component (or the iframe block) with:

```tsx
import { DocumentViewerShell } from "@/components/features/documents/document-viewer-shell";
import { MarkdownViewer } from "@/components/features/documents/markdown-viewer";
import { TextViewer } from "@/components/features/documents/text-viewer";
import { SlideViewer } from "@/components/features/documents/slide-viewer";

// Inside the main render, replace the iframe with:

function renderViewer(document: Document, signedUrl: string) {
  const shellProps = {
    title: document.title,
    mimeType: document.mime_type,
    onDownload: () => window.open(signedUrl, "_blank"),
  };

  switch (document.mime_type) {
    case "application/pdf":
      return <iframe src={signedUrl} className="w-full h-full min-h-[600px] rounded-lg" title={document.title} />;

    case "text/markdown":
      return (
        <DocumentViewerShell {...shellProps}>
          <MarkdownViewer content={document.extracted_text || "No content available"} />
        </DocumentViewerShell>
      );

    case "text/plain":
      return (
        <DocumentViewerShell {...shellProps}>
          <TextViewer content={document.extracted_text || "No content available"} />
        </DocumentViewerShell>
      );

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return (
        <DocumentViewerShell {...shellProps}>
          <MarkdownViewer content={document.extracted_text || "No content available"} />
        </DocumentViewerShell>
      );

    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return (
        <DocumentViewerShell {...shellProps}>
          <SlideViewer content={document.extracted_text || "No content available"} />
        </DocumentViewerShell>
      );

    default:
      return (
        <DocumentViewerShell {...shellProps}>
          <p className="text-sm text-text-secondary">Preview not available for this file type.</p>
        </DocumentViewerShell>
      );
  }
}
```

**Important:** The `document` object from Drizzle may not currently include `extracted_text`. Since the original file is in R2, we have two options:
1. Fetch the original file from R2 and extract text client-side (bad — exposes R2 logic)
2. Store `extracted_text` (or a `content_preview`) in the `documents` table during processing

**Decision for MVP:** We need to add an `extracted_text` column to the `documents` table, or fetch the raw file from R2 in the page component and extract text there. Given the backend already extracts text during processing, the cleanest approach is to store it.

**Alternative (faster):** In the document detail page, fetch the signed R2 URL and download the file bytes, then:
- For MD/TXT: read as text
- For DOCX/PPTX: show "Preview not available, download original" (since we can't run markitdown in browser)

This is not great UX. **Better:** Store `extracted_text` in DB.

---

### Task 13b: Add extracted_text Column to Documents Table

**Files:**
- Modify: `backend/src/db/models.py`
- Modify: `frontend/src/db/schema.ts`
- Create: Alembic migration

- [ ] **Step 1: Add column to SQLAlchemy model**

Read `backend/src/db/models.py`, find the `Document` class, add:

```python
extracted_text = Column(Text, nullable=True)
```

- [ ] **Step 2: Add column to Drizzle schema**

Read `frontend/src/db/schema.ts`, find the `documents` table, add:

```typescript
extractedText: text("extracted_text"),
```

- [ ] **Step 3: Generate Alembic migration**

```bash
cd backend
alembic revision --autogenerate -m "add_extracted_text_to_documents"
```

Review the generated migration file in `backend/alembic/versions/`.

- [ ] **Step 4: Run migration**

```bash
alembic upgrade head
```

- [ ] **Step 5: Update worker to save extracted_text**

Read `backend/src/worker.py`, find where the document status is set to `ready`. After text extraction succeeds, update:

```python
document.extracted_text = text
document.status = "ready"
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/db/models.py frontend/src/db/schema.ts backend/alembic/versions/*.py backend/src/worker.py
git commit -m "feat(db): add extracted_text column to documents table"
```

---

### Task 13c: Complete Document Detail Page Update

**Files:**
- Modify: `frontend/src/app/(app)/documents/[id]/page.tsx`

- [ ] **Step 1: Use the branching viewer with extracted_text**

Now that `document.extracted_text` is available from Drizzle, implement the `renderViewer` function from Task 13 and use it in the page's JSX where the iframe currently is.

- [ ] **Step 2: Run dev server and verify**

```bash
cd frontend
pnpm run dev
```

Open a document detail page for each file type and verify rendering.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/(app)/documents/[id]/page.tsx
git commit -m "feat(frontend): branch document viewer by mime type with custom viewers"
```

---

## Phase 4: Upload Dropzone Polish

### Task 14: Update Upload Dropzone

**Files:**
- Modify: `frontend/src/components/upload-dropzone.tsx`
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Read current dropzone**

Read `frontend/src/components/upload-dropzone.tsx` to find the `accept` config, validation logic, and progress bar.

- [ ] **Step 2: Update accept and validation**

Change the `accept` object in `useDropzone`:

```tsx
const { getRootProps, getInputProps, isDragActive } = useDropzone({
  accept: {
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
    "text/markdown": [".md"],
    "text/plain": [".txt"],
  },
  maxSize: 50 * 1024 * 1024,
  onDrop: (acceptedFiles) => {
    // Remove the hardcoded PDF check
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  },
});
```

Remove any manual `file.type !== "application/pdf"` check.

- [ ] **Step 3: Add file type chips**

Below the subtitle in the dropzone, add:

```tsx
<div className="flex justify-center gap-1.5 mt-4">
  {["PDF", "DOCX", "PPTX", "MD", "TXT"].map((type) => (
    <span
      key={type}
      className="bg-brand-500/[0.08] border border-brand-500/[0.2] rounded-full px-2.5 py-0.5 text-[11px] font-medium text-brand-500"
    >
      {type}
    </span>
  ))}
</div>
```

- [ ] **Step 4: Add CSS utilities for progress bar and radial glow**

Add to `frontend/src/app/globals.css`:

```css
@layer utilities {
  .progress-fill {
    background: linear-gradient(90deg, var(--color-brand-500), var(--color-brand-400));
  }

  .progress-glow::after {
    content: "";
    position: absolute;
    right: 0;
    top: -1px;
    width: 12px;
    height: 5px;
    background: white;
    opacity: 0.6;
    filter: blur(2px);
  }

  .dropzone-radial-glow::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(ellipse at 50% 0%, rgba(99, 102, 241, 0.06) 0%, transparent 70%);
  }
}
```

- [ ] **Step 5: Apply radial glow to dropzone**

Add `relative dropzone-radial-glow` classes to the dropzone container div.

- [ ] **Step 6: Replace progress bar with gradient + glow**

Find the progress bar fill div and change classes to include `progress-fill relative progress-glow`.

- [ ] **Step 7: Run dev server and test upload**

```bash
pnpm run dev
```

Try uploading each file type.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/upload-dropzone.tsx frontend/src/app/globals.css
git commit -m "feat(upload): accept docx/pptx/md/txt, add file chips, gradient progress, radial glow"
```

---

## Phase 5: Integration & QA

### Task 15: Regenerate OpenAPI Types

**Files:**
- Modify: `frontend/src/types/api.ts` (auto-generated)

- [ ] **Step 1: Start backend dev server**

```bash
cd backend
uvicorn src.main:app --reload
```

- [ ] **Step 2: Regenerate types**

```bash
cd frontend
pnpm run generate:api
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
pnpm run typecheck
```

(Or `pnpm run build` if `typecheck` script doesn't exist.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "chore(types): regenerate openapi types after backend changes"
```

---

### Task 16: Run Full Test Suite

**Files:**
- All test files

- [ ] **Step 1: Backend tests**

```bash
cd backend
pytest -v
```

Expected: All pass (including new extraction, retrieval, chat tests)

- [ ] **Step 2: Frontend tests**

```bash
cd frontend
pnpm run test:run
```

Expected: All pass (including new FileTypeIcon, TextViewer, SlideViewer tests)

- [ ] **Step 3: Lint checks**

```bash
cd backend
ruff check .
```

```bash
cd frontend
pnpm run lint
```

Expected: No errors

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "test: all tests passing, lint clean"
```

---

### Task 17: End-to-End Validation

- [ ] **Step 1: Upload each file type and verify processing**

| File Type | Upload Success | Status → Ready | Viewer Renders | Chat Works |
|---|---|---|---|---|
| PDF | ☐ | ☐ | ☐ | ☐ |
| DOCX | ☐ | ☐ | ☐ | ☐ |
| PPTX | ☐ | ☐ | ☐ | ☐ |
| MD | ☐ | ☐ | ☐ | ☐ |
| TXT | ☐ | ☐ | ☐ | ☐ |

- [ ] **Step 2: Test RAG broad query**

Upload a multi-page document with a section listing "types of X". Ask "explain the different types of X". Verify the chat no longer says "not explained in the text".

- [ ] **Step 3: Regression test existing features**

- PDF upload still works
- Summary generation still works
- Quiz generation still works
- Chat with existing PDFs still works

- [ ] **Step 4: Mark spec success criteria complete**

Update this checklist in the spec document or in a comment:

```markdown
- [x] User can upload DOCX, PPTX, MD, TXT through the dropzone
- [x] Each file type is processed into chunks and embedded within 60 seconds
- [x] Each file type renders in a readable viewer matching design.md specs
- [x] RAG chat answers broad "explain the types of..." questions correctly
- [x] No regressions in existing PDF upload, summary, quiz, or chat
- [x] All tests pass: pytest + pnpm run test:run
- [x] Lint clean: ruff check . + pnpm run lint
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** Every requirement in the spec maps to at least one task above.
- [ ] **Placeholder scan:** No "TBD", "TODO", "implement later", "fill in details", "add validation", "similar to Task N".
- [ ] **Type consistency:** `extract_text` function name, `mime_type` vs `mimeType`, `FileTypeIcon` props, `DocumentViewerShell` props are consistent across all tasks.
- [ ] **File paths:** All paths are exact and exist in the codebase per explore agent findings.
- [ ] **Test coverage:** Every backend change has a test. Every new frontend component has a test.
- [ ] **Commit granularity:** Each task ends with a commit. No task spans multiple unrelated concerns.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-03-additional-file-support-and-rag-fixes.md`.**

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach would you like?**
