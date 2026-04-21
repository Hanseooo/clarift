# Per-generation Settings Override Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a modal for overriding user preferences per generation request, and update the backend to accept these overrides.

**Architecture:** Next.js frontend with shadcn modal containing the settings form. Sends `override_preferences` in the POST body to FastAPI endpoints.

**Tech Stack:** Next.js 15, React, shadcn/ui, FastAPI.

---

## Chunk 1: Frontend Override UI

### Task 1: Create Override Modal Component

**Files:**
- Create: `frontend/src/components/features/generation/override-settings-modal.tsx`

- [ ] **Step 1: Implement Modal**
Create a button that says "Override Settings". When clicked, opens a shadcn `Dialog` with the same fields as the onboarding form, pre-filled with the user's global preferences.

- [ ] **Step 2: Commit**
```bash
git add frontend/src/components/features/generation/override-settings-modal.tsx
git commit -m "feat: add override settings modal UI"
```

### Task 2: Pass Overrides to Generation Request

**Files:**
- Modify: `frontend/src/components/features/generation/generate-summary-form.tsx` (or equivalent)

- [ ] **Step 1: Include in Request Body**
Store the output of the modal in state (`overridePreferences`). When the user clicks "Generate", include `override_preferences: overridePreferences` in the `POST` request payload to the backend.

- [ ] **Step 2: Commit**
```bash
git add frontend/src/components/features/generation/
git commit -m "feat: pass override preferences to generation API"
```

## Chunk 2: Backend Support

### Task 3: Update FastAPI Models & Endpoints

**Files:**
- Modify: `backend/app/schemas/summary.py`
- Modify: `backend/app/routes/summaries.py`

- [ ] **Step 1: Add field to schema**
Add `override_preferences: Optional[dict] = None` to the `GenerateSummaryRequest` Pydantic model.

- [ ] **Step 2: Update endpoint logic**
```python
# In summaries.py:
preferences_to_use = request.override_preferences if request.override_preferences else user.user_preferences
```

- [ ] **Step 3: Commit**
```bash
git add backend/app/schemas/ backend/app/routes/
git commit -m "feat: accept override preferences in summary endpoint"
```
