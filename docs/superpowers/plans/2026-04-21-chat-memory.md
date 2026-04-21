# Chat Memory & UI Fading Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a stateless chat bounded to 8 messages of history, with a UI that fades older messages.

**Architecture:** React state array for messages. `POST` request payload sends `messages.slice(-8)`. Tailwind classes visually indicate context boundaries.

**Tech Stack:** Next.js Client Components, Tailwind.

---

## Chunk 1: Frontend Logic

### Task 1: Bound Chat History in Request

**Files:**
- Modify: `frontend/src/components/features/chat/chat-interface.tsx` (or where form is submitted)

- [ ] **Step 1: Slice Messages Array**
When calling `fetch("/api/chat")`, modify the payload:
```typescript
const contextMessages = messages.slice(-8);
const response = await fetch("/api/chat", {
  body: JSON.stringify({ messages: contextMessages, ... }),
});
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/components/features/chat/
git commit -m "feat: slice chat messages sent to backend to save tokens"
```

### Task 2: Implement UI Fading

**Files:**
- Modify: `frontend/src/components/features/chat/message-list.tsx`

- [ ] **Step 1: Apply Tailwind Opacity**
```tsx
messages.map((msg, index) => {
  const isOld = index < messages.length - 8;
  return (
    <div key={msg.id} className={isOld ? "opacity-50 grayscale transition-all duration-300" : ""}>
      <ChatMessage message={msg} />
    </div>
  );
})
```

- [ ] **Step 2: Add Explainer Tooltip**
Add a sticky badge at the top: "To keep responses sharp, only the last 8 messages are used as context." Include the "Searching your notes..." loading state.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/components/features/chat/message-list.tsx
git commit -m "feat: implement fading ui for old chat messages"
```
