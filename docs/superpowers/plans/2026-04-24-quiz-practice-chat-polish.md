# Quiz, Practice & Chat Polish Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish quiz list, quiz creation, practice weak areas, and chat interface with design system tokens, proper mobile layout, and dark mode support. Add missing chat interactions (thinking indicator, citation pills, pill input).

**Architecture:** Component-level polish. Quiz and practice pages get card-based layouts. Chat gets the full design.md treatment (pill textarea, circle send, thinking dots, citation pills). No route changes.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui

**Reference:** `docs/dev/design.md` — Sections "Quiz Components", "Weak Areas Display", "Chat Interface", "Cards", "Badges"

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/components/features/quiz/quiz-list.tsx` | Replace | Quiz cards with icon boxes and badges |
| `frontend/src/components/features/quiz/quiz-creation.tsx` | Replace | Styled quiz creation panel |
| `frontend/src/components/features/practice/weak-areas-display.tsx` | Replace | Amber weak area cards per design.md |
| `frontend/src/components/features/practice/practice-page-client.tsx` | Modify | Layout and spacing fixes |
| `frontend/src/components/features/chat/chat-input.tsx` | Replace | Pill textarea + circle send button |
| `frontend/src/components/features/chat/chat-messages.tsx` | Replace | Message bubbles + citations + thinking state |
| `frontend/src/components/features/chat/thinking-indicator.tsx` | Create | Three-dot pulse animation |
| `frontend/src/app/(app)/quizzes/page.tsx` | Modify | Page layout with proper spacing |
| `frontend/src/app/(app)/practice/page.tsx` | Modify | Page layout with proper spacing |
| `frontend/src/app/(app)/chat/page.tsx` | Modify | Page layout cleanup |

---

## Chunk 1: Quiz List

### Task 1: Redesign quiz list

**Files:**
- Replace: `frontend/src/components/features/quiz/quiz-list.tsx`

- [ ] **Step 1: Replace quiz list**

```tsx
import Link from "next/link"
import { CheckSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface QuizItem {
  id: string
  question_count: number
  question_types: string[]
  created_at: string
}

interface QuizListProps {
  quizzes: QuizItem[]
}

const typeLabels: Record<string, string> = {
  mcq: "Multiple Choice",
  true_false: "True/False",
  identification: "Identification",
  multi_select: "Multi-Select",
  ordering: "Ordering",
}

export function QuizList({ quizzes }: QuizListProps) {
  if (!quizzes.length) {
    return (
      <div className="text-center py-12">
        <div className="size-12 rounded-xl bg-surface-subtle flex items-center justify-center mx-auto mb-3">
          <CheckSquare className="size-6 text-text-tertiary" />
        </div>
        <h3 className="text-sm font-medium text-text-primary mb-1">
          No quizzes yet
        </h3>
        <p className="text-xs text-text-tertiary">
          Upload and summarize a document first, then generate a quiz from it.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {quizzes.map((quiz) => (
        <Link
          key={quiz.id}
          href={`/quizzes/${quiz.id}`}
          className="block bg-surface-card border border-border-default rounded-xl p-4 hover:bg-surface-overlay hover:border-border-strong transition-colors-fast"
        >
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className="size-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
              <CheckSquare className="size-[18px] text-brand-400" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                Quiz {quiz.id.slice(0, 8)}
              </p>
              <p className="text-xs text-text-tertiary mt-0.5">
                {quiz.question_count} questions ·{" "}
                {new Date(quiz.created_at).toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            {/* Type badges */}
            <div className="flex gap-1 flex-shrink-0">
              {quiz.question_types.slice(0, 2).map((type) => (
                <Badge
                  key={type}
                  variant="secondary"
                  className="text-[11px] font-medium bg-brand-100 text-brand-800 hover:bg-brand-100"
                >
                  {typeLabels[type] || type}
                </Badge>
              ))}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/quiz/quiz-list.tsx
git commit -m "feat(frontend): redesign quiz list with cards and badges"
```

---

## Chunk 2: Quiz Creation

### Task 2: Redesign quiz creation panel

**Files:**
- Replace: `frontend/src/components/features/quiz/quiz-creation.tsx`

- [ ] **Step 1: Replace quiz creation**

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { GraduationCap } from "lucide-react"

interface QuizCreationProps {
  documents: { id: string; title: string }[]
}

export function QuizCreation({ documents }: QuizCreationProps) {
  const router = useRouter()
  const [selectedDoc, setSelectedDoc] = useState("")
  const [questionCount, setQuestionCount] = useState(10)
  const [isLoading, setIsLoading] = useState(false)

  const handleCreate = async () => {
    if (!selectedDoc) return
    setIsLoading(true)
    try {
      // TODO: Replace with actual API call
      // const result = await createQuiz({ document_id: selectedDoc, question_count: questionCount })
      // router.push(`/quizzes/${result.id}`)
      console.log("Creating quiz:", { selectedDoc, questionCount })
    } finally {
      setIsLoading(false)
    }
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 bg-surface-subtle rounded-xl">
        <GraduationCap className="size-8 text-text-tertiary mx-auto mb-2" />
        <p className="text-sm text-text-secondary">
          Upload a document first to generate a quiz
        </p>
      </div>
    )
  }

  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Quick Quiz</h2>
        <p className="text-xs text-text-tertiary mt-0.5">
          Generate a quiz from your uploaded notes
        </p>
      </div>

      {/* Document select */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-text-primary">Document</label>
        <select
          value={selectedDoc}
          onChange={(e) => setSelectedDoc(e.target.value)}
          className="w-full h-10 px-3 text-sm bg-surface-subtle border border-border-default rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-colors-fast text-text-primary"
        >
          <option value="">Select a document</option>
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.title}
            </option>
          ))}
        </select>
      </div>

      {/* Question count */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-text-primary">Questions</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={5}
            max={30}
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="flex-1 accent-brand-500"
          />
          <span className="text-sm font-medium text-text-primary w-8 text-center">
            {questionCount}
          </span>
        </div>
      </div>

      {/* Create button */}
      <Button
        variant="default"
        disabled={!selectedDoc || isLoading}
        onClick={handleCreate}
        className="w-full"
      >
        {isLoading ? "Creating..." : "Create Quiz"}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/quiz/quiz-creation.tsx
git commit -m "feat(frontend): redesign quiz creation panel with range slider"
```

---

## Chunk 3: Practice Weak Areas

### Task 3: Redesign weak areas display

**Files:**
- Replace: `frontend/src/components/features/practice/weak-areas-display.tsx`

- [ ] **Step 1: Replace weak areas display**

```tsx
"use client"

import { Target } from "lucide-react"
import { cn } from "@/lib/utils"

interface WeakAreaItem {
  topic: string
  accuracy: number
  attempts: number
  quizzes: number
}

interface WeakAreasDisplayProps {
  weakAreas: WeakAreaItem[]
  selectedTopics: string[]
  onToggleTopic: (topic: string) => void
}

export function WeakAreasDisplay({
  weakAreas,
  selectedTopics,
  onToggleTopic,
}: WeakAreasDisplayProps) {
  if (weakAreas.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="size-12 rounded-xl bg-surface-subtle flex items-center justify-center mx-auto mb-3">
          <Target className="size-6 text-text-tertiary" />
        </div>
        <h3 className="text-sm font-medium text-text-primary mb-1">
          No weak areas yet
        </h3>
        <p className="text-xs text-text-tertiary">
          Complete a few quizzes to discover your gaps.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {weakAreas.map((area) => {
        const isSelected = selectedTopics.includes(area.topic)
        return (
          <button
            key={area.topic}
            onClick={() => onToggleTopic(area.topic)}
            className={cn(
              "w-full bg-surface-card border border-border-default rounded-xl p-3.5 flex items-center gap-3 text-left transition-colors-fast",
              isSelected && "border-accent-500 bg-accent-500/4"
            )}
          >
            {/* Icon ring — amber per design.md */}
            <div
              className={cn(
                "size-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors-fast",
                isSelected
                  ? "bg-accent-500/15 border border-accent-500/20"
                  : "bg-accent-500/10 border border-accent-500/10"
              )}
            >
              <Target className="size-[18px] text-accent-500" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary mb-1">
                {area.topic}
              </p>
              <div className="h-[3px] bg-border-default rounded-full overflow-hidden mb-1">
                <div
                  className="h-full bg-accent-500 rounded-full"
                  style={{ width: `${area.accuracy}%` }}
                />
              </div>
              <p className="text-[11px] text-text-tertiary">
                {area.attempts} attempts across {area.quizzes} quizzes
              </p>
            </div>

            {/* Percentage */}
            <span className="text-base font-bold text-accent-500 flex-shrink-0">
              {area.accuracy}%
            </span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/practice/weak-areas-display.tsx
git commit -m "feat(frontend): redesign weak areas with amber cards per design.md"
```

---

## Chunk 4: Chat Interface

### Task 4: Create thinking indicator

**Files:**
- Create: `frontend/src/components/features/chat/thinking-indicator.tsx`

- [ ] **Step 1: Create thinking indicator**

```tsx
export function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="flex items-center gap-1">
        <span className="thinking-dot" />
        <span className="thinking-dot" />
        <span className="thinking-dot" />
      </div>
      <span className="text-xs text-text-tertiary">
        Searching your notes...
      </span>
    </div>
  )
}
```

Note: `.thinking-dot` CSS animation is already defined in `globals.css`.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/chat/thinking-indicator.tsx
git commit -m "feat(frontend): add thinking indicator with pulse animation"
```

### Task 5: Redesign chat input

**Files:**
- Replace: `frontend/src/components/features/chat/chat-input.tsx`

- [ ] **Step 1: Replace chat input**

```tsx
"use client"

import { useState, useRef, useEffect } from "react"
import { ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  disabled?: boolean
  isSending?: boolean
  onSend: (message: string) => Promise<void>
}

export function ChatInput({ disabled, isSending, onSend }: ChatInputProps) {
  const [message, setMessage] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async () => {
    if (!message.trim() || isSending || disabled) return
    await onSend(message.trim())
    setMessage("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    const textarea = e.target
    textarea.style.height = "auto"
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px"
  }

  const hasText = message.trim().length > 0

  return (
    <div className="bg-surface-card border-t border-border-default p-2.5 flex items-end gap-2">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything about your notes..."
        disabled={disabled || isSending}
        rows={1}
        className={cn(
          "flex-1 border border-border-default rounded-[20px] px-3.5 py-2.5 text-sm resize-none leading-[1.4] max-h-[120px] transition-colors-fast",
          "bg-surface-subtle text-text-primary placeholder:text-text-tertiary",
          "focus:border-brand-400 focus:outline-none",
          "disabled:opacity-50"
        )}
      />
      <button
        onClick={handleSubmit}
        disabled={!hasText || isSending || disabled}
        className={cn(
          "size-[34px] rounded-full border-none flex items-center justify-center transition-colors-fast flex-shrink-0",
          hasText
            ? "bg-brand-500 text-white hover:bg-brand-600"
            : "bg-surface-subtle text-text-tertiary",
          "disabled:opacity-50"
        )}
      >
        <ArrowUp className="size-4" />
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/chat/chat-input.tsx
git commit -m "feat(frontend): redesign chat input with pill textarea and circle send"
```

### Task 6: Redesign chat messages

**Files:**
- Replace: `frontend/src/components/features/chat/chat-messages.tsx`

- [ ] **Step 1: Replace chat messages**

```tsx
"use client"

import { useRef, useEffect } from "react"
import { FileText } from "lucide-react"
import { RichMarkdown } from "@/components/ui/rich-markdown"
import { ThinkingIndicator } from "./thinking-indicator"
import { cn } from "@/lib/utils"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: Array<{ chunk_id?: string | null }>
}

interface ChatMessagesProps {
  messages: ChatMessage[]
  isSearching: boolean
  error: string | null
}

export function ChatMessages({ messages, isSearching, error }: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages, isSearching])

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]"
    >
      {messages.length === 0 && !isSearching && (
        <div className="text-center py-12">
          <p className="text-sm text-text-tertiary">
            Select a document and ask a question to get started
          </p>
        </div>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            "flex",
            msg.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          {msg.role === "user" ? (
            <div className="max-w-[78%] bg-brand-500 text-white rounded-[16px_16px_4px_16px] px-3.5 py-2.5 text-[13px] leading-[1.5]">
              {msg.content}
            </div>
          ) : (
            <div className="max-w-[92%] space-y-1.5">
              <div className="text-sm leading-[1.65] text-text-primary">
                <RichMarkdown content={msg.content} />
              </div>

              {/* Citation pills */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {msg.citations.map((citation, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 bg-surface-subtle border border-border-default rounded-md px-2 py-0.5 text-[11px] text-text-secondary"
                    >
                      <FileText className="size-[11px] text-text-tertiary" />
                      Citation {i + 1}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Thinking state */}
      {isSearching && <ThinkingIndicator />}

      {/* Error */}
      {error && (
        <div className="text-center py-2">
          <p className="text-xs text-danger-500">{error}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/chat/chat-messages.tsx frontend/src/components/features/chat/thinking-indicator.tsx
git commit -m "feat(frontend): redesign chat messages with bubbles and citations"
```

### Task 7: Update chat page client layout

**Files:**
- Modify: `frontend/src/components/features/chat/chat-page-client.tsx`

- [ ] **Step 1: Update chat page client**

```tsx
"use client"

import { useMemo, useState } from "react"
import { ChatInput } from "./chat-input"
import { ChatMessages } from "./chat-messages"
import { DocumentSelector } from "./document-selector"
import { useSendChatMessage } from "@/hooks/use-chat"

type DocumentOption = {
  id: string
  title: string
}

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: Array<{ chunk_id?: string | null }>
}

export function ChatPageClient({
  documents,
  initialDocumentId,
}: {
  documents: DocumentOption[]
  initialDocumentId?: string
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialDocumentId ? [initialDocumentId] : []
  )
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const { mutateAsync, isLoading, error } = useSendChatMessage()

  const selectedDocumentId = useMemo(() => selectedIds[0], [selectedIds])

  const sendMessage = async (message: string) => {
    setMessages((previous) => [
      ...previous,
      { id: crypto.randomUUID(), role: "user", content: message },
    ])
    setIsSearching(true)
    try {
      const response = await mutateAsync({
        question: message,
        document_id: selectedDocumentId,
      })
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.answer,
          citations: response.citations as Array<{ chunk_id?: string | null }>,
        },
      ])
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] h-[calc(100vh-200px)] min-h-[400px]">
      {/* Document selector sidebar */}
      <div className="hidden lg:block">
        <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden">
          <div className="p-3 border-b border-border-default">
            <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
              Context
            </h3>
          </div>
          <DocumentSelector
            documents={documents}
            selectedIds={selectedIds}
            onToggle={(id) => {
              setSelectedIds((previous) =>
                previous.includes(id)
                  ? previous.filter((item) => item !== id)
                  : [...previous, id]
              )
            }}
          />
        </div>
      </div>

      {/* Chat area */}
      <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-border-default flex items-center gap-2">
          <div className="size-2 rounded-full bg-success-500" />
          <span className="text-sm font-medium text-text-primary">
            Chat with your notes
          </span>
          {selectedDocumentId && (
            <span className="ml-auto text-[11px] text-text-tertiary bg-surface-subtle border border-border-default rounded-md px-2 py-0.5">
              {documents.find((d) => d.id === selectedDocumentId)?.title || "Document"}
            </span>
          )}
        </div>

        {/* Messages */}
        <ChatMessages
          error={error}
          isSearching={isSearching}
          messages={messages}
        />

        {/* Input */}
        <ChatInput
          disabled={!selectedIds.length}
          isSending={isLoading}
          onSend={sendMessage}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/chat/chat-page-client.tsx
git commit -m "feat(frontend): polish chat layout with card container and header"
```

---

## Chunk 5: Page Layouts

### Task 8: Update quizzes page layout

**Files:**
- Modify: `frontend/src/app/(app)/quizzes/page.tsx`

- [ ] **Step 1: Update quizzes page**

Add page header and proper spacing:

```tsx
// Add to the return statement, before the grid:
<div className="space-y-6">
  <div>
    <h1 className="text-xl font-semibold text-text-primary">Quizzes</h1>
    <p className="text-sm text-text-secondary mt-1">
      Test your understanding with auto-generated questions
    </p>
  </div>
  
  <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
    <QuizList quizzes={quizzes} />
    <QuizCreation documents={documents} />
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/\(app\)/quizzes/page.tsx
git commit -m "feat(frontend): add page header to quizzes layout"
```

### Task 9: Update practice page layout

**Files:**
- Modify: `frontend/src/app/(app)/practice/page.tsx`

- [ ] **Step 1: Update practice page**

Add page header:

```tsx
// Add to the return statement:
<div className="space-y-6">
  <div>
    <h1 className="text-xl font-semibold text-text-primary">Targeted Practice</h1>
    <p className="text-sm text-text-secondary mt-1">
      Focus on what you need to improve most
    </p>
  </div>
  
  {/* existing PracticePageClient */}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/\(app\)/practice/page.tsx
git commit -m "feat(frontend): add page header to practice layout"
```

### Task 10: Update chat page layout

**Files:**
- Modify: `frontend/src/app/(app)/chat/page.tsx`

- [ ] **Step 1: Update chat page**

Update header styling to match design system:

```tsx
<header className="space-y-1">
  <h1 className="text-xl font-semibold text-text-primary">Grounded Chat</h1>
  <p className="text-sm text-text-secondary">
    Ask questions using only your uploaded notes and review citations.
  </p>
</header>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/\(app\)/chat/page.tsx
git commit -m "feat(frontend): update chat page header with design tokens"
```

---

## Chunk 6: Token Cleanup for Remaining Components

### Task 11: Audit quiz and practice components for token drift

**Files:**
- Various in `frontend/src/components/features/quiz/` and `frontend/src/components/features/practice/`

- [ ] **Step 1: Find token drift**

Run grep to find non-brand colors:
```bash
cd frontend/src/components/features/quiz && grep -r "zinc-\|green-\|blue-\|gray-\|yellow-\|red-" --include="*.tsx" | grep -v "node_modules"
cd frontend/src/components/features/practice && grep -r "zinc-\|green-\|blue-\|gray-\|yellow-\|red-" --include="*.tsx" | grep -v "node_modules"
```

- [ ] **Step 2: Fix any drift found**

Replace with brand tokens per `docs/superpowers/plans/2026-04-24-token-cleanup.md` mapping.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "fix(frontend): token cleanup in quiz and practice components"
```

---

## Chunk 7: Verification

### Task 12: Run tests and lint

- [ ] **Step 1: Run lint**

Run: `pnpm run lint` in `frontend/`
Expected: No errors

- [ ] **Step 2: Run tests**

Run: `pnpm run test:run` in `frontend/`
Expected: All tests pass

### Task 13: Verify dev server

- [ ] **Step 1: Start dev server**

Run: `pnpm run dev` in `frontend/`

- [ ] **Step 2: Verify quizzes**

Navigate to `/quizzes` and verify:
- Page title "Quizzes" with subtitle
- Quiz list shows cards with question count, date, type badges
- Empty state shows icon + message when no quizzes
- Quiz creation panel on right (desktop) or below (mobile)
- Document dropdown, range slider for question count
- "Create Quiz" button

- [ ] **Step 3: Verify practice**

Navigate to `/practice` and verify:
- Page title "Targeted Practice"
- Weak areas shown as amber cards with target icon
- Empty state when no weak areas
- Clicking weak area selects it (amber border)
- Progress bars visible
- Percentage in amber

- [ ] **Step 4: Verify chat**

Navigate to `/chat` and verify:
- Page title "Grounded Chat"
- Document selector sidebar on desktop
- Chat card with rounded corners and border
- Header shows green status dot + title + document chip
- User messages: brand-500 bubbles, right-aligned
- Assistant messages: plain text, left-aligned
- Thinking indicator: 3 pulsing dots + "Searching your notes..."
- Citation pills below assistant messages
- Pill textarea auto-resizes (max 120px)
- Circle send button: subtle when empty, brand-500 when text entered
- Enter sends, Shift+Enter adds newline
- Empty state when no messages

- [ ] **Step 5: Verify mobile**

Resize to 390px and verify:
- Quizzes: cards full width, creation panel below
- Practice: weak area cards full width
- Chat: no sidebar, full-width chat card, input accessible
- Bottom nav visible and functional
- Touch targets >= 44px

- [ ] **Step 6: Verify dark mode**

Toggle dark mode and verify:
- Quiz cards switch to dark surfaces
- Practice amber colors remain visible
- Chat bubbles readable
- Thinking dots visible
- Citation pills readable
- No light leaks

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat(frontend): complete quiz, practice, and chat polish"
```

---

## Notes

- Chat attempt wizard and quiz generation form are NOT fully redesigned in this plan. They receive token cleanup only. Full redesign of those complex flows should be a separate plan.
- The `ThinkingIndicator` reuses the `.thinking-dot` CSS animation already defined in `globals.css`.
- `RichMarkdown` is assumed to exist and handle AI response rendering. If it doesn't render prose correctly, check `globals.css` `.prose-brand` overrides.
- Document selector sidebar is hidden on mobile (<1024px). Mobile users select documents via the existing document selector or a collapsible panel.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-24-quiz-practice-chat-polish.md`. Ready to execute?**
