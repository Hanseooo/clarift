# Master Specification

> This document is the single source of truth for how Clarift is built. Feature specs in [`features/`](./features/) extend this document. Architecture details in [`architecture.md`](./architecture.md).

---

## Tech Stack

### Frontend

| Package | Version | Purpose |
|---|---|---|
| `next` | 15 (App Router) | Framework |
| `typescript` | 5.x | Type safety |
| `tailwindcss` | 4.x | Styling |
| `shadcn/ui` | latest | Component library |
| `@clerk/nextjs` | latest | Auth (Google OAuth via Clerk) |
| `@tanstack/react-query` | v5 | Server state + SSE polling |
| `axios` | latest | HTTP client with interceptors |
| `drizzle-orm` | latest | Database queries (CRUD only) |
| `@neondatabase/serverless` | latest | Neon connection driver |
| `react-markdown` | latest | Markdown rendering |
| `remark-math` | latest | Math syntax parsing |
| `rehype-katex` | latest | Math rendering |
| `rehype-highlight` | latest | Code syntax highlighting |
| `katex` | latest | Peer dep for rehype-katex |
| `highlight.js` | latest | Peer dep for rehype-highlight |
| `mermaid` | latest | Diagram rendering from AI-generated syntax |
| `openapi-typescript` | latest | Generate types from OpenAPI spec |
| `openapi-fetch` | latest | Typed API client |
| `react-hook-form` | latest | Form management |
| `zod` | latest | Schema validation |
| `vitest` | latest | Unit testing |
| `@testing-library/react` | latest | Component testing |
| `msw` | v2 | API mocking in tests |
| `biome` | latest | Linting + formatting |

### Backend

| Package | Version | Purpose |
|---|---|---|
| `fastapi` | latest | Framework |
| `uvicorn[standard]` | latest | ASGI server (includes uvloop) |
| `pydantic` | v2 | Validation |
| `python-multipart` | latest | File upload handling |
| `sqlalchemy[asyncio]` | latest | Async ORM |
| `asyncpg` | latest | Async PostgreSQL driver |
| `alembic` | latest | Migrations (source of truth) |
| `pgvector` | latest | pgvector Python client |
| `arq` | latest | Async job queue |
| `redis[hiredis]` | latest | ARQ dependency |
| `langchain` | latest | Multi-step chains only |
| `langchain-google-genai` | latest | Gemini via LangChain |
| `google-generativeai` | latest | Direct Gemini SDK |
| `pymupdf` | latest | PDF text extraction |
| `tiktoken` | latest | Token counting for chunking |
| `boto3` | latest | Cloudflare R2 (S3-compatible) |
| `python-magic` | latest | MIME type validation |
| `python-jose[cryptography]` | latest | JWT verification |
| `httpx` | latest | Async HTTP client |
| `python-dotenv` | latest | Environment variables |
| `tenacity` | latest | Retry logic for Gemini calls |
| `slowapi` | latest | Rate limiting |
| `upstash-ratelimit` | latest | Upstash Redis rate limiting |
| `pytest` | latest | Testing |
| `pytest-asyncio` | latest | Async test support |
| `pytest-cov` | latest | Coverage |
| `factory-boy` | latest | Test data factories |
| `ruff` | latest | Linting + formatting |

---

## Database Schema

> Alembic owns all migrations. Drizzle schema must stay in sync. See [`decisions.md`](./decisions.md#alembic-owns-all-migrations).

```sql
-- Users
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  image       TEXT,
  tier        TEXT NOT NULL DEFAULT 'free', -- free | pro
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User preferences (onboarding)
CREATE TABLE user_preferences (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  output_format        TEXT NOT NULL DEFAULT 'bullet',       -- bullet | step-by-step | example-first
  explanation_style    TEXT NOT NULL DEFAULT 'simple',       -- mental-models | simple | detailed | eli5
  custom_instructions  TEXT NOT NULL DEFAULT '',             -- max 500 characters
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents
CREATE TABLE documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  r2_key      TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | processing | ready | failed
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Document chunks with vector embeddings
CREATE TABLE document_chunks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  embedding     vector(768),
  chunk_index   INTEGER NOT NULL,
  token_count   INTEGER NOT NULL,
  content_hash  TEXT NOT NULL -- SHA-256 for deduplication
);

-- Generated summaries
CREATE TABLE summaries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  format          TEXT NOT NULL,   -- bullet | step-by-step | example-first
  content         TEXT NOT NULL,
  diagram_syntax  TEXT,            -- NULL if no diagram generated
  diagram_type    TEXT,            -- flowchart | sequence | graph | mindmap | NULL
  quiz_type_flags JSONB,           -- applicability flags per question type, NULL until analyzed
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generated quizzes
CREATE TABLE quizzes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  questions       JSONB NOT NULL,
  question_types  TEXT[] NOT NULL, -- which types were included in this quiz
  question_count  INTEGER NOT NULL,
  auto_mode       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quiz attempts
CREATE TABLE quiz_attempts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id     UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers     JSONB NOT NULL,
  score       NUMERIC(5,2) NOT NULL, -- percentage 0–100
  topics      TEXT[] NOT NULL,       -- topics covered in this attempt
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-topic performance tracking
CREATE TABLE user_topic_performance (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic        TEXT NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  correct      INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic)
);

-- Quota tracking
CREATE TABLE user_usage (
  user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  summaries_used INTEGER NOT NULL DEFAULT 0,
  quizzes_used   INTEGER NOT NULL DEFAULT 0,
  practice_used  INTEGER NOT NULL DEFAULT 0,
  reset_at       TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

-- Practice sessions
CREATE TABLE practice_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weak_topics  TEXT[] NOT NULL,
  drills       JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ARQ job tracking (for SSE)
CREATE TABLE jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,   -- document_process | summary | quiz | practice
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | running | complete | failed
  result      JSONB,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_document_chunks_user_id ON document_chunks(user_id);
CREATE INDEX idx_document_chunks_hash ON document_chunks(content_hash);
CREATE INDEX idx_summaries_user_id ON summaries(user_id);
CREATE INDEX idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX idx_user_topic_performance_user_id ON user_topic_performance(user_id);
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);

-- pgvector index
CREATE INDEX idx_document_chunks_embedding
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops);
```

---

## API Contract

> FastAPI generates `/openapi.json` automatically. Frontend types are generated from this. Never maintain types manually.

### Base URL
- Development: `http://localhost:8000`
- Production: `https://api.clarift.app`

### Authentication
All endpoints except `/api/v1/auth/*` require:
```
Authorization: Bearer <clerk_jwt>
```

### Endpoints

```
POST   /api/v1/auth/sync                    # Upsert user from Clerk-authenticated frontend flow
GET    /api/v1/auth/me                      # Current user + tier

POST   /api/v1/documents/upload             # Upload file → { job_id, document_id }
GET    /api/v1/documents                    # List user documents
GET    /api/v1/documents/{id}               # Get document details
DELETE /api/v1/documents/{id}               # Delete document + chunks

GET    /api/v1/jobs/{job_id}/stream         # SSE stream for job status

POST   /api/v1/summaries                    # { document_id } → { job_id }
GET    /api/v1/summaries/{document_id}      # Get summary for document

POST   /api/v1/quizzes                      # { document_id } → { job_id }
GET    /api/v1/quizzes/{id}                 # Get quiz
POST   /api/v1/quizzes/{id}/attempt         # Submit answers → { score, weak_topics }

GET    /api/v1/practice/weak-areas          # Get weak topics for user
POST   /api/v1/practice                     # { topics[] } → { job_id }
GET    /api/v1/practice/{id}                # Get practice session

POST   /api/v1/chat                         # SSE stream — { message, document_ids[] }

GET    /api/v1/usage                        # Current usage vs limits
```

---

## Quota Limits

```python
QUOTA_LIMITS = {
    "free": {
        "summaries": 3,       # per day
        "quizzes": 3,         # per day
        "practice": 1,        # per day
        "chat_per_window": 20,
    },
    "pro": {
        "summaries": 10,      # per day
        "quizzes": 15,        # per day
        "practice": 10,       # per day
        "chat_per_window": 100,
    }
}
```

---

## AI Models

| Use Case | Model | Why |
|---|---|---|
| Summary chain | `gemini-2.5-flash` | Multi-step, quality matters |
| Quiz chain | `gemini-2.5-flash` | Factual accuracy required |
| Practice chain | `gemini-2.5-flash` | Targeted generation |
| Embeddings | `models/embedding-001` | Gemini native embedding |
| Chat | `gemini-flash-lite` | Cost efficiency, single turn |
| Image extraction | `gemini-2.5-flash` (vision) | File type handling |

---

## Quiz JSON Schema

```json
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "question": "What is...",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A",
      "topic": "Pharmacology",
      "explanation": "Because..."
    },
    {
      "id": "q2",
      "type": "true_false",
      "question": "Is X true?",
      "correct_answer": true,
      "topic": "Anatomy",
      "explanation": "..."
    },
    {
      "id": "q3",
      "type": "fill_blank",
      "question": "The ___ is responsible for...",
      "correct_answer": "liver",
      "topic": "Physiology",
      "explanation": "..."
    }
  ]
}
```

---

## SSE Event Schema

```
event: progress
data: {"step": "extracting|chunking|embedding|generating", "pct": 0-100, "message": "..."}

event: complete
data: {"job_id": "...", "result_id": "...", "type": "document|summary|quiz|practice"}

event: error
data: {"message": "...", "code": "EXTRACTION_FAILED|QUOTA_EXCEEDED|..."}
```

---

## Error Response Schema

```json
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "You've used all 3 summaries today. Upgrade to Pro for more.",
    "details": {
      "feature": "summaries",
      "used": 3,
      "limit": 3,
      "reset_at": "2026-04-16T00:00:00Z"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `QUOTA_EXCEEDED` | 429 | User has hit feature limit |
| `DOCUMENT_NOT_READY` | 409 | Document still processing |
| `DOCUMENT_NOT_FOUND` | 404 | Document doesn't exist or wrong user |
| `INVALID_FILE_TYPE` | 422 | Unsupported file format |
| `FILE_TOO_LARGE` | 413 | Exceeds 10MB limit |
| `EXTRACTION_FAILED` | 500 | Could not extract text |
| `GENERATION_FAILED` | 500 | AI chain failed after retries |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |

---

## Content Security Rules

These are enforced in every chain, not as post-processing:

1. All generated content must be sourced from retrieved chunks only
2. Chunk retrieval always filters by `user_id` before similarity search
3. Chat responses must cite the source chunk
4. If a question cannot be answered from chunks: respond with the defined fallback message
5. Maximum 5 chunks per LLM context window
6. Full documents are never passed to the LLM
