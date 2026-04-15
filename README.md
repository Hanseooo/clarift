# Clarift

Clarift is an AI-powered study engine built specifically for Filipino students and review center learners. It transforms uploaded study material into structured summaries, quizzes, and targeted practice through an active learning loop designed for high-stakes exams.

---

## Core Features

- **Document Ingestion**: Upload PDFs, images, or text files as study material
- **Structured Summaries**: Multi-step AI chain generates comprehensive summaries with MermaidJS diagrams
- **Quiz Generation**: Auto-generated quizzes strictly from uploaded material to test understanding
- **Weak Area Diagnosis**: System identifies knowledge gaps based on quiz performance
- **Targeted Practice**: Personalized practice drills focused on specific weak topics
- **Grounded RAG Chat**: AI chat that answers exclusively from uploaded notes, never from general knowledge
- **Quota System**: Daily usage limits with free tier (3 summaries, 3 quizzes, 1 practice per day) and Pro tier (expanded limits)
- **Subscription Payments**: PayMongo integration for GCash and credit card subscriptions

---

## Architecture

Clarift uses a split architecture with two distinct server-side layers sharing a single Neon PostgreSQL database.

### Layer Responsibilities

**Next.js (Frontend)**
- UI rendering via Server Components and Server Actions
- CRUD operations using Drizzle ORM
- Authentication via Clerk (Google OAuth)
- Quota display and usage tracking
- Location: `frontend/src/`

**FastAPI (Backend)**
- AI/LangChain pipelines for summaries, quizzes, and practice generation
- Async job processing via ARQ worker
- File storage to Cloudflare R2
- Quota enforcement (authoritative)
- Location: `backend/app/`

### Data Flow

1. **Auth**: Clerk handles OAuth; JWT verified by FastAPI for protected API calls
2. **Document Processing**: Client uploads file -> FastAPI stores to R2 -> ARQ worker processes (extract, chunk, embed, store in pgvector) -> SSE progress updates
3. **AI Generation**: Client triggers generation -> FastAPI enforces quota -> ARQ worker executes LangChain chain with Gemini -> results stored in DB -> SSE notifies completion

### Key Patterns

- Route -> Service -> Chain: Strict separation in backend AI features
- Server Component + Server Action: Direct DB access for CRUD in frontend
- SSE Job Tracking: Real-time progress for async operations

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16.2.3 (App Router)
- **Language**: TypeScript 5.x
- **UI**: React 19.2.4, Tailwind CSS 4.2.2, shadcn/ui, Radix UI, Lucide React
- **Database**: Drizzle ORM with @neondatabase/serverless
- **Auth**: Clerk (Google OAuth)
- **State**: TanStack React Query v5

### Backend
- **Framework**: FastAPI 0.135.3+
- **Language**: Python 3.12
- **AI**: LangChain + LangChain Google GenAI + Gemini API
- **Database**: SQLAlchemy async + Alembic (migrations)
- **Vector Search**: pgvector (Neon PostgreSQL)
- **Queue**: ARQ (async Redis via Upstash)
- **Storage**: Cloudflare R2 (S3-compatible)

### Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Railway (web + worker services)
- **Database**: Neon PostgreSQL
- **Cache/Queue**: Upstash Redis

---

## Getting Started

### Prerequisites

- Node.js >= 20
- Python 3.12
- pnpm (frontend package manager)
- uv (Python package manager)
- Neon PostgreSQL database with pgvector extension
- Upstash Redis instance
- Clerk account with Google OAuth enabled
- Gemini API key

### Backend Setup

```bash
cd backend

# Create virtual environment with uv
uv venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
uv pip install -r requirements.txt -r requirements-dev.txt

# Copy and configure environment
cp .env.example .env
# Fill in .env with your credentials

# Enable pgvector on Neon database
CREATE EXTENSION IF NOT EXISTS vector;

# Run migrations
alembic upgrade head

# Start the backend server
uvicorn app.main:app --reload
# Backend runs at http://localhost:8000
# API docs available at http://localhost:8000/docs
```

### ARQ Worker Setup

In a separate terminal:
```bash
cd backend
source .venv/bin/activate
arq app.workers.WorkerSettings
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env.local
# Fill in .env.local with your credentials

# Start the development server
npm run dev
# Frontend runs at http://localhost:3000
```

### Generate API Types

Once the backend is running:
```bash
cd frontend
npm run generate:api
```

This generates `src/types/api.ts` from the backend OpenAPI spec.

---

## Verification Commands

```bash
# Backend health check
curl http://localhost:8000/health

# Backend tests
cd backend && pytest

# Frontend tests
cd frontend && npm run test

# Frontend linting
cd frontend && npm run lint

# Backend linting
cd backend && ruff check .
```

---

## Environment Variables

### Backend (.env)

```
DATABASE_URL=postgresql+asyncpg://user:pass@host/clarift
REDIS_URL=redis://default:token@host:port
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
GEMINI_API_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=clarift-uploads
PAYMONGO_SECRET_KEY=
PAYMONGO_WEBHOOK_SECRET=
SENTRY_DSN=
```

### Frontend (.env.local)

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
DATABASE_URL=postgresql://user:pass@host/clarift?sslmode=require
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Project Structure

```
clarift/
├── frontend/               # Next.js application
│   ├── src/
│   │   ├── app/           # App Router pages and layouts
│   │   ├── components/    # React components (ui + features)
│   │   ├── db/            # Drizzle schema and actions
│   │   ├── hooks/         # React Query hooks
│   │   └── types/         # Generated API types
│   └── package.json
│
├── backend/               # FastAPI application
│   ├── app/
│   │   ├── api/v1/       # Routes, schemas
│   │   ├── chains/       # LangChain chain implementations
│   │   ├── core/         # Config, exceptions
│   │   ├── db/           # SQLAlchemy models, session
│   │   ├── services/     # Business logic services
│   │   ├── storage/      # Cloudflare R2 integration
│   │   └── workers/     # ARQ job workers
│   ├── alembic/          # Database migrations
│   └── pyproject.toml
│
├── .planning/            # Project planning docs
└── docs/dev/            # Development documentation
```

---

## Documentation

- [Development Documentation](docs/dev/README.md) - Full developer guide
- [Architecture](docs/dev/architecture.md) - System design details
- [Master Spec](docs/dev/master-spec.md) - Stack, schema, API contract
- [Stack Setup](docs/dev/stack-setup.md) - Complete setup guide
- [Modularity Guidelines](docs/dev/modularity-guidelines.md) - Code structure rules