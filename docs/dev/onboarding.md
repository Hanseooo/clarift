# Feature: Onboarding

> Captures the user's output format preference on first login.  
> Stored in `user_preferences.output_format`.  
> Applied to every summary and practice generation.

---

## What This Feature Does

After a user signs in with Google for the first time, they are shown a single-screen onboarding flow that captures all three global settings before they access the app:

1. **Output format** — how study content is structured
2. **Explanation style** — how concepts are explained
3. **Custom instructions** — any additional guidance for all generations

These are stored in `user_preferences` and applied to every AI generation. All three are editable later in `/app/settings`.

---

## Settings Captured

| Setting | Options | Default |
|---|---|---|
| `output_format` | `bullet`, `step-by-step`, `example-first` | `bullet` |
| `explanation_style` | `mental-models`, `simple`, `detailed`, `eli5` | `simple` |
| `custom_instructions` | Free text, max 500 characters | `""` |

See [`features/settings.md`](./settings.md) for how these settings are applied to generations.

---

## Flow

```
1. User completes Google OAuth
2. NextAuth signIn callback syncs user to FastAPI
3. Middleware checks if user_preferences row exists
4. If no preferences: redirect to /onboarding
5. User selects format preference
6. Server Action writes user_preferences row via Drizzle
7. Redirect to /app/dashboard
```

---

## Implementation

### Middleware Check

```typescript
// middleware.ts — add after auth check
const session = await auth()
if (session?.user && request.nextUrl.pathname.startsWith("/app")) {
  const prefs = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.user.id))
    .limit(1)

  if (prefs.length === 0 && !request.nextUrl.pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding", request.url))
  }
}
```

### Server Action

Location: `frontend/src/db/actions/preferences.ts`

```typescript
"use server"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { userPreferences } from "@/db/schema"
import { redirect } from "next/navigation"
import { z } from "zod"

const schema = z.object({
  outputFormat: z.enum(["bullet", "step-by-step", "example-first"]),
  explanationStyle: z.enum(["mental-models", "simple", "detailed", "eli5"]),
  customInstructions: z.string().max(500).default(""),
})

export async function saveOnboardingPreferences(data: z.infer<typeof schema>) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const validated = schema.parse(data)

  await db
    .insert(userPreferences)
    .values({
      userId: session.user.id,
      outputFormat: validated.outputFormat,
      explanationStyle: validated.explanationStyle,
      customInstructions: validated.customInstructions,
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: {
        outputFormat: validated.outputFormat,
        explanationStyle: validated.explanationStyle,
        customInstructions: validated.customInstructions,
      },
    })

  redirect("/app/dashboard")
}
```

### Onboarding Page

Location: `frontend/src/app/onboarding/page.tsx`

This is a Server Component that renders the format selector. The format options are displayed as three interactive cards — each showing the label, a brief description, and a short example of what output looks like in that format.

The "Continue" button submits via the `saveOutputFormat` Server Action.

---

## UI Design Notes

The onboarding screen should feel welcoming, not like a settings form. Three large cards, one per format option. Each card shows:

- Format name (e.g., "Bullet Points")
- One-line description
- A small preview snippet showing how a sample study topic would look in that format

Example preview for `bullet`:
```
• Osmosis is the movement of water across a semipermeable membrane
• Water moves from low to high solute concentration
• Tonicity describes the relative solute concentration
```

Example preview for `example-first`:
```
Example: A red blood cell placed in pure water swells and bursts.
This demonstrates osmosis — water moving into the cell due to higher
internal solute concentration.
```

---

## Applying the Preference

The `output_format` from `user_preferences` is passed to every summary and practice chain call.

In practice, the service fetches it:

```python
# app/services/summary_service.py
async def get_user_format(user_id: UUID, db: AsyncSession) -> str:
    result = await db.execute(
        select(UserPreference.output_format)
        .where(UserPreference.user_id == user_id)
    )
    return result.scalar_one_or_none() or "bullet"
```

The chain receives it as a parameter and applies a format-specific prompt variant.

---

## Settings Page (Post-Onboarding)

Users can change their format preference at any time in `/app/settings`. This calls the same `saveOutputFormat` Server Action — the `onConflictDoUpdate` handles the update case identically.

---

## Tests

**Frontend (vitest):**
- `OnboardingPage` renders three format cards
- Selecting a card and clicking Continue calls `saveOutputFormat`
- Each format card shows correct preview content

**Backend (pytest):**
- `test_preference_applied_to_summary` — output_format is passed to chain
- `test_preference_default_bullet` — user with no preference gets bullet format
- `test_preference_update` — calling saveOutputFormat twice updates correctly
