# Chat Memory & Cross-Page State Management Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a Zustand store for cross-page chat state, bound chat history to the last 8 messages in API requests, and add UI fading for older messages.

**Architecture:** A global Zustand store (`useChatStore`) holds messages and selected document IDs. The chat API request sends only `messages.slice(-8)`. Tailwind opacity classes visually fade messages outside the context window.

**Tech Stack:** Next.js 15, React, Zustand, Tailwind, FastAPI

---

## File Structure

| File | Responsibility |
|---|---|
| `frontend/package.json` | Add `zustand` dependency |
| `frontend/src/stores/chat-store.ts` | NEW — Zustand store for chat messages and doc selection |
| `frontend/src/components/features/chat/chat-page-client.tsx` | Use store instead of local useState |
| `frontend/src/hooks/use-chat.ts` | Update API call to include message history |
| `frontend/src/components/features/chat/message-list.tsx` | Add fading UI for old messages |
| `frontend/src/components/features/chat/chat-interface.tsx` | Send sliced messages to backend |
| `backend/src/api/v1/routers/chat.py` | Accept `messages` array in request body |
| `backend/src/api/v1/schemas/chat.py` | Update request schema |
| `backend/src/services/chat_service.py` | Build context from message history + chunks |

---

## Chunk 1: Install Zustand & Create Store

### Task 1: Install Zustand

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install dependency**

```bash
cd frontend
pnpm add zustand
```

- [ ] **Step 2: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml
git commit -m "deps: add zustand for client state management"
```

### Task 2: Create Chat Store

**Files:**
- Create: `frontend/src/stores/chat-store.ts`

- [ ] **Step 1: Write store**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{ chunk_id?: string | null }>;
  timestamp: number;
}

interface ChatState {
  messages: ChatMessage[];
  selectedDocumentIds: string[];
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  setSelectedDocumentIds: (ids: string[]) => void;
  getRecentMessages: (count: number) => ChatMessage[];
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      selectedDocumentIds: [],
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),
      clearMessages: () => set({ messages: [] }),
      setSelectedDocumentIds: (ids) => set({ selectedDocumentIds: ids }),
      getRecentMessages: (count) => {
        const { messages } = get();
        return messages.slice(-count);
      },
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        messages: state.messages.slice(-50), // Keep last 50 in storage
        selectedDocumentIds: state.selectedDocumentIds,
      }),
    }
  )
);
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/stores/chat-store.ts
git commit -m "feat: add zustand chat store with persistence"
```

---

## Chunk 2: Frontend — Update Chat Components

### Task 3: Update ChatPageClient

**Files:**
- Modify: `frontend/src/components/features/chat/chat-page-client.tsx`

- [ ] **Step 1: Replace local state with store**

```typescript
import { useChatStore } from '@/stores/chat-store';

export function ChatPageClient({ documents, initialDocumentId }) {
  const { messages, selectedDocumentIds, setSelectedDocumentIds, addMessage, clearMessages } = useChatStore();
  const [isSearching, setIsSearching] = useState(false);

  // Initialize selected docs if empty and initialDocumentId provided
  useEffect(() => {
    if (initialDocumentId && selectedDocumentIds.length === 0) {
      setSelectedDocumentIds([initialDocumentId]);
    }
  }, [initialDocumentId]);

  // ... rest of component
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/chat/chat-page-client.tsx
git commit -m "feat: use zustand store in chat page client"
```

### Task 4: Update useChat Hook

**Files:**
- Modify: `frontend/src/hooks/use-chat.ts`

- [ ] **Step 1: Update API call to include message history**

```typescript
interface ChatPayload {
  question: string;
  document_id: string;
  messages: Array<{ role: string; content: string }>;
}

export function useChat() {
  const sendMessage = async (payload: ChatPayload) => {
    const { data, error } = await authClient.POST('/api/v1/chat', {
      body: {
        question: payload.question,
        document_id: payload.document_id,
        messages: payload.messages.slice(-8), // Send only last 8
      },
    });
    // ...
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/use-chat.ts
git commit -m "feat: send last 8 messages in chat API request"
```

### Task 5: Update ChatInterface

**Files:**
- Modify: `frontend/src/components/features/chat/chat-interface.tsx`

- [ ] **Step 1: Build message payload with history**

```typescript
import { useChatStore } from '@/stores/chat-store';

export function ChatInterface() {
  const { messages, addMessage, getRecentMessages, selectedDocumentIds } = useChatStore();
  const { mutateAsync } = useChat();

  const handleSend = async (question: string) => {
    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: question,
      timestamp: Date.now(),
    };
    addMessage(userMessage);

    const contextMessages = getRecentMessages(8).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await mutateAsync({
        question,
        document_id: selectedDocumentIds[0], // or selectedDocumentIds for multi
        messages: contextMessages,
      });

      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.answer,
        citations: response.citations,
        timestamp: Date.now(),
      });
    } catch (error) {
      // Handle error
    }
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/chat/chat-interface.tsx
git commit -m "feat: integrate chat store with message sending"
```

### Task 6: Add UI Fading for Old Messages

**Files:**
- Modify: `frontend/src/components/features/chat/message-list.tsx`

- [ ] **Step 1: Apply opacity based on message age**

```typescript
import { useChatStore } from '@/stores/chat-store';

const CONTEXT_WINDOW_SIZE = 8;

export function MessageList() {
  const { messages } = useChatStore();

  return (
    <div className="space-y-4">
      {messages.length > CONTEXT_WINDOW_SIZE && (
        <div className="sticky top-0 z-10 rounded-md bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
          To keep responses sharp, only the last {CONTEXT_WINDOW_SIZE} messages are used as context.
        </div>
      )}
      {messages.map((msg, index) => {
        const isInContext = index >= messages.length - CONTEXT_WINDOW_SIZE;
        return (
          <div
            key={msg.id}
            className={cn(
              'transition-all duration-300',
              !isInContext && 'opacity-50 grayscale'
            )}
          >
            <ChatMessage message={msg} />
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/chat/message-list.tsx
git commit -m "feat: add fading UI for messages outside context window"
```

---

## Chunk 3: Backend — Accept Message History

### Task 7: Update Chat Request Schema

**Files:**
- Modify: `backend/src/api/v1/schemas/chat.py`

- [ ] **Step 1: Add messages field**

```python
from pydantic import BaseModel
from uuid import UUID

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    question: str
    document_id: UUID
    messages: list[ChatMessage] = []  # NEW: historical context
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/api/v1/schemas/chat.py
git commit -m "feat: add messages array to chat request schema"
```

### Task 8: Update Chat Service

**Files:**
- Modify: `backend/src/services/chat_service.py`

- [ ] **Step 1: Build context from message history**

```python
async def chat(
    message: str,
    document_ids: list[UUID],
    user_id: UUID,
    db: AsyncSession,
    messages: list[dict] = None,  # NEW
) -> AsyncGenerator[str, None]:
    # 1. Retrieve chunks
    chunks = await retrieve_chunks(
        query=message,
        user_id=user_id,
        document_ids=document_ids,
        limit=5,
        db=db,
    )

    if not chunks:
        yield CHAT_FALLBACK_MESSAGE
        return

    # 2. Build context with citations
    context = build_context_with_citations(chunks)

    # 3. Build conversation history
    history = ""
    if messages:
        history = "\n".join(
            f"{m['role'].capitalize()}: {m['content']}" for m in messages[-8:]
        )
        history = f"Previous conversation:\n{history}\n\n"

    # 4. Stream response
    async for token in gemini_flash_lite.stream(
        system=CHAT_SYSTEM_PROMPT,
        human=f"{history}Context:\n{context}\n\nQuestion: {message}"
    ):
        yield token
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/chat_service.py
git commit -m "feat: include message history in chat context"
```

### Task 9: Update Chat Router

**Files:**
- Modify: `backend/src/api/v1/routers/chat.py`

- [ ] **Step 1: Pass messages to service**

```python
@router.post("/chat")
async def chat_endpoint(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return StreamingResponse(
        chat_service.chat(
            message=request.question,
            document_ids=[request.document_id],
            user_id=current_user.id,
            db=db,
            messages=[m.model_dump() for m in request.messages],  # NEW
        ),
        media_type="text/event-stream",
    )
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/api/v1/routers/chat.py
git commit -m "feat: pass message history from router to chat service"
```

---

## Chunk 4: Testing & Verification

### Task 10: Backend Tests

**Files:**
- Create/Modify: `backend/tests/test_chat.py`

- [ ] **Step 1: Test with message history**

```python
def test_chat_with_history():
    response = client.post("/api/v1/chat", json={
        "question": "What about X?",
        "document_id": str(doc_id),
        "messages": [
            {"role": "user", "content": "Tell me about Y"},
            {"role": "assistant", "content": "Y is..."},
        ]
    })
    assert response.status_code == 200
```

- [ ] **Step 2: Test empty messages (backward compat)**

```python
def test_chat_without_history():
    response = client.post("/api/v1/chat", json={
        "question": "What is X?",
        "document_id": str(doc_id),
    })
    assert response.status_code == 200
```

- [ ] **Step 3: Run tests**

```bash
cd backend
pytest tests/test_chat.py -v
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/tests/test_chat.py
git commit -m "test: add chat history tests"
```

### Task 11: Frontend Tests

**Files:**
- Create: `frontend/src/stores/__tests__/chat-store.test.ts`

- [ ] **Step 1: Write store tests**

```typescript
import { useChatStore } from '../chat-store';

describe('chat store', () => {
  beforeEach(() => {
    useChatStore.setState({ messages: [], selectedDocumentIds: [] });
  });

  it('adds messages', () => {
    useChatStore.getState().addMessage({
      id: '1',
      role: 'user',
      content: 'Hello',
      timestamp: Date.now(),
    });
    expect(useChatStore.getState().messages).toHaveLength(1);
  });

  it('returns last N messages', () => {
    const store = useChatStore.getState();
    for (let i = 0; i < 10; i++) {
      store.addMessage({ id: String(i), role: 'user', content: String(i), timestamp: Date.now() });
    }
    expect(store.getRecentMessages(8)).toHaveLength(8);
    expect(store.getRecentMessages(8)[0].content).toBe('2');
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd frontend
pnpm run test:run src/stores/__tests__/chat-store.test.ts
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/stores/__tests__/
git commit -m "test: add chat store unit tests"
```

### Task 12: Regenerate API Types

- [ ] **Step 1: Generate types**

```bash
cd frontend
pnpm run generate:api
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "chore: regenerate api types with chat messages"
```

---

## Verification Checklist

- [ ] Zustand store persists across page navigation
- [ ] Chat messages survive browser refresh (last 50 stored)
- [ ] Only last 8 messages sent to backend
- [ ] Backend includes history in LLM context
- [ ] Messages outside context window appear faded (opacity-50 grayscale)
- [ ] Sticky banner explains the 8-message limit
- [ ] Empty `messages` array works (backward compatibility)
- [ ] Backend tests pass
- [ ] Frontend tests pass
- [ ] Ruff and Biome pass

---

## Rollout Notes

- **Deployment order:** Backend first (new `messages` field must be accepted), then frontend.
- **Backward compatibility:** Old frontend clients that don't send `messages` still work — the field defaults to `[]`.
- **Storage limit:** Zustand `persist` middleware stores last 50 messages to prevent unbounded localStorage growth.
