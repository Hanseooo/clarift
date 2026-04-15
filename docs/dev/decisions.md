# Decisions

> Architectural and technology decisions with rationale. When a future agent or developer asks "why are we doing it this way?", the answer is here.

---

## Stack Decisions

### Next.js for CRUD, FastAPI for AI

**Decision:** Next.js + Drizzle owns all CRUD (user data, document metadata, quiz results, preferences). FastAPI owns all AI logic, file processing, job queuing, and quota enforcement.

**Why:** FastAPI's value is async workers and AI chains. Using it for `GET /documents` adds an unnecessary HTTP hop and serialization layer. Drizzle Server Actions eliminate the entire API layer for simple reads and writes — a query runs directly against Neon with full TypeScript type safety. Over an MVP with ~15 CRUD endpoints, this saves significant development time.

**Tradeoff accepted:** Two codebases describe the same schema (SQLAlchemy models + Drizzle schema). Managed by: Alembic owns all migrations, Drizzle is query-only. Schema files are updated in the same commit as Alembic migrations.

**Exception that is non-negotiable:** Quota enforcement stays in FastAPI regardless of this split. See quota decision below.

---

### SQLAlchemy (async) + Alembic for Backend

**Decision:** FastAPI uses SQLAlchemy async ORM with Alembic for migrations.

**Why:** Async-native, battle-tested with FastAPI, pgvector Python client integrates cleanly. Alembic provides the migration source of truth that Drizzle references.

---

### Drizzle ORM for Next.js

**Decision:** Next.js uses Drizzle for all database access.

**Why:** Drizzle's schema-as-types model means the schema file is the type definition. Changes propagate as type errors immediately. Pairs perfectly with Server Actions — the query and the action are in the same file with no serialization layer.

**Rule:** Never run `drizzle-kit push` or `drizzle-kit generate` against production. Alembic owns schema changes.

---

### ARQ for Async Job Queue

**Decision:** ARQ (async Redis queue) for background jobs.

**Why:** Built specifically for async Python. Redis-backed (Upstash handles the infra). Simple worker definition that integrates naturally with FastAPI's async patterns. Document processing, chain execution, and embedding generation all run as ARQ jobs — no blocking requests.

---

### SSE for Job Status (not WebSockets or Polling)

**Decision:** Server-Sent Events for real-time job progress updates.

**Why:** SSE is unidirectional (server → client), which is exactly the requirement — the server emits processing progress, the client receives it. WebSockets are bidirectional and add unnecessary complexity. Polling (React Query `refetchInterval`) creates unnecessary load and feels laggy on a 15-second chain. SSE is the right tool.

**Implementation:** FastAPI `StreamingResponse` with `text/event-stream`. Client uses `EventSource`. React Query invalidates the relevant query on the `complete` event.

---

### Gemini 2.5 Flash for All Generation

**Decision:** Gemini 2.5 Flash for all AI generation (summary, quiz, practice chains). Gemini Flash Lite for chat only.

**Why:** Cost efficiency. Flash Lite is sufficient for single-turn grounded chat responses (smaller context, simpler task). 2.5 Flash handles the multi-step chains where quality matters.

**Rule:** LangChain is used only for multi-step chains. Single Gemini calls (embeddings, chat, image extraction) use the `google-generativeai` SDK directly. Don't over-abstract single calls into chains.

---

### openapi-typescript + openapi-fetch for Type Contract

**Decision:** FastAPI's `/openapi.json` is the source of truth for API types. `openapi-typescript` generates `src/types/api.ts`. `openapi-fetch` provides a typed client.

**Why:** Manual type wrappers drift silently. When a FastAPI response shape changes, the next `npm run generate:api` produces a type error everywhere the changed field is used. This is caught at build time, not at runtime in production.

**Rule:** Never manually edit `src/types/api.ts`. It is a generated file. Run `pnpm run generate:api` after any backend route change.

---

### Quota Enforcement in FastAPI Only

**Decision:** Quota checking and incrementing happens exclusively in FastAPI, never in Next.js.

**Why:** The transactional `SELECT FOR UPDATE` pattern that prevents race conditions requires a single authoritative service. If Next.js also enforces quota, there are two codepaths that can authorize feature calls — they will eventually diverge. One service, one enforcement point.

**Next.js role in quota:** Display only. Fetch current usage from Drizzle, show the meter, disable UI buttons. The actual gate is FastAPI.

---

### Alembic Owns All Migrations

**Decision:** Alembic is the single source of truth for schema changes. Drizzle never migrates.

**Why:** Two migration systems against the same database will eventually conflict. Alembic was chosen as the canonical source because it runs in the same process as the ARQ workers that write AI-generated data. This keeps schema authority close to the heaviest writer.

**Process:** Write Alembic migration → update Drizzle schema file in the same commit → both stay in sync.

---

### Clerk + Google OAuth for MVP Auth

**Decision:** Clerk authentication with Google OAuth only for MVP. No email sign-in for MVP.

**Why:** Email sign-in requires additional setup and UX surface area. Clerk + Google OAuth keeps implementation lean for a 2–3 week MVP targeting Filipino students (who commonly have Google accounts), while preserving a clear upgrade path to additional Clerk sign-in methods later.

**Post-MVP:** Add Clerk email sign-in for users who prefer email auth or do not want Google OAuth.

---

### PayMongo for Payments

**Decision:** PayMongo instead of Stripe.

**Why:** PayMongo is PH-native and supports GCash, which is the dominant payment method among Filipino students. Stripe does not support GCash natively. For a Philippines-first product, this is the correct choice regardless of Stripe's broader ecosystem advantages.

---

## Patterns

### Routes Never Call Chains Directly

```
Route → Service → Chain
```

Routes call services. Services call chains. When caching is added post-MVP, it wraps the service call — routes and chains are untouched. When ARQ replaces synchronous calls, only the service changes.

### All Vector Queries Are User-Scoped

```sql
-- Every pgvector query includes this filter
WHERE user_id = :user_id
ORDER BY embedding <=> :query_embedding
LIMIT 5
```

Never perform a similarity search without a `user_id` filter. This is a security requirement, not a performance suggestion.

### Never Pass Full Documents to LLM

All generation uses retrieved chunks (max 5 per call), never the full document content. This controls cost, reduces hallucination, and keeps latency predictable.

### Tenacity Wraps All Gemini Calls

```python
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(ResourceExhausted)
)
async def call_gemini(...):
    ...
```

Gemini 2.5 Flash has observable rate limit spikes. Without retry logic, transient 429s surface as application errors. This is applied at the chain level, not the service level.

---

## Future Decisions (Deferred)

| Decision | Deferred Until | Reason |
|---|---|---|
| Redis caching for embeddings/summaries | Post-MVP | Cost optimization after real usage data |
| Token-based credits (replace count system) | Phase 2 | Need usage data to set correct token limits |
| Magic link auth | Phase 2 | Google OAuth sufficient for launch |
| Web search fallback (Brave API) | Phase 3 | Out of scope for core learning loop |
| Multi-document synthesis | Phase 5 | Requires significant prompt engineering |
