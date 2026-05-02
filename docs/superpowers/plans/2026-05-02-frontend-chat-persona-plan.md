# Chat Persona System — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add chat mode/persona settings UI, inline chat override, fix multi-select correct answer display, and regenerate API types.

**Architecture:** Extend preference types with `ChatSettings`. Update `OnboardingForm` to include mode/persona option cards. Update `useSendChatMessage` to pass overrides. Add persona chip to chat header with inline override popover. Fix `question-review.tsx` to render `correct_answers` arrays.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zustand (chat store)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/types/preferences.ts` | Modify | Add `ChatSettings` interface |
| `frontend/src/hooks/use-chat.ts` | Modify | Accept and send `mode_override`/`persona_override` |
| `frontend/src/stores/chat-store.ts` | Modify | Add session override state |
| `frontend/src/app/(app)/settings/page.tsx` | Modify | Pass `chat_settings` to client |
| `frontend/src/app/(app)/settings/client.tsx` | Modify | Pass `chat_settings` to form |
| `frontend/src/components/features/onboarding/onboarding-form.tsx` | Modify | Add chat mode + persona selectors |
| `frontend/src/components/features/chat/chat-page-client.tsx` | Modify | Add persona chip + override popover |
| `frontend/src/components/features/chat/chat-messages.tsx` | Modify | Render `[AI Knowledge]:` labels distinctly |
| `frontend/src/components/features/quiz/question-review.tsx` | Modify | Fix multi-select correct answer display |
| `frontend/src/lib/preference-options.ts` | Modify | Add `CHAT_MODE_OPTIONS` and `CHAT_PERSONA_OPTIONS` |
| `frontend/src/types/api.ts` | Regenerate | From updated FastAPI OpenAPI schema |
| `frontend/src/app/actions/user.ts` | Modify | Accept `chat_settings` in Server Action |

---

## Task 1: Update Types and Preferences Library

**Files:**
- Modify: `frontend/src/types/preferences.ts`
- Modify: `frontend/src/lib/preference-options.ts`

---

- [ ] **Step 1: Update `frontend/src/types/preferences.ts`**

```typescript
export interface ChatSettings {
  mode: "strict_rag" | "tutor" | "socratic";
  persona: "default" | "encouraging" | "direct" | "witty" | "patient";
}

export interface OverridePreferences {
  education_level?: string;
  output_formats?: string[];
  explanation_styles?: string[];
  custom_instructions?: string;
  chat_settings?: ChatSettings;
}
```

- [ ] **Step 2: Update `frontend/src/lib/preference-options.ts`**

Add to the bottom of the file (or create the constants if the file doesn't exist):

```typescript
export const CHAT_MODE_OPTIONS = [
  {
    value: "strict_rag" as const,
    title: "Strict Notes Only",
    description: "Answers come only from your uploaded material. No outside knowledge.",
    preview: "A: Based on your notes [1], photosynthesis occurs in chloroplasts.",
  },
  {
    value: "tutor" as const,
    title: "Tutor",
    description: "Uses your notes first, then adds context from general knowledge when helpful.",
    preview: "A: Your notes state X [1]. Beyond your notes, X also works by...",
  },
  {
    value: "socratic" as const,
    title: "Socratic",
    description: "Guides you to the answer with questions instead of giving it directly.",
    preview: "Q: What do your notes say happens first? Let's work through this...",
  },
];

export const CHAT_PERSONA_OPTIONS = [
  {
    value: "default" as const,
    title: "Default",
    description: "Clear, helpful, and adaptable to your needs.",
    preview: "A: Here's a clear explanation of the concept...",
  },
  {
    value: "encouraging" as const,
    title: "Encouraging",
    description: "Warm and supportive. Celebrates effort and breaks ideas into steps.",
    preview: "A: Great question! Let's break this down step by step...",
  },
  {
    value: "direct" as const,
    title: "Direct",
    description: "Concise and efficient. Gets straight to the point with minimal fluff.",
    preview: "A: • Point 1\n• Point 2\n• Point 3",
  },
  {
    value: "witty" as const,
    title: "Witty",
    description: "Clever and engaging. Uses light humor and memorable analogies.",
    preview: "A: Think of it like a traffic jam for electrons...",
  },
  {
    value: "patient" as const,
    title: "Patient",
    description: "Gentle and never rushed. Asks guiding questions before answering.",
    preview: "A: What do you think happens first? Let's explore together...",
  },
];
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/preferences.ts frontend/src/lib/preference-options.ts
git commit -m "feat(types): add ChatSettings and chat mode/persona options"
```

---

## Task 2: Update Chat Hook and Store

**Files:**
- Modify: `frontend/src/hooks/use-chat.ts`
- Modify: `frontend/src/stores/chat-store.ts`

---

- [ ] **Step 1: Update `frontend/src/hooks/use-chat.ts`**

```typescript
"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { createAuthenticatedClient } from "@/lib/api";
import { useQuota } from "@/contexts/quota-context";

type SendChatInput = {
  question: string;
  document_ids?: string[];
  messages?: Array<{ role: string; content: string }>;
  mode_override?: "strict_rag" | "tutor" | "socratic";
  persona_override?: "default" | "encouraging" | "direct" | "witty" | "patient";
};

export function useSendChatMessage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();
  const { optimisticallyIncrement } = useQuota();

  const mutateAsync = useCallback(async (payload: SendChatInput) => {
    setIsLoading(true);
    setError(null);
    const rollback = optimisticallyIncrement("chat");
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("You must be logged in to use chat.");
      }

      const authClient = createAuthenticatedClient(token);
      
      const { data, error: apiError } = await authClient.POST("/api/v1/chat", {
        body: {
          question: payload.question,
          document_ids: payload.document_ids ?? [],
          messages: payload.messages ?? [],
          mode_override: payload.mode_override,
          persona_override: payload.persona_override,
        },
      });
      if (apiError || !data) {
        console.error("API error:", apiError);
        throw new Error("Failed to send chat message");
      }
      return data;
    } catch (caughtError) {
      rollback();
      const message =
        caughtError instanceof Error ? caughtError.message : "Failed to send chat message";
      setError(message);
      throw caughtError;
    } finally {
      setIsLoading(false);
    }
  }, [getToken, optimisticallyIncrement]);

  return { mutateAsync, isLoading, error };
}
```

- [ ] **Step 2: Update `frontend/src/stores/chat-store.ts`**

Read the file first to understand its structure, then add override state:

```typescript
// Add to the store interface and implementation:
interface ChatStore {
  // ... existing fields ...
  modeOverride: "strict_rag" | "tutor" | "socratic" | null;
  personaOverride: "default" | "encouraging" | "direct" | "witty" | "patient" | null;
  setModeOverride: (mode: ChatStore["modeOverride"]) => void;
  setPersonaOverride: (persona: ChatStore["personaOverride"]) => void;
}
```

In the `create` call, add:
```typescript
  modeOverride: null,
  personaOverride: null,
  setModeOverride: (mode) => set({ modeOverride: mode }),
  setPersonaOverride: (persona) => set({ personaOverride: persona }),
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/use-chat.ts frontend/src/stores/chat-store.ts
git commit -m "feat(chat): support mode and persona overrides in hook and store"
```

---

## Task 3: Update Settings Page

**Files:**
- Modify: `frontend/src/app/(app)/settings/page.tsx`
- Modify: `frontend/src/app/(app)/settings/client.tsx`
- Modify: `frontend/src/components/features/onboarding/onboarding-form.tsx`

---

- [ ] **Step 1: Update `settings/page.tsx`**

```typescript
import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/db"
import { eq } from "drizzle-orm"
import { users } from "@/db/schema"
import { SettingsClient } from "./client"

export default async function SettingsPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/login")
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  })

  if (!user) {
    redirect("/onboarding")
  }

  const preferences = user.userPreferences as {
    education_level?: string
    output_formats?: string[]
    explanation_styles?: string[]
    custom_instructions?: string
    chat_settings?: {
      mode?: "strict_rag" | "tutor" | "socratic"
      persona?: "default" | "encouraging" | "direct" | "witty" | "patient"
    }
  }

  return <SettingsClient preferences={preferences} />
}
```

- [ ] **Step 2: Update `settings/client.tsx`**

```typescript
"use client"

import { useState } from "react"
import { useClerk } from "@clerk/nextjs"
import { OnboardingForm } from "@/components/features/onboarding/onboarding-form"
import { ThemeSettings } from "@/components/theme-settings"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

interface SettingsClientProps {
  preferences: {
    education_level?: string
    output_formats?: string[]
    explanation_styles?: string[]
    custom_instructions?: string
    chat_settings?: {
      mode?: "strict_rag" | "tutor" | "socratic"
      persona?: "default" | "encouraging" | "direct" | "witty" | "patient"
    }
  }
}

export function SettingsClient({ preferences }: SettingsClientProps) {
  const [showSuccess, setShowSuccess] = useState(false)
  const { signOut } = useClerk()

  return (
    <div className="space-y-8 max-w-[640px] mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Settings
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage your study preferences and appearance
        </p>
      </div>

      <section>
        <h2 className="text-sm font-medium text-text-primary mb-3">
          Appearance
        </h2>
        <ThemeSettings />
      </section>

      <div className="border-t border-border-default pt-8">
        <h2 className="text-sm font-medium text-text-primary mb-3">
          Study Preferences
        </h2>
        {showSuccess && (
          <div className="mb-4 p-3 text-sm text-success-800 bg-success-100 rounded-md">
            Preferences saved successfully!
          </div>
        )}
        <OnboardingForm
          initialData={preferences}
          onSuccess={() => {
            setShowSuccess(true)
            setTimeout(() => setShowSuccess(false), 3000)
          }}
        />
      </div>

      <div className="pt-6 border-t border-border-default">
        <Button
          variant="destructive"
          onClick={() => signOut({ redirectUrl: "/login" })}
          className="w-full"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update `OnboardingForm` to include chat settings**

Read the full `onboarding-form.tsx` first. Add state and UI for chat mode and persona.

Import the new options:
```typescript
import {
  OUTPUT_FORMAT_OPTIONS,
  EXPLANATION_STYLE_OPTIONS,
  CHAT_MODE_OPTIONS,
  CHAT_PERSONA_OPTIONS,
} from "@/lib/preference-options"
```

Add state:
```typescript
  const [chatMode, setChatMode] = useState(
    initialData?.chat_settings?.mode || "tutor"
  )
  const [chatPersona, setChatPersona] = useState(
    initialData?.chat_settings?.persona || "default"
  )
```

Update `handleSubmit` to include chat_settings:
```typescript
      await updateUserPreferences({
        education_level: educationLevel,
        output_formats: selectedFormats,
        explanation_styles: selectedStyles,
        custom_instructions: customInstructions,
        chat_settings: {
          mode: chatMode as "strict_rag" | "tutor" | "socratic",
          persona: chatPersona as "default" | "encouraging" | "direct" | "witty" | "patient",
        },
      })
```

Add UI sections before the submit button. Use the existing `OptionCard` component pattern:

```typescript
      {/* Chat Mode */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-text-primary">Chat Mode</h3>
        <div className="grid gap-3">
          {CHAT_MODE_OPTIONS.map((option) => (
            <OptionCard
              key={option.value}
              title={option.title}
              description={option.description}
              preview={option.preview}
              selected={chatMode === option.value}
              onClick={() => setChatMode(option.value)}
            />
          ))}
        </div>
      </div>

      {/* Chat Persona */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-text-primary">Chat Personality</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CHAT_PERSONA_OPTIONS.map((option) => (
            <OptionCard
              key={option.value}
              title={option.title}
              description={option.description}
              preview={option.preview}
              selected={chatPersona === option.value}
              onClick={() => setChatPersona(option.value)}
            />
          ))}
        </div>
      </div>
```

- [ ] **Step 4: Update `frontend/src/app/actions/user.ts`**

Find the Server Action that saves preferences and ensure it accepts `chat_settings`:

```typescript
export async function updateUserPreferences(preferences: {
  education_level: string;
  output_formats: string[];
  explanation_styles: string[];
  custom_instructions: string;
  chat_settings?: {
    mode: "strict_rag" | "tutor" | "socratic";
    persona: "default" | "encouraging" | "direct" | "witty" | "patient";
  };
}) {
  // ... existing auth and validation ...
  // Save to DB as JSONB
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/(app)/settings/ frontend/src/components/features/onboarding/onboarding-form.tsx frontend/src/app/actions/user.ts
git commit -m "feat(settings): add chat mode and persona selectors to settings"
```

---

## Task 4: Update Chat UI

**Files:**
- Modify: `frontend/src/app/(app)/chat/page.tsx`
- Modify: `frontend/src/components/features/chat/chat-page-client.tsx`
- Modify: `frontend/src/components/features/chat/chat-messages.tsx`

---

- [ ] **Step 1: Update `chat/page.tsx` title and description**

```typescript
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-text-primary">Chat with Clarift</h1>
        <p className="text-sm text-text-secondary">
          Ask questions, get explanations, and explore your notes.
        </p>
      </header>
```

- [ ] **Step 2: Update `chat-page-client.tsx`**

Add persona chip and override popover. Import needed components:
```typescript
import { useChatStore } from "@/stores/chat-store"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
```

Read the persona override from the store and pass it to `mutateAsync`:
```typescript
  const {
    messages,
    selectedDocumentIds: selectedIds,
    setSelectedDocumentIds,
    addMessage,
    modeOverride,
    personaOverride,
    setModeOverride,
    setPersonaOverride,
  } = useChatStore()
```

In `sendMessage`, pass overrides:
```typescript
      const response = await mutateAsync({
        question: message,
        document_ids: selectedDocumentIds,
        messages: contextMessages,
        mode_override: modeOverride ?? undefined,
        persona_override: personaOverride ?? undefined,
      })
```

Add persona chip in the UI (before the messages area):
```typescript
      <div className="flex items-center justify-between px-1">
        <Popover>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors">
              <Badge variant="secondary" className="font-normal text-xs cursor-pointer">
                {personaOverride || "Default"}
              </Badge>
              <span className="text-text-tertiary">Persona</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 space-y-3" align="start">
            <div className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Mode
            </div>
            <div className="flex flex-wrap gap-2">
              {["strict_rag", "tutor", "socratic"].map((m) => (
                <Badge
                  key={m}
                  variant={modeOverride === m ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => setModeOverride(modeOverride === m ? null : m as any)}
                >
                  {m.replace("_", " ")}
                </Badge>
              ))}
            </div>
            <div className="text-xs font-medium text-text-secondary uppercase tracking-wide pt-1">
              Persona
            </div>
            <div className="flex flex-wrap gap-2">
              {["default", "encouraging", "direct", "witty", "patient"].map((p) => (
                <Badge
                  key={p}
                  variant={personaOverride === p ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => setPersonaOverride(personaOverride === p ? null : p as any)}
                >
                  {p}
                </Badge>
              ))}
            </div>
            <p className="text-[10px] text-text-tertiary pt-1">
              Overrides apply only to this session.
            </p>
          </PopoverContent>
        </Popover>
      </div>
```

- [ ] **Step 3: Update `chat-messages.tsx` to render `[AI Knowledge]:` distinctly**

Find where assistant messages are rendered. If the message content contains `[AI Knowledge]:`, split and style:

```typescript
function renderContent(content: string) {
  if (!content.includes("[AI Knowledge]:")) {
    return <RichMarkdown content={content} />;
  }
  const parts = content.split("[AI Knowledge]:");
  return (
    <>
      <RichMarkdown content={parts[0]} />
      {parts.slice(1).map((part, i) => (
        <div key={i} className="mt-2 rounded-lg border border-accent-200 bg-accent-50 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-accent-700">
            AI Knowledge
          </span>
          <div className="text-sm text-text-secondary mt-1">
            <RichMarkdown content={part.trim()} />
          </div>
        </div>
      ))}
    </>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/(app)/chat/page.tsx frontend/src/components/features/chat/chat-page-client.tsx frontend/src/components/features/chat/chat-messages.tsx
git commit -m "feat(chat): add persona chip, inline override, and AI Knowledge labels"
```

---

## Task 5: Fix Multi-Select Display Bug

**Files:**
- Modify: `frontend/src/components/features/quiz/question-review.tsx`
- Audit: `frontend/src/components/features/quiz/quiz-attempt.tsx`
- Audit: `frontend/src/components/features/quiz/score-reveal.tsx`

---

- [ ] **Step 1: Update `question-review.tsx`**

The component receives `correctAnswer: string | boolean | string[]`. For multi-select, it should already work because `formatAnswer` handles arrays. But we need to make sure the parent passes `correct_answers` (array) instead of `correct_answer` (undefined).

Check the parent components that render `QuestionReview`:
- `quiz-attempt.tsx`
- `score-reveal.tsx`

In those parents, when passing `correctAnswer`, use:
```typescript
questionType === "multi_select" ? question.correct_answers : question.correct_answer
```

If `question-review.tsx` already receives the right prop, verify `formatAnswer`:
```typescript
function formatAnswer(answer: string | boolean | string[]): string {
  if (typeof answer === "boolean") return answer ? "True" : "False";
  if (Array.isArray(answer)) return answer.join(", ");
  return answer;
}
```

This should already work. The bug is likely in the parent not passing the array. Audit `quiz-attempt.tsx` and `score-reveal.tsx` for this pattern:

```typescript
correctAnswer={question.correct_answer}
```

Replace with:
```typescript
correctAnswer={
  question.type === "multi_select"
    ? question.correct_answers || []
    : question.correct_answer
}
```

- [ ] **Step 2: Audit other quiz components**

Run grep to find all usages:
```bash
cd frontend && grep -r "correct_answer" src/components/features/quiz/ --include="*.tsx"
```

Fix any that don't handle `multi_select` correctly.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/quiz/
git commit -m "fix(quiz): use correct_answers array for multi-select display"
```

---

## Task 6: Regenerate API Types

**Files:**
- Modify: `frontend/src/types/api.ts` (regenerated)

---

- [ ] **Step 1: Ensure backend is running and has the new endpoints**

The backend must be running with the updated `ChatRequest` schema.

- [ ] **Step 2: Regenerate types**

Run: `cd frontend && pnpm run generate:openapi`
Expected: Success, `src/types/api.ts` updated with `mode_override` and `persona_override` fields.

- [ ] **Step 3: Verify generated types**

Open `frontend/src/types/api.ts` and confirm:
- `ChatRequest` includes `mode_override?: "strict_rag" | "tutor" | "socratic"`
- `ChatRequest` includes `persona_override?: "default" | "encouraging" | "direct" | "witty" | "patient"`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "chore(types): regenerate API types from backend OpenAPI"
```

---

## Task 7: Frontend Tests

**Files:**
- Modify: `frontend/src/app/(app)/settings/__tests__/settings-client.test.tsx`
- Create: `frontend/src/components/features/quiz/__tests__/question-review.test.tsx`

---

- [ ] **Step 1: Update settings test**

Add tests for chat mode and persona rendering in the settings page.

```typescript
import { render, screen, fireEvent } from "@testing-library/react"
import { SettingsClient } from "../client"

describe("SettingsClient chat settings", () => {
  it("renders chat mode options", () => {
    render(<SettingsClient preferences={{}} />)
    expect(screen.getByText("Tutor")).toBeInTheDocument()
    expect(screen.getByText("Strict Notes Only")).toBeInTheDocument()
  })

  it("renders chat persona options", () => {
    render(<SettingsClient preferences={{}} />)
    expect(screen.getByText("Encouraging")).toBeInTheDocument()
    expect(screen.getByText("Direct")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Create question-review test**

```typescript
import { render, screen } from "@testing-library/react"
import { QuestionReview } from "../question-review"

describe("QuestionReview multi-select", () => {
  it("displays multiple correct answers joined by commas", () => {
    render(
      <QuestionReview
        index={0}
        question="Select all that apply"
        userAnswer={["A", "C"]}
        correctAnswer={["A", "B", "C"]}
        isCorrect={false}
        explanation="Explanation"
        questionType="multi_select"
        showAnswers={true}
      />
    )
    expect(screen.getByText(/Correct answer:/)).toHaveTextContent("A, B, C")
  })
})
```

- [ ] **Step 3: Run tests**

Run: `cd frontend && pnpm run test:run`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/(app)/settings/__tests__/ frontend/src/components/features/quiz/__tests__/
git commit -m "test(frontend): add chat settings and multi-select display tests"
```

---

## Self-Review Checklist

- [ ] **Spec coverage:**
  - Chat settings UI → Task 3
  - Inline override → Task 4
  - AI Knowledge labels → Task 4
  - Multi-select display fix → Task 5
  - OpenAPI regeneration → Task 6
- [ ] **Placeholder scan:** No "TBD", "TODO", or "implement later" found.
- [ ] **Type consistency:** `ChatSettings` type matches backend `Literal` enums. `useSendChatMessage` payload matches generated API types.
- [ ] **Design compliance:** Option cards follow `design.md` (icon box, title, description, preview snippet, selected state with checkmark).
- [ ] **Mobile-first:** Settings grid uses `grid-cols-1 sm:grid-cols-2` for personas.
- [ ] **Accessibility:** Popover has focus management. Badges are clickable with keyboard.
- [ ] **Backward compatibility:** Settings form works without `chat_settings` in `initialData`. Defaults to `tutor`/`default`.
