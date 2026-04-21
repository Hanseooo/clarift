# Env-based Pro Override Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a "backdoor" environment variable that grants Pro status to specific email addresses for testing purposes.

**Architecture:** A new backend configuration variable `PRO_OVERRIDE_EMAILS` evaluated in the `deps.py` layer to enforce quotas.

**Tech Stack:** FastAPI, Pydantic Settings, Python dotenv.

---

## Chunk 1: Backend Env Variables

### Task 1: Update Config and Dependencies

**Files:**
- Modify: `backend/app/config.py`
- Modify: `backend/app/deps.py`
- Modify: `backend/app/routes/users.py`

- [ ] **Step 1: Add Env Var**
In `config.py`, add `PRO_OVERRIDE_EMAILS: str = ""` to the Settings class. Add a property `pro_emails_list(self) -> list[str]: return [e.strip() for e in self.PRO_OVERRIDE_EMAILS.split(",")] if self.PRO_OVERRIDE_EMAILS else []`.

- [ ] **Step 2: Update `deps.py`**
In `enforce_quota` or `require_pro_user`, add:
```python
is_pro = user.tier == "pro" or user.email in settings.pro_emails_list
if not is_pro and quota_exceeded:
    raise HTTPException(status_code=403, detail="Quota exceeded")
```

- [ ] **Step 3: Update `users.py` `/api/me` endpoint**
Ensure the endpoint returns an `is_pro` boolean so the frontend UI correctly reflects the user's Pro limits.

- [ ] **Step 4: Commit**
```bash
git add backend/app/config.py backend/app/deps.py backend/app/routes/users.py
git commit -m "feat: add env pro override feature"
```
