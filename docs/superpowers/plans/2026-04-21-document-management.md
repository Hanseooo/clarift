# Document Management (View & Delete) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Document UI for viewing PDFs natively and safely deleting them.

**Architecture:** Next.js Server Components for data fetching, Client Components for Iframe viewing and Deletion AlertDialog. Drizzle for DB deletion.

**Tech Stack:** Next.js 15, React, Tailwind, shadcn/ui (AlertDialog, Button), Drizzle ORM.

---

## Chunk 1: Deletion Logic & UI

### Task 1: Delete Server Action

**Files:**
- Create: `frontend/src/app/actions/documents.ts`

- [ ] **Step 1: Write Server Action**
```typescript
"use server"
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function deleteDocument(documentId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  
  // Note: Actual implementation would also call a backend endpoint 
  // to cascade delete pgvector embeddings to save space.
  await db.delete(documents).where(
    and(eq(documents.id, documentId), eq(documents.user_id, userId))
  );
  revalidatePath("/documents");
  return { success: true };
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/app/actions/documents.ts
git commit -m "feat: add delete document server action"
```

### Task 2: Delete Button Component

**Files:**
- Create: `frontend/src/components/features/documents/delete-document-button.tsx`

- [ ] **Step 1: Implement UI with shadcn AlertDialog**
Use `danger-100` bg and `danger-800` text, turning to solid `danger-500` text-white on hover. Open an AlertDialog on click. Call `deleteDocument` action on confirm.

- [ ] **Step 2: Commit**
```bash
git add frontend/src/components/features/documents/delete-document-button.tsx
git commit -m "feat: add delete document button with alert dialog"
```

## Chunk 2: Document Viewer

### Task 3: Document Viewer Page

**Files:**
- Modify: `frontend/src/app/documents/[id]/page.tsx`

- [ ] **Step 1: Implement Viewer Layout**
Split-pane layout. Fetch document status. If `processing`, show a spinner. If `ready`, render `<iframe src={document.url} className="w-full h-full rounded-lg" />`. Add a "View Fullscreen" `<a target="_blank">` button for mobile fallback. Include the `DeleteDocumentButton`.

- [ ] **Step 2: Commit**
```bash
git add frontend/src/app/documents/
git commit -m "feat: implement document viewer page with iframe"
```
