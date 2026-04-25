# Feature: Quota System

> Quota enforcement is exclusively in FastAPI. Quota display is in Next.js.  
> See [`decisions.md`](../decisions.md#quota-enforcement-in-fastapi-only).

---

## Quota Limits

```python
QUOTA_LIMITS = {
    "free": {
        "summaries": 3,       # per day
        "quizzes": 3,         # per day
        "practice": 3,        # per day (let free users experience it)
        "chat": 12,             # per day
    },
    "pro": {
        "summaries": 10,      # per day
        "quizzes": 15,        # per day
        "practice": 10,       # per day
        "chat": 60,             # per day
    }
}

CHAT_WINDOW_SECONDS = 18000  # 5 hours (rolling, not daily reset)
```

---

## Enforcement Implementation

### Daily Features (summaries, quizzes, practice)

```python
# app/services/quota_service.py

async def enforce_quota(feature: str, user: User, db: AsyncSession):
    tier = user.tier  # "free" | "pro"
    limit = QUOTA_LIMITS[tier][feature]

    async with db.begin():
        usage = await db.execute(
            select(UserUsage)
            .where(UserUsage.user_id == user.id)
            .with_for_update()  # row-level lock prevents race conditions
        )
        usage = usage.scalar_one()

        # Reset if past reset_at (daily)
        if usage.reset_at < datetime.utcnow():
            await db.execute(
                update(UserUsage)
                .where(UserUsage.user_id == user.id)
                .values(
                    summaries_used=0,
                    quizzes_used=0,
                    practice_used=0,
                    reset_at=datetime.utcnow() + timedelta(days=1)
                )
            )
            usage.summaries_used = 0
            usage.quizzes_used = 0
            usage.practice_used = 0

        current = getattr(usage, f"{feature}_used")
        if current >= limit:
            raise QuotaExceededException(feature=feature, used=current, limit=limit)

        # Increment
        await db.execute(
            update(UserUsage)
            .where(UserUsage.user_id == user.id)
            .values({f"{feature}_used": current + 1})
        )
```

### FastAPI Dependency Usage

```python
# app/api/v1/deps.py
def enforce_quota(feature: str):
    async def _enforce(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        await quota_service.enforce_quota(feature, current_user, db)
    return _enforce

# In routes:
@router.post("/summaries")
async def create_summary(
    _: None = Depends(enforce_quota("summaries")),
    ...
):
```

### Chat Rolling Window (Redis)

```python
# app/services/quota_service.py

async def enforce_chat_quota(user: User, redis: Redis):
    key = f"chat_usage:{user.id}"
    limit = QUOTA_LIMITS[user.tier]["chat_per_window"]

    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, CHAT_WINDOW_SECONDS)
    if count > limit:
        ttl = await redis.ttl(key)
        raise ChatQuotaExceededException(reset_in_seconds=ttl)
```

---

## Daily Reset

Cron job runs every day at midnight Philippine time (UTC+8 = 16:00 UTC):

```python
# app/workers/cron.py
async def reset_daily_quotas(ctx):
    await db.execute(
        update(UserUsage)
        .where(UserUsage.reset_at <= datetime.utcnow())
        .values(
            summaries_used=0,
            quizzes_used=0,
            practice_used=0,
            reset_at=datetime.utcnow() + timedelta(days=1)
        )
    )
```

The service-level reset check (in `enforce_quota`) is a safety net for users who haven't used the app when the cron runs.

---

## Error Response

When quota is exceeded, FastAPI returns:

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

---

## Frontend Display

Next.js reads quota display data via Drizzle (read-only):

```typescript
// Dashboard shows usage meters
const usage = await db
  .select()
  .from(userUsageTable)
  .where(eq(userUsageTable.userId, session.user.id))
  .limit(1)
```

UI shows:
- "3/3 summaries used today" with a progress bar
- Upgrade CTA when at or near limit
- Disabled action buttons when limit reached (UI hint only — FastAPI is the real gate)

---

## Tests

- `test_quota_enforced_on_limit` — 429 when at limit
- `test_quota_increments` — counter goes up after each use
- `test_quota_race_condition` — concurrent requests don't exceed limit
- `test_quota_reset_on_cron` — usage resets correctly
- `test_chat_rolling_window` — window resets after TTL
- `test_free_tier_practice_allowed` — free tier gets 3 practice/day
- `test_free_tier_practice_blocked` — 429 on fourth practice attempt same day
