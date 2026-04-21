# Onboarding & Global Settings Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the onboarding flow to capture user preferences and a global settings page to manage them, saving to the DB and using them in AI generation.

**Architecture:** Next.js App Router for frontend UI, Server Actions for DB writes. Drizzle ORM to update `user_preferences`. FastAPI backend reads `user_preferences` during generation.

**Tech Stack:** Next.js 15, React, Tailwind, shadcn/ui, Drizzle ORM, FastAPI, LangChain.

---

## Chunk 1: Frontend Onboarding Flow

### Task 1: Create Server Action for updating preferences

**Files:**
- Create: `frontend/src/app/actions/user.ts` (or modify if exists)

- [ ] **Step 1: Write Server Action**
```typescript
"use server"
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function updateUserPreferences(preferences: any) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  
  await db.update(users).set({ user_preferences: preferences }).where(eq(users.id, userId));
  revalidatePath("/");
  return { success: true };
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/app/actions/user.ts
git commit -m "feat: add user preferences server action"
```

### Task 2: Create Onboarding Page

**Files:**
- Create: `frontend/src/app/onboarding/page.tsx`
- Create: `frontend/src/components/features/onboarding/onboarding-form.tsx`

- [ ] **Step 1: Implement Onboarding UI**
Create a multi-select form using shadcn components for Education Level, Output Formats, Explanation Styles, and Custom Instructions. Hook it up to the server action.

- [ ] **Step 2: Commit**
```bash
git add frontend/src/app/onboarding/ frontend/src/components/features/onboarding/
git commit -m "feat: add onboarding UI and form"
```

### Task 3: Onboarding Middleware/Layout Check

**Files:**
- Modify: `frontend/src/middleware.ts` or `frontend/src/app/layout.tsx`

- [ ] **Step 1: Add check for missing preferences**
Check if the user is logged in but `user_preferences` is null (fetch from DB). If so, redirect to `/onboarding`.

- [ ] **Step 2: Commit**
```bash
git add frontend/src/middleware.ts
git commit -m "feat: add onboarding redirect logic"
```

## Chunk 2: Global Settings & Backend Integration

### Task 4: Global Settings Page

**Files:**
- Create: `frontend/src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Implement Settings Page**
Reuse the `onboarding-form.tsx` component but pre-populate it with the user's current preferences from the DB.

- [ ] **Step 2: Commit**
```bash
git add frontend/src/app/dashboard/settings/
git commit -m "feat: add global settings page"
```

### Task 5: Backend Integration in FastAPI

**Files:**
- Modify: `backend/app/chains/summary_chain.py`

- [ ] **Step 1: Append preferences to system prompt**
```python
def get_system_prompt(user_preferences: dict | None) -> str:
    base_prompt = "You are a helpful AI."
    if user_preferences:
        prefs_str = f"User prefers {user_preferences.get('education_level')} level, formats: {user_preferences.get('output_formats')}, styles: {user_preferences.get('explanation_styles')}. Custom: {user_preferences.get('custom_instructions')}."
        base_prompt += f"\n\nApply these preferences if applicable: {prefs_str}"
    return base_prompt
```

- [ ] **Step 2: Commit**
```bash
git add backend/app/chains/summary_chain.py
git commit -m "feat: integrate user preferences into summary chain"
```
