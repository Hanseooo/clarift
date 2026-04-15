# 🚀 Clarift Quickstart Guide

**Get Clarift running on your laptop in minutes.**
No deep dive—just the fastest, friendliest path from `git clone` to "Sign in with Google" live! For technical docs, see `/docs/dev/`.

---

## 1. Project Structure—What's Where?
- `frontend/` – Next.js 15, React, TypeScript UI (runs on Node)
- `backend/` – FastAPI, async Python, all AI/DB/API logic
- `.env.example` – Copy these templates to setup secrets/URLs

---

## 2. Environment Variables—The Only Required Setup

### Clerk Auth
- Go to https://dashboard.clerk.com → API Keys. Copy:
    - **Publishable Key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (frontend), `CLERK_PUBLISHABLE_KEY` (backend)
    - **Secret Key** → `CLERK_SECRET_KEY` (both)
- Set inside:
    - `/frontend/.env.local` and `/backend/.env` (see the exact format in `.env.example`)
    - _Fill in other DB, Redis, and API keys as directed below._

### Database: Postgres
- [ ] **Neon:** [neon.tech](https://neon.tech/) → Free Postgres DB. Copy its connection string to `DATABASE_URL` in both backends/frontends as required.
- [ ] **Local:** Want it all local? Use:
    ```bash
    docker run -d -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=clariftdb postgres
    ```
- [ ] **Supabase:** [supabase.com](https://supabase.com/) → Free Postgres hosting, works out of the box for testing.

### Redis: Cache & Queue

#### 🥇 Quickest—Docker One-Liner
```bash
docker run -d -p 6379:6379 redis
```
Your local Redis instance is now at `redis://localhost:6379`. Add this to your `.env`.

#### 🥈 Upstash (Cloud Redis)
- [upstash.com](https://upstash.com/): Free, cloud Redis. Copy URL to `REDIS_URL` in `.env`.
- Downsides: Needs internet, slight latency boost—great for minimal local setup!

#### 🔥 Pro—Docker Compose
For a more robust setup (especially if running both Postgres & Redis locally):
```yaml
version: "3.8"
services:
  postgres:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: clariftdb
  redis:
    image: redis:7
    ports:
      - "6379:6379"
```
Run with:
```bash
docker-compose up -d
```

---

## 3. Frontend: Next.js (Node) – Super Fast Start

### Install dependencies:
```bash
cd frontend
pnpm install    # recommended (faster)
# or:
npm install
# or: yarn install
# or: bun install
```

### Start the dev server (choose your favorite):
```bash
pnpm dev       # (recommended)
npm run dev
yarn dev
bun dev
```
- App now live at [http://localhost:3000](http://localhost:3000)
- You should see the Clarift login screen. Sign in with Google via Clerk!

---

## 4. Backend: FastAPI (Python, async)

### Install dependencies
```bash
cd backend
uv sync        # fastest, preferred (installs from uv.lock)
# If you don't have uv, use:
# python -m venv .venv
# .venv\Scripts\activate      # (Windows) OR source .venv/bin/activate (Mac/Linux)
# pip install -r requirements.txt
```

### Apply database migrations
```bash
uv run alembic upgrade head    # (runs on uv environment)
# or, if using venv:
alembic upgrade head
```

### Start the backend API server:
```bash
uv run uvicorn main:app --reload     # (recommended)
# or (with Python virtualenv):
uvicorn main:app --reload
```
- API now live at [http://localhost:8000](http://localhost:8000)
- Check it’s up: open `/health` in your browser or run:
  ```bash
  curl http://localhost:8000/health
  ```
  Should return `{ "status": "ok" }`

### Optional: Run background jobs/worker
If you need async document processing (not MVP testing):
```bash
uv run arq src.workers.WorkerSettings
```

---

## 5. Sign In and Test!
- Go to [http://localhost:3000](http://localhost:3000) in your browser
- Click "Sign in with Google" – complete via Clerk
- You should be redirected to the Dashboard with your Google email
- (Optional: Upload docs and check workflow)

---

## 6. Troubleshooting
- **Clerk keys invalid/empty?** Check the API key section in Clerk dashboard.
- **Redis/DB connection refused?** Make sure Docker containers are running OR use correct Upstash/Neon URLs.
- **Migrations fail?** Ensure Postgres is running and your `.env` is populated. Try `alembic revision --autogenerate` only for schema changes (not first-run).
- **Frontend blank?** Check your terminal/logs, confirm `pnpm dev`/`uvicorn` are running, and that env files are filled.
- **Still stuck?** See `/docs/dev/` or ask in your dev chat/support channel!

---

## 7. What's Next?
Want to see how things work under the hood? Check:
- `/docs/dev/stack-setup.md` for the original Day 1 power user guide
- `/docs/dev/` index for feature specs and system architecture
- `/frontend/README.md` and `/backend/README.md` if available

---

**Congratulations! You're live. 🥳**
