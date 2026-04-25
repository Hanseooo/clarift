# Mobile Responsiveness & Navigation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable swipe-to-delete on mobile for all card types, improve bottom navigation active states, and add dismissible chat context notice.

**Architecture:** Create reusable `SwipeCard` wrapper with touch gesture handling, apply it to document/summary/quiz cards, add missing delete Server Actions, polish mobile bottom nav, and make chat context notice dismissible.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS 4, shadcn/ui, Drizzle ORM, Lucide React

---

## Chunk 1: SwipeCard Component

**Files:**
- Create: `frontend/src/components/ui/swipe-card.tsx`

- [ ] **Step 1: Create SwipeCard component with touch gesture handling**

Create `frontend/src/components/ui/swipe-card.tsx`:

```tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SwipeCardProps {
  children: React.ReactNode;
  onDelete: () => Promise<void>;
  deleteConfirmation?: string;
  disabled?: boolean;
}

const SWIPE_REVEAL_THRESHOLD = 80;
const SWIPE_AUTO_TRIGGER_THRESHOLD = 160;

export function SwipeCard({
  children,
  onDelete,
  deleteConfirmation = "Are you sure you want to delete this item?",
  disabled = false,
}: SwipeCardProps) {
  const [offset, setOffset] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      startX.current = e.touches[0].clientX;
      currentX.current = e.touches[0].clientX;
      isDragging.current = true;
    },
    [disabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging.current || disabled) return;

      const touchX = e.touches[0].clientX;
      const deltaX = touchX - startX.current;

      // Only allow left swipe (negative delta)
      if (deltaX < 0) {
        currentX.current = touchX;
        setOffset(Math.max(deltaX, -SWIPE_AUTO_TRIGGER_THRESHOLD));
        setIsRevealed(Math.abs(deltaX) >= SWIPE_REVEAL_THRESHOLD);
      }
    },
    [disabled]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const deltaX = currentX.current - startX.current;

    if (Math.abs(deltaX) >= SWIPE_AUTO_TRIGGER_THRESHOLD) {
      setShowDialog(true);
      setOffset(0);
      setIsRevealed(false);
    } else if (Math.abs(deltaX) >= SWIPE_REVEAL_THRESHOLD) {
      // Keep revealed state
      setOffset(-SWIPE_REVEAL_THRESHOLD);
    } else {
      // Snap back
      setOffset(0);
      setIsRevealed(false);
    }
  }, []);

  const handleDelete = async () => {
    setOffset(0);
    setIsRevealed(false);
    await onDelete();
  };

  const handleSnapBack = () => {
    setOffset(0);
    setIsRevealed(false);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Delete panel behind the card */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-danger-500 transition-opacity duration-150"
        style={{ opacity: isRevealed ? 1 : 0 }}
      >
        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogTrigger asChild>
            <button
              className="p-2 text-white"
              onClick={() => setShowDialog(true)}
              aria-label="Delete item"
            >
              <Trash2 className="size-5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Confirmation</AlertDialogTitle>
              <AlertDialogDescription>{deleteConfirmation}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleSnapBack}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-danger-500 hover:bg-danger-600"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Card content */}
      <div
        className="relative transition-transform duration-200 ease-out"
        style={{
          transform: `translateX(${offset}px)`,
          touchAction: "pan-y",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={isRevealed ? handleSnapBack : undefined}
        role="button"
        aria-label="Swipe left to delete"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Delete") {
            setShowDialog(true);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit SwipeCard component**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/components/ui/swipe-card.tsx
git commit -m "feat(ui): add SwipeCard component for mobile swipe-to-delete"
```

---

## Chunk 2: SwipeHint Component

**Files:**
- Create: `frontend/src/components/ui/swipe-hint.tsx`

- [ ] **Step 3: Create SwipeHint component**

Create `frontend/src/components/ui/swipe-hint.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

const SWIPE_HINT_KEY = "swipe-hint-dismissed";

interface SwipeHintProps {
  message?: string;
}

export function SwipeHint({ message = "Swipe left on cards to delete" }: SwipeHintProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(SWIPE_HINT_KEY);
    if (!dismissed) {
      setIsVisible(true);
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem(SWIPE_HINT_KEY, "true");
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="md:hidden fixed left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-surface-subtle text-text-secondary text-xs px-3 py-1.5 rounded-full shadow-sm border border-border-default"
      style={{ bottom: "calc(56px + env(safe-area-inset-bottom) + 8px)" }}
    >
      <span>{message}</span>
      <button
        onClick={handleDismiss}
        className="p-0.5 hover:text-text-primary transition-colors"
        aria-label="Dismiss hint"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Commit SwipeHint component**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/components/ui/swipe-hint.tsx
git commit -m "feat(ui): add SwipeHint component for mobile delete instruction"
```

---

## Chunk 3: Delete Summary Server Action

**Files:**
- Modify: `frontend/src/app/actions/summaries.ts`

- [ ] **Step 5: Append deleteSummary to summaries.ts**

Add to the end of `frontend/src/app/actions/summaries.ts`:

```typescript
export async function deleteSummary(summaryId: string) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return { success: false, error: "Unauthorized" };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db
      .delete(summaries)
      .where(and(
        eq(summaries.id, summaryId),
        eq(summaries.userId, user.id),
      ));

    revalidatePath("/summaries");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete summary:", error);
    return { success: false, error: "Failed to delete summary" };
  }
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 7: Commit deleteSummary action**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/app/actions/summaries.ts
git commit -m "feat(actions): add deleteSummary Server Action"
```

---

## Chunk 4: Delete Quiz Server Action

**Files:**
- Modify: `frontend/src/app/actions/quizzes.ts`

- [ ] **Step 8: Append deleteQuiz to quizzes.ts**

Add to the end of `frontend/src/app/actions/quizzes.ts`:

```typescript
export async function deleteQuiz(quizId: string) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return { success: false, error: "Unauthorized" };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db
      .delete(quizzes)
      .where(and(
        eq(quizzes.id, quizId),
        eq(quizzes.userId, user.id),
      ));

    revalidatePath("/quizzes");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete quiz:", error);
    return { success: false, error: "Failed to delete quiz" };
  }
}
```

- [ ] **Step 9: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 10: Commit deleteQuiz action**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/app/actions/quizzes.ts
git commit -m "feat(actions): add deleteQuiz Server Action"
```

---

## Chunk 5: Document Card Integration

**Files:**
- Modify: `frontend/src/components/features/documents/document-card.tsx`

- [ ] **Step 11: Wrap DocumentCard with SwipeCard**

Modify `frontend/src/components/features/documents/document-card.tsx`:

```tsx
import Link from "next/link"
import { FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SwipeCard } from "@/components/ui/swipe-card"
import { DeleteDocumentButton } from "./delete-document-button"
import { deleteDocument } from "@/app/actions/documents"

interface DocumentCardProps {
  id: string
  title: string
  status: "pending" | "processing" | "ready" | "failed"
  createdAt: Date | string
  showDelete?: boolean
}

export function DocumentCard({ id, title, status, createdAt, showDelete = true }: DocumentCardProps) {
  const dateStr = typeof createdAt === "string"
    ? createdAt
    : createdAt.toLocaleDateString("en-PH", { month: "short", day: "numeric" })

  const handleDelete = async () => {
    await deleteDocument(id);
  };

  const cardContent = (
    <div className="group bg-surface-card border border-border-default rounded-xl p-4 flex items-center gap-3 hover:bg-surface-overlay hover:border-border-strong transition-colors-fast">
      {/* Icon box */}
      <div className="size-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
        <FileText className="size-[18px] text-brand-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/documents/${id}`}
          className="text-sm font-medium text-text-primary hover:text-brand-500 transition-colors-fast truncate block"
        >
          {title}
        </Link>
        <p className="text-xs text-text-tertiary mt-0.5">
          {dateStr}
        </p>
      </div>

      {/* Status + Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant={status}>
          {status}
        </Badge>
        {showDelete && (
          <div className="hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
            <DeleteDocumentButton documentId={id} />
          </div>
        )}
      </div>
    </div>
  );

  if (!showDelete || status === "processing" || status === "pending") {
    return cardContent;
  }

  return (
    <SwipeCard
      onDelete={handleDelete}
      deleteConfirmation="Delete this document and all associated summaries and quizzes?"
    >
      {cardContent}
    </SwipeCard>
  );
}
```

- [ ] **Step 12: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 13: Commit DocumentCard changes**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/components/features/documents/document-card.tsx
git commit -m "feat(documents): add swipe-to-delete on mobile"
```

---

## Chunk 6: Summary Card Integration

**Files:**
- Modify: `frontend/src/components/features/summary/summary-card.tsx`

- [ ] **Step 14: Add SwipeCard + desktop delete to SummaryCard**

Modify `frontend/src/components/features/summary/summary-card.tsx`:

```tsx
import Link from "next/link";
import { BookOpen, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RenameTitle } from "@/components/features/rename-title";
import { updateSummaryTitle, deleteSummary } from "@/app/actions/summaries";
import { SwipeCard } from "@/components/ui/swipe-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SummaryCardProps {
  id: string;
  documentId: string;
  title: string | null;
  createdAt: string;
}

export function SummaryCard({ id, title, createdAt }: SummaryCardProps) {
  const dateStr = new Date(createdAt).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const displayTitle = title ?? "Untitled summary";

  const handleDelete = async () => {
    await deleteSummary(id);
  };

  const cardContent = (
    <div className="group bg-surface-card border border-border-default rounded-xl p-4 flex items-center gap-3 hover:bg-surface-overlay hover:border-border-strong transition-colors-fast">
      {/* Icon box */}
      <div className="size-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
        <BookOpen className="size-[18px] text-brand-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/summaries/${id}`}
          className="text-sm font-medium text-text-primary hover:text-brand-500 transition-colors-fast truncate block"
        >
          <RenameTitle
            id={id}
            currentTitle={displayTitle}
            onSave={updateSummaryTitle}
          />
        </Link>
        <p className="text-xs text-text-tertiary mt-0.5">
          {dateStr}
        </p>
      </div>

      {/* Title badge + Delete */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge
          variant="secondary"
          className={cn(
            "text-[11px] font-medium bg-brand-100 text-brand-800 hover:bg-brand-100"
          )}
        >
          Summary
        </Badge>
        
        {/* Desktop delete button */}
        <div className="hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="p-1.5 text-text-secondary hover:text-danger-500 transition-colors rounded-md hover:bg-surface-subtle"
                aria-label="Delete summary"
              >
                <Trash2 className="size-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Summary</AlertDialogTitle>
                <AlertDialogDescription>
                  Delete this summary?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-danger-500 hover:bg-danger-600"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );

  return (
    <SwipeCard
      onDelete={handleDelete}
      deleteConfirmation="Delete this summary?"
    >
      {cardContent}
    </SwipeCard>
  );
}
```

- [ ] **Step 15: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 16: Commit SummaryCard changes**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/components/features/summary/summary-card.tsx
git commit -m "feat(summaries): add delete capability with swipe-to-delete"
```

---

## Chunk 7: Quiz List Integration

**Files:**
- Modify: `frontend/src/components/features/quiz/quiz-list.tsx`

- [ ] **Step 17: Add SwipeCard + desktop delete to QuizList**

Modify `frontend/src/components/features/quiz/quiz-list.tsx`:

```tsx
import Link from "next/link"
import { CheckSquare, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SwipeCard } from "@/components/ui/swipe-card"
import { RenameTitle } from "@/components/features/rename-title"
import { updateQuizTitle, deleteQuiz } from "@/app/actions/quizzes"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface QuizItem {
  id: string
  title: string | null
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
        <QuizCard key={quiz.id} quiz={quiz} />
      ))}
    </div>
  )
}

function QuizCard({ quiz }: { quiz: QuizItem }) {
  const handleDelete = async () => {
    await deleteQuiz(quiz.id);
  };

  const cardContent = (
    <div className="group bg-surface-card border border-border-default rounded-xl p-4 flex items-center gap-3 hover:bg-surface-overlay hover:border-border-strong transition-colors-fast">
      {/* Icon */}
      <div className="size-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
        <CheckSquare className="size-[18px] text-brand-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/quizzes/${quiz.id}`}
          className="text-sm font-medium text-text-primary hover:text-brand-500 transition-colors-fast truncate block"
        >
          <RenameTitle
            id={quiz.id}
            currentTitle={quiz.title}
            onSave={updateQuizTitle}
          />
        </Link>
        <p className="text-xs text-text-tertiary mt-0.5">
          {quiz.question_count} questions ·{" "}
          {new Date(quiz.created_at).toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Type badges + Delete */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex gap-1">
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
        
        {/* Desktop delete button */}
        <div className="hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="p-1.5 text-text-secondary hover:text-danger-500 transition-colors rounded-md hover:bg-surface-subtle"
                aria-label="Delete quiz"
              >
                <Trash2 className="size-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Quiz</AlertDialogTitle>
                <AlertDialogDescription>
                  Delete this quiz and all attempts?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-danger-500 hover:bg-danger-600"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );

  return (
    <SwipeCard
      onDelete={handleDelete}
      deleteConfirmation="Delete this quiz and all attempts?"
    >
      {cardContent}
    </SwipeCard>
  );
}
```

- [ ] **Step 18: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 19: Commit QuizList changes**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/components/features/quiz/quiz-list.tsx
git commit -m "feat(quizzes): add delete capability with swipe-to-delete"
```

---

## Chunk 8: Bottom Navigation Improvements

**Files:**
- Modify: `frontend/src/components/app-shell-mobile.tsx`

- [ ] **Step 20: Add active indicator dot and safe area padding**

Modify `frontend/src/components/app-shell-mobile.tsx`:

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Target,
  MessageSquare,
} from "lucide-react"

const routes = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Documents", path: "/documents", icon: FileText },
  { name: "Summaries", path: "/summaries", icon: BookOpen },
  { name: "Practice", path: "/practice", icon: Target },
  { name: "Chat", path: "/chat", icon: MessageSquare },
]

export function AppShellMobile() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-[56px] border-t border-border-default bg-surface-card/95 backdrop-blur supports-[backdrop-filter]:bg-surface-card/60"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-full">
        {routes.map((route) => {
          const Icon = route.icon
          const isActive = pathname.startsWith(route.path)
          return (
            <Link
              key={route.path}
              href={route.path}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] transition-colors-fast",
                isActive ? "text-brand-500" : "text-text-tertiary"
              )}
            >
              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-500" />
              )}
              <Icon className="size-[22px] stroke-[1.5]" />
              <span className="text-[11px] font-medium">{route.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 21: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 22: Commit bottom nav improvements**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/components/app-shell-mobile.tsx
git commit -m "feat(nav): add active indicator dot and safe area padding"
```

---

## Chunk 9: Chat Context Notice Dismissal

**Files:**
- Modify: `frontend/src/components/features/chat/chat-messages.tsx`

- [ ] **Step 23: Add dismissible X button to context notice**

Modify the context notice section in `frontend/src/components/features/chat/chat-messages.tsx`:

```tsx
// Add to imports:
import { X } from "lucide-react"
import { useState, useEffect } from "react"

const CHAT_NOTICE_KEY = "chat-context-notice-dismissed"

// In the component, before the return statement:
export function ChatMessages({ messages, isSearching, error }: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isNoticeDismissed, setIsNoticeDismissed] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(CHAT_NOTICE_KEY)
    if (dismissed) {
      setIsNoticeDismissed(true)
    }
  }, [])

  const handleDismissNotice = () => {
    setIsNoticeDismissed(true)
    localStorage.setItem(CHAT_NOTICE_KEY, "true")
  }

  // ... rest of the component

  // Replace the notice div with:
  {messages.length > CONTEXT_WINDOW_SIZE && !isNoticeDismissed && (
    <div className="sticky top-0 z-10 rounded-md bg-warning-100 px-3 py-2 text-center text-xs text-warning-800 flex items-center justify-center gap-2">
      <span>To keep responses sharp, only the last {CONTEXT_WINDOW_SIZE} messages are used as context.</span>
      <button
        onClick={handleDismissNotice}
        className="p-0.5 hover:text-warning-900 transition-colors"
        aria-label="Dismiss notice"
      >
        <X className="size-3" />
      </button>
    </div>
  )}
```

Full modified file:

```tsx
"use client"

import { useRef, useEffect, useState } from "react"
import { FileText, X } from "lucide-react"
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

const CONTEXT_WINDOW_SIZE = 8
const CHAT_NOTICE_KEY = "chat-context-notice-dismissed"

export function ChatMessages({ messages, isSearching, error }: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isNoticeDismissed, setIsNoticeDismissed] = useState(false)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages, isSearching])

  useEffect(() => {
    const dismissed = localStorage.getItem(CHAT_NOTICE_KEY)
    if (dismissed) {
      setIsNoticeDismissed(true)
    }
  }, [])

  const handleDismissNotice = () => {
    setIsNoticeDismissed(true)
    localStorage.setItem(CHAT_NOTICE_KEY, "true")
  }

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

      {messages.length > CONTEXT_WINDOW_SIZE && !isNoticeDismissed && (
        <div className="sticky top-0 z-10 rounded-md bg-warning-100 px-3 py-2 text-center text-xs text-warning-800 flex items-center justify-center gap-2">
          <span>To keep responses sharp, only the last {CONTEXT_WINDOW_SIZE} messages are used as context.</span>
          <button
            onClick={handleDismissNotice}
            className="p-0.5 hover:text-warning-900 transition-colors"
            aria-label="Dismiss notice"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {messages.map((msg, index) => {
        const isInContext = index >= messages.length - CONTEXT_WINDOW_SIZE
        return (
          <div
            key={msg.id}
            className={cn(
              "flex transition-all duration-300",
              !isInContext && "opacity-50 grayscale",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "user" ? (
              <div className="max-w-[78%] bg-brand-500 text-white rounded-[16px_16px_4px_16px] px-3.5 py-2.5 text-[13px] leading-[1.5]">
                {msg.content}
              </div>
            ) : (
              <div className="max-w-[92%] space-y-1.5">
                <div className="prose-compact">
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
        )
      })}

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

- [ ] **Step 24: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 25: Commit chat notice dismissal**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/components/features/chat/chat-messages.tsx
git commit -m "feat(chat): make context notice dismissible"
```

---

## Chunk 10: Integration & Testing

**Files:**
- Modify: `frontend/src/components/app-shell.tsx` (add SwipeHint)

- [ ] **Step 26: Add SwipeHint to app shell**

Modify `frontend/src/components/app-shell.tsx` to include SwipeHint:

```tsx
// Add import:
import { SwipeHint } from "@/components/ui/swipe-hint"

// In the component JSX, add before closing tag:
<SwipeHint />
```

- [ ] **Step 27: Run frontend tests**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
pnpm run test:run
```

- [ ] **Step 28: Run linting**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx biome check .
```

- [ ] **Step 29: Final commit**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/components/app-shell.tsx
git commit -m "feat(ui): add SwipeHint to app shell"
```

---

## Verification Checklist

- [ ] Swipe left on document card reveals delete panel (mobile)
- [ ] Swipe left on summary card reveals delete panel (mobile)
- [ ] Swipe left on quiz card reveals delete panel (mobile)
- [ ] Desktop hover shows delete button on document cards
- [ ] Desktop shows delete button on summary cards
- [ ] Desktop shows delete button on quiz cards
- [ ] Bottom nav active state shows indicator dot
- [ ] Bottom nav respects safe area on iOS
- [ ] Chat context notice has dismissible X button
- [ ] Swipe hint appears once and auto-dismisses
- [ ] All delete actions show confirmation dialog
- [ ] TypeScript compiles without errors
- [ ] Tests pass
- [ ] Linting passes

---

## Future Sub-Project Groups

Per user direction, remaining sub-projects are grouped as:

**Group A (Quiz Focus):**
- Sub-Project 3: Quiz Results Page enhancements
- Sub-Project 4: Quiz UX & Markdown Rendering

**Group B (UI Polish):**
- Sub-Project 2: Custom Dropdown Component
- Sub-Project 5: Dashboard UI Improvements
- Sub-Project 6: Quota Display Across Pages
