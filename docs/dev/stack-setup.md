# Stack Setup

> Day 1 initialization guide. Run these commands exactly.  
> This document is for humans and agents setting up the project from scratch.  
> See [`architecture.md`](./architecture.md) for the system design context.
> 
> **Note:** Frontend development with Clarift REQUIRES `pnpm` as the package manager. Do not use `npm` or `yarn`. All actionable install and script commands below now use `pnpm`.

---

## Prerequisites

Ensure these are installed before starting:

```bash
node --version    # >= 20
python --version  # >= 3.11
git --version

# Install uv (fast Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Railway CLI (for deployment)
npm install -g @railway/cli

# Install Vercel CLI
npm install -g vercel
```

---

## 1. Repository Structure

```bash
mkdir clarift && cd clarift
git init
touch .gitignore
```

`.gitignore`:
```
# Python
__pycache__/
*.pyc
.venv/
.env

# Node
node_modules/
.next/
.env.local

# Misc
.DS_Store
*.log
```

---

## 2. Backend Setup (FastAPI)

> **WARNING:** Never install Python packages globally. Always use a local virtual environment (e.g., `.venv` — recommended: `uv`).

```bash
mkdir backend && cd backend

# Create virtual environment with uv
uv venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Create requirements.txt
cat > requirements.txt << 'EOF'
fastapi
uvicorn[standard]
pydantic[email]>=2.0
python-multipart
sqlalchemy[asyncio]
asyncpg
alembic
pgvector
arq
redis[hiredis]
langchain
langchain-google-genai
google-generativeai
pymupdf
tiktoken
boto3
python-magic
python-jose[cryptography]
httpx
python-dotenv
tenacity
slowapi
upstash-ratelimit
sentry-sdk[fastapi]
EOF

cat > requirements-dev.txt << 'EOF'
pytest
pytest-asyncio
pytest-cov
httpx
factory-boy
ruff
EOF

uv pip install -r requirements.txt -r requirements-dev.txt
```

> **If `uv` is not available, fallback (inside .venv):**
> ```bash
> pip install -r requirements.txt -r requirements-dev.txt
> ```

### FastAPI Project Structure

```bash
mkdir -p app/api/v1/routes
mkdir -p app/api/v1/schemas
mkdir -p app/core
mkdir -p app/services
mkdir -p app/chains
mkdir -p app/workers
mkdir -p app/db
mkdir -p app/storage
mkdir -p tests

# Create __init__.py files
find app -type d -exec touch {}/__init__.py \;
touch tests/__init__.py
```

### Core Files

`app/core/config.py`:
```python
from pydantic_settings import BaseSettings
from typing import Literal

class Settings(BaseSettings):
    # App
    APP_ENV: Literal["development", "production"] = "development"
    SECRET_KEY: str

    # Database
    DATABASE_URL: str  # asyncpg format: postgresql+asyncpg://...

    # Redis
    REDIS_URL: str

    # Auth
    CLERK_SECRET_KEY: str
    CLERK_PUBLISHABLE_KEY: str

    # Gemini
    GEMINI_API_KEY: str

    # R2
    R2_ACCOUNT_ID: str
    R2_ACCESS_KEY_ID: str
    R2_SECRET_ACCESS_KEY: str
    R2_BUCKET_NAME: str

    # PayMongo
    PAYMONGO_SECRET_KEY: str
    PAYMONGO_WEBHOOK_SECRET: str

    # Sentry
    SENTRY_DSN: str = ""

    # Feature constants
    CHAT_FALLBACK_MESSAGE: str = (
        "I cannot find this in your uploaded notes. "
        "Try asking about a different topic, or check if you've uploaded the relevant material."
    )
    CHAT_SYSTEM_PROMPT: str = (
        "You are a study assistant. Answer ONLY using the provided context from the student's "
        "uploaded notes. Never use knowledge outside the context. Always cite the source. "
        "If the context does not contain the answer, use the fallback message exactly."
    )
    CHAT_WINDOW_SECONDS: int = 18000  # 5 hours

    class Config:
        env_file = ".env"

settings = Settings()
```

`app/core/exceptions.py`:
```python
from fastapi import HTTPException

class QuotaExceededException(Exception):
    def __init__(self, feature: str, used: int, limit: int, reset_at=None):
        self.feature = feature
        self.used = used
        self.limit = limit
        self.reset_at = reset_at

class DocumentNotReadyException(Exception):
    def __init__(self, document_id: str):
        self.document_id = document_id

class GenerationFailedException(Exception):
    def __init__(self, message: str):
        self.message = message

class ChatQuotaExceededException(Exception):
    def __init__(self, reset_in_seconds: int):
        self.reset_in_seconds = reset_in_seconds
```

`app/main.py`:
```python
import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.exceptions import QuotaExceededException, DocumentNotReadyException
from app.api.v1.routes import auth, documents, summaries, quizzes, practice, chat, jobs

if settings.SENTRY_DSN:
    sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1)

app = FastAPI(title="Clarift API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://clarift.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
@app.exception_handler(QuotaExceededException)
async def quota_handler(request: Request, exc: QuotaExceededException):
    return JSONResponse(status_code=429, content={
        "error": {
            "code": "QUOTA_EXCEEDED",
            "message": f"You've used all {exc.limit} {exc.feature} today. Upgrade to Pro for more.",
            "details": {
                "feature": exc.feature,
                "used": exc.used,
                "limit": exc.limit,
                "reset_at": exc.reset_at.isoformat() if exc.reset_at else None,
            }
        }
    })

@app.exception_handler(DocumentNotReadyException)
async def doc_not_ready_handler(request: Request, exc: DocumentNotReadyException):
    return JSONResponse(status_code=409, content={
        "error": {"code": "DOCUMENT_NOT_READY", "message": "Document is still processing."}
    })

# Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["documents"])
app.include_router(summaries.router, prefix="/api/v1/summaries", tags=["summaries"])
app.include_router(quizzes.router, prefix="/api/v1/quizzes", tags=["quizzes"])
app.include_router(practice.router, prefix="/api/v1/practice", tags=["practice"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["jobs"])

@app.get("/health")
async def health():
    return {"status": "ok"}
```

`app/db/session.py`:
```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```

### Alembic Init

```bash
cd backend
alembic init alembic

# Edit alembic/env.py to use async engine + import your models
# Set sqlalchemy.url in alembic.ini to use DATABASE_URL from env
```

`alembic/env.py` (key section):
```python
from app.db.models import Base
from app.core.config import settings

config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
target_metadata = Base.metadata
```

Create initial migration:
```bash
alembic revision --autogenerate -m "initial_schema"
alembic upgrade head
```

**Enable pgvector before running migrations:**
```sql
-- Run this once on your Neon database
CREATE EXTENSION IF NOT EXISTS vector;
```

### Environment File

`.env`:
```bash
APP_ENV=development
SECRET_KEY=generate-a-random-secret-here

# Neon PostgreSQL (use asyncpg driver)
DATABASE_URL=postgresql+asyncpg://user:pass@host/clarift

# Upstash Redis
REDIS_URL=redis://default:token@host:port

# Clerk auth
CLERK_SECRET_KEY=your-clerk-secret-key
CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key

# Gemini
GEMINI_API_KEY=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=clarift-uploads

# PayMongo
PAYMONGO_SECRET_KEY=sk_test_
PAYMONGO_WEBHOOK_SECRET=whsk_

# Sentry (optional for dev)
SENTRY_DSN=
```

### Ruff Configuration

`pyproject.toml`:
```toml
[tool.ruff]
line-length = 100
select = ["E", "F", "I", "N", "W"]
ignore = ["E501"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

---

## 3. Frontend Setup (Next.js)

```bash
cd ../  # back to clarift/
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-eslint  # we use biome instead

cd frontend
```

### Install Dependencies

```bash
# Auth
pnpm add @clerk/nextjs

# Database
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit

# Data fetching
pnpm add @tanstack/react-query axios

# API type contract
pnpm add openapi-fetch
pnpm add -D openapi-typescript

# Forms + validation
pnpm add react-hook-form zod

# Markdown rendering
pnpm add react-markdown remark-math rehype-katex rehype-highlight katex highlight.js

# API types (generated)
# Do NOT install manually — generated by script

# shadcn/ui
npx shadcn@latest init
# Choose: Default style, Neutral base color, CSS variables: yes

# Install common shadcn components
npx shadcn@latest add button card input label toast progress badge separator skeleton tabs

# Testing
pnpm add -D vitest @testing-library/react @testing-library/user-event \
  @vitejs/plugin-react msw

# Linting
pnpm add -D @biomejs/biome
npx biome init
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "generate:api": "openapi-typescript http://localhost:8000/openapi.json -o src/types/api.ts",
    "lint": "biome check .",
    "format": "biome format --write ."
  }
}
```

### Drizzle Config

`drizzle.config.ts`:
```typescript
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // IMPORTANT: Never run push or generate against production
  // Alembic owns all migrations
})
```

### Vitest Config

`vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
})
```

`src/tests/setup.ts`:
```typescript
import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"
import { server } from "./mocks/server"

beforeAll(() => server.listen())
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
```

### Environment File

`.env.local`:
```bash
# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard

# Database (same Neon DB — Next.js uses direct serverless connection)
DATABASE_URL=postgresql://user:pass@host/clarift?sslmode=require

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000

# PayMongo
PAYMONGO_SECRET_KEY=sk_test_
PAYMONGO_WEBHOOK_SECRET=whsk_
PAYMONGO_PUBLIC_KEY=pk_test_
```

Note: The frontend `DATABASE_URL` uses the standard PostgreSQL driver (not asyncpg). Neon's `@neondatabase/serverless` handles this.

### Biome Config

`biome.json`:
```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "trailingCommas": "es5"
    }
  }
}
```

---

## 4. Git Hooks

```bash
cd clarift/  # monorepo root

npm init -y
pnpm add -D husky lint-staged
npx husky init

# Pre-commit hook
cat > .husky/pre-commit << 'EOF'
cd frontend && npx lint-staged
cd ../backend && ruff check . && ruff format --check .
EOF
```

`frontend/package.json` — add lint-staged config:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["biome check --apply"]
  }
}
```

---

## 5. Generate API Types (After Backend Runs)

Once FastAPI is running locally:

```bash
cd frontend
pnpm run generate:api
```

This outputs `src/types/api.ts`. Commit this file. Re-run whenever backend routes change.

---

## 6. Verify Everything Works

```bash
# Terminal 1: Backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
# → http://localhost:8000/health should return {"status":"ok"}
# → http://localhost:8000/docs should show Swagger UI

# Terminal 2: ARQ Worker
cd backend
source .venv/bin/activate
arq app.workers.WorkerSettings

# Terminal 3: Frontend
cd frontend
pnpm run dev
# → http://localhost:3000 should load

# Generate types
cd frontend
pnpm run generate:api
# → src/types/api.ts should be created
```

---

## 7. Neon Database Setup

1. Create project at [neon.tech](https://neon.tech)
2. Create database named `clarift`
3. Enable pgvector: run `CREATE EXTENSION IF NOT EXISTS vector;` in Neon SQL editor
4. Copy connection string (use **pooled** connection for the app, **direct** connection for Alembic migrations)
5. Set `DATABASE_URL` in both `.env` (backend, asyncpg format) and `.env.local` (frontend, standard PostgreSQL format)

**Backend DATABASE_URL format:**
```
postgresql+asyncpg://user:pass@host/clarift
```

**Frontend DATABASE_URL format:**
```
postgresql://user:pass@host/clarift?sslmode=require
```

**Alembic migration connection (direct, not pooled):**
```
postgresql+asyncpg://user:pass@direct-host/clarift
```

---

## 8. Cloudflare R2 Setup

1. Create R2 bucket named `clarift-uploads` in Cloudflare dashboard
2. Create R2 API token with Object Read & Write permissions
3. Set bucket CORS policy to allow uploads from your frontend domain:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://clarift.app"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"]
  }
]
```

4. Set R2 credentials in backend `.env`

---

## 9. Upstash Redis Setup

1. Create Redis database at [upstash.com](https://upstash.com)
2. Copy REST URL and token
3. Set `REDIS_URL` in backend `.env`

ARQ uses the standard Redis protocol. Upstash supports this natively.

---

## 10. Railway Deployment Setup

```bash
railway login
railway init  # inside backend/
```

Create two services from the same backend repo:

**Web service** (FastAPI):
```bash
# Start command
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Worker service** (ARQ):
```bash
# Start command
arq app.workers.WorkerSettings
```

Both services use the same Docker image — Railway builds once, runs with different start commands.

`backend/Dockerfile`:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y libmagic1 && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
```
