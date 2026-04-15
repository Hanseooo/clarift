# Observability

> How to track errors, performance, token costs, and system health in Clarift.  
> Monitoring is not optional — without it, production AI systems fail silently and cost money invisibly.

---

## What We Track

| Signal | Why |
|---|---|
| Errors + stack traces | Know when things break and where |
| Token usage per chain call | Cost tracking — Gemini charges per token |
| Latency per pipeline step | Find the slow step in a chain |
| Cache hit rate (post-MVP) | Validate that caching is working |
| Job success/failure rate | ARQ worker reliability |
| Quota hit rate per feature | Signals when Free users are ready to upgrade |

---

## Error Tracking: Sentry

Initialize in `app/main.py` on startup. Every unhandled exception is captured automatically with request context and user ID.

```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    integrations=[FastApiIntegration(), SqlalchemyIntegration()],
    traces_sample_rate=0.1,  # 10% of requests traced for performance
    environment=settings.APP_ENV,
)
```

**Tag errors with user context** in the auth dependency:

```python
# app/api/v1/deps.py
import sentry_sdk

async def get_current_user(...) -> User:
    user = # ... verify JWT, get user
    sentry_sdk.set_user({"id": str(user.id), "email": user.email})
    return user
```

This means every Sentry error shows which user triggered it.

---

## Structured Logging

Use Python's `logging` module with structured output. Every log entry includes `user_id`, feature name, and relevant IDs.

`app/core/logging.py`:
```python
import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
        }
        if hasattr(record, "extra"):
            log_data.update(record.extra)
        return json.dumps(log_data)

def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    return logger
```

---

## Token Usage Logging

Log token usage after every Gemini call. This is how you track cost in real-time before adding a dedicated dashboard.

```python
# app/chains/summary_chain.py
import time
from app.core.logging import get_logger

logger = get_logger("summary_chain")

async def run(self, chunks: list[str], output_format: str, user_id: str) -> SummaryOutput:
    start = time.monotonic()

    result = await self.chain.ainvoke({
        "chunks": chunks,
        "format": output_format,
    })

    elapsed_ms = int((time.monotonic() - start) * 1000)

    # LangChain exposes token usage via callback
    usage = result.usage_metadata if hasattr(result, "usage_metadata") else {}

    logger.info("chain.complete", extra={
        "chain": "summary",
        "user_id": user_id,
        "tokens_input": usage.get("input_tokens", 0),
        "tokens_output": usage.get("output_tokens", 0),
        "tokens_total": usage.get("total_tokens", 0),
        "duration_ms": elapsed_ms,
        "output_format": output_format,
    })

    return result
```

Apply this same pattern to `quiz_chain.py` and `practice_chain.py`.

---

## Job Lifecycle Logging

Every ARQ job logs its lifecycle so you can trace failures:

```python
# app/workers/document_worker.py
logger = get_logger("document_worker")

async def process_document(ctx, document_id: str):
    logger.info("job.start", extra={"job": "process_document", "document_id": document_id})
    start = time.monotonic()

    try:
        # ... processing steps ...
        elapsed_ms = int((time.monotonic() - start) * 1000)
        logger.info("job.complete", extra={
            "job": "process_document",
            "document_id": document_id,
            "duration_ms": elapsed_ms,
            "chunks_created": chunk_count,
        })
    except Exception as e:
        logger.error("job.failed", extra={
            "job": "process_document",
            "document_id": document_id,
            "error": str(e),
        })
        raise
```

---

## Latency Tracking Per Chain Step

For multi-step chains, log each step individually to find bottlenecks:

```python
# app/chains/summary_chain.py

async def _step_extract_concepts(self, chunks, user_id):
    start = time.monotonic()
    result = await self.extract_chain.ainvoke({"chunks": chunks})
    logger.info("chain.step", extra={
        "chain": "summary",
        "step": "extract_concepts",
        "user_id": user_id,
        "duration_ms": int((time.monotonic() - start) * 1000),
    })
    return result
```

Over time, this shows you which step (extract, cluster, outline, generate) is the slowest. In practice for Gemini chains, the final generation step dominates — but you want data, not assumptions.

---

## Quota Hit Rate Tracking

Log every quota check — both successes and quota exceeded events. This data tells you when Free users are at capacity and are candidates for upgrade prompts.

```python
# app/services/quota_service.py

async def enforce_quota(feature: str, user: User, db: AsyncSession):
    # ... quota check logic ...

    if current >= limit:
        logger.info("quota.exceeded", extra={
            "user_id": str(user.id),
            "tier": user.tier,
            "feature": feature,
            "used": current,
            "limit": limit,
        })
        raise QuotaExceededException(...)

    logger.info("quota.consumed", extra={
        "user_id": str(user.id),
        "tier": user.tier,
        "feature": feature,
        "used": current + 1,
        "limit": limit,
    })
```

---

## Health Check Endpoint

The `/health` endpoint is already wired. Extend it to check critical dependencies:

```python
# app/main.py
@app.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    checks = {"status": "ok", "checks": {}}

    # Database
    try:
        await db.execute(text("SELECT 1"))
        checks["checks"]["database"] = "ok"
    except Exception:
        checks["checks"]["database"] = "error"
        checks["status"] = "degraded"

    return checks
```

Railway uses this endpoint for health checks. If it returns non-200, Railway restarts the service.

---

## What to Watch in Production

Railway logs stream to stdout — all JSON log lines are searchable in the Railway dashboard.

**First week in production, check daily:**
- Sentry: any new error types appearing
- Token usage logs: total tokens per day (compare against cost model)
- Job failure rate: `job.failed` log count vs `job.complete` count
- Quota hit rate: how often are Free users hitting limits

**Red flags:**
- `job.failed` rate > 5% → investigate extraction or embedding failures
- Single user consuming > 100k tokens/day → possible abuse or bug
- `quota.exceeded` rate suddenly drops → may indicate a quota enforcement bug
- P95 chain latency > 30 seconds → Gemini rate limiting, check tenacity retry logs
