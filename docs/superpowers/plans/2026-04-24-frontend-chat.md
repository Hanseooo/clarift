# Chat Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the chat interface with Aceternity/21st.dev-inspired styling while maintaining consistency with the rest of the UI. Pill textarea, circle send button, thinking animation, citation pills, and full light/dark mode support.

**Architecture:** Server Component page fetches documents list. Client component orchestrates the chat with document selector sidebar, message thread, and input bar. Reuses `<RichMarkdown>` for AI responses.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Framer Motion, Lucide React

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/app/(app)/chat/page.tsx` | Replace | Chat page (Server Component) |
| `frontend/src/components/features/chat/chat-page-client.tsx` | Replace | Chat orchestration client |
| `frontend/src/components/features/chat/chat-input.tsx` | Replace | Pill textarea + circle send button |
| `frontend/src/components/features/chat/chat-messages.tsx` | Replace | Message thread with thinking animation |
| `frontend/src/components/features/chat/document-selector.tsx` | Replace | Document context selector |
| `frontend/src/components/features/chat/thinking-indicator.tsx` | Create | Three-dot pulse animation |

---

## Chunk 1: Thinking Indicator

### Task 1: Create thinking indicator component

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

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/chat/thinking-indicator.tsx
git commit -m "feat(frontend): add thinking indicator with pulse animation"
```

---

## Chunk 2: Chat Input

### Task 2: Update chat input

**Files:**
- Modify: `frontend/src/components/features/chat/chat-input.tsx`

- [ ] **Step 1: Read current chat input**

Read the file to understand existing logic.

- [ ] **Step 2: Replace with redesigned input**

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
    // Reset textarea height
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
    // Auto-resize
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

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/chat/chat-input.tsx
git commit -m "feat(frontend): redesign chat input with pill textarea and circle send"
```

---

## Chunk 3: Chat Messages

### Task 3: Update chat messages

**Files:**
- Modify: `frontend/src/components/features/chat/chat-messages.tsx`

- [ ] **Step 1: Read current chat messages**

Read the file to understand existing message rendering.

- [ ] **Step 2: Replace with redesigned messages**

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
  citations?: { title: string; page: number }[]
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
      className="flex-1 overflow-y-auto p-4 space-y-3"
    >
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            "flex",
            msg.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          {msg.role === "user" ? (
            // User message — bubble
            <div
              className="max-w-[78%] bg-brand-500 text-white rounded-[16px_16px_4px_16px] px-3.5 py-2.5 text-[13px] leading-[1.5]"
            >
              {msg.content}
            </div>
          ) : (
            // Assistant message — plain text with optional callout
            <div className="max-w-[92%] space-y-1.5">
              <RichMarkdown
                content={msg.content}
                className="text-sm leading-[1.65] text-text-primary"
              />

              {/* Citation pills */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {msg.citations.map((citation, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 bg-surface-subtle border border-border-default rounded-md px-2 py-0.5 text-[11px] text-text-secondary"
                    >
                      <FileText className="size-[11px] text-text-tertiary" />
                      {citation.title} · p.{citation.page}
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

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/chat/chat-messages.tsx
git commit -m "feat(frontend): redesign chat messages with bubbles and citations"
```

---

## Chunk 4: Document Selector

### Task 4: Update document selector

**Files:**
- Modify: `frontend/src/components/features/chat/document-selector.tsx`

- [ ] **Step 1: Read current document selector**

Read the file to understand existing logic.

- [ ] **Step 2: Replace with redesigned selector**

```tsx
"use client"

import { FileText } from "lucide-react"
import { cn } from "@/lib/utils"

interface DocumentOption {
  id: string
  title: string
}

interface DocumentSelectorProps {
  documents: DocumentOption[]
  selectedIds: string[]
  onToggle: (id: string) => void
}

export function DocumentSelector({
  documents,
  selectedIds,
  onToggle,
}: DocumentSelectorProps) {
  if (documents.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs text-text-tertiary">
          No documents available
        </p>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-1">
      <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide px-2 mb-2">
        Context
      </p>
      {documents.map((doc) => {
        const isSelected = selectedIds.includes(doc.id)
        return (
          <button
            key={doc.id}
            onClick={() => onToggle(doc.id)}
            className={cn(
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors-fast",
              isSelected
                ? "bg-brand-500/4 text-brand-500"
                : "text-text-secondary hover:bg-surface-overlay"
            )}
          >
            <FileText className="size-4 flex-shrink-0" />
            <span className="text-xs truncate">{doc.title}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/chat/document-selector.tsx
git commit -m "feat(frontend): redesign document selector with brand tokens"
```

---

## Chunk 5: Chat Page Client

### Task 5: Update chat page client

**Files:**
- Modify: `frontend/src/components/features/chat/chat-page-client.tsx`

- [ ] **Step 1: Read current chat page client**

Read the file to understand existing orchestration logic.

- [ ] **Step 2: Replace with redesigned client**

Structure:
- Outer card with rounded-2xl, border-default, overflow-hidden
- Header: status dot + title + document context chip
- Message thread (scrollable)
- Input bar (sticky bottom)
- Desktop: document selector sidebar on the left
- Mobile: document selector as a collapsible panel

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/chat/chat-page-client.tsx
git commit -m "feat(frontend): redesign chat page client with Aceternity polish"
```

---

## Chunk 6: Chat Page

### Task 6: Update chat page

**Files:**
- Modify: `frontend/src/app/(app)/chat/page.tsx`

- [ ] **Step 1: Read current chat page**

Read the file to understand data fetching.

- [ ] **Step 2: Update page**

```tsx
export default async function ChatPage() {
  // Fetch documents from backend API
  return (
    <div>
      <ChatPageClient documents={documents} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(app\)/chat/page.tsx
git commit -m "feat(frontend): update chat page layout"
```

---

## Chunk 7: Verification

### Task 7: Run tests and lint

- [ ] **Step 1: Run lint**

Run: `pnpm run lint` in `frontend/`
Expected: No errors

### Task 8: Verify dev server

- [ ] **Step 1: Start dev server**

Run: `pnpm run dev` in `frontend/`

- [ ] **Step 2: Verify chat**

Navigate to `/chat` and verify:
- Outer card with rounded corners and border
- Header shows status dot (green) + "Chat with your notes" + document context chip
- User messages appear as brand-500 bubbles on the right
- Assistant messages appear as plain text on the left
- Thinking indicator shows three-dot pulse with "Searching your notes..."
- Citation pills appear below assistant messages
- Pill textarea auto-resizes (max 120px)
- Circle send button changes from subtle to brand-500 when text entered
- Enter sends, Shift+Enter adds newline
- Document selector sidebar visible on desktop
- Dark mode: all colors switch correctly

### Task 9: Final commit

- [ ] **Step 1: Commit all remaining changes**

```bash
git add -A
git commit -m "feat(frontend): complete chat redesign with Aceternity polish"
```

---

**Plan complete.** Ready to execute?
