# Summary Editor & Paginated Display Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the summary markdown into an interactive, paginated learning experience with rich Markdown rendering and a Novel.sh edit mode.

**Architecture:** Next.js Client Components. `novel` editor lazy-loaded. Enhanced `react-markdown` with `remark`/`rehype`. Splitting string logic in JS.

**Tech Stack:** Next.js 15, `novel`, `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`, `rehype-pretty-code`, `remark-github-blockquote-alert`.

---

## Chunk 1: Rich Markdown & Backend Prompts

### Task 1: Install Dependencies

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install Packages**
```bash
pnpm add novel react-markdown remark-gfm remark-math rehype-katex rehype-pretty-code remark-github-blockquote-alert katex
```

- [ ] **Step 2: Update Next Config (if needed for ESM)**
```bash
git add frontend/package.json pnpm-lock.yaml
git commit -m "chore: add novel and markdown plugins"
```

### Task 2: Create Enhanced Markdown Component

**Files:**
- Create: `frontend/src/components/ui/rich-markdown.tsx`
- Modify: `frontend/src/app/layout.tsx` (Import KaTeX CSS)

- [ ] **Step 1: Create Component**
```tsx
import 'katex/dist/katex.min.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkAlert from 'remark-github-blockquote-alert';
import rehypeKatex from 'rehype-katex';
import rehypePrettyCode from 'rehype-pretty-code';

export default function RichMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath, remarkAlert]}
      rehypePlugins={[rehypeKatex, [rehypePrettyCode, { theme: 'github-dark' }]]}
    >
      {content}
    </ReactMarkdown>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/components/ui/rich-markdown.tsx frontend/src/app/layout.tsx
git commit -m "feat: enhance markdown renderer with math and callouts"
```

### Task 3: Adjust AI System Prompt

**Files:**
- Modify: `backend/app/chains/summary_chain.py`

- [ ] **Step 1: Update Prompt Template**
Append the formatting rules: Use Markdown Tables, LaTeX `$inline$` / `$$block$$`, GitHub alert syntax `> [!NOTE]`, and delimit structure exactly with `##`.

- [ ] **Step 2: Commit**
```bash
git add backend/app/chains/summary_chain.py
git commit -m "feat: adjust summary prompt for advanced markdown syntax"
```

## Chunk 2: Paginated UI & Editor

### Task 4: Reading Mode (Paginated)

**Files:**
- Create: `frontend/src/components/features/summary/paginated-reader.tsx`

- [ ] **Step 1: Split Content Array**
```typescript
const pages = markdownContent.split(/(?=^##\s)/m).filter(Boolean);
// Map over pages to create a carousel UI using swiper or simple Next/Prev state.
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/components/features/summary/paginated-reader.tsx
git commit -m "feat: split summary content into paginated reading mode"
```

### Task 5: Editor Mode (Novel.sh)

**Files:**
- Create: `frontend/src/components/features/editor/markdown-editor.tsx`
- Modify: `frontend/src/app/summaries/[id]/page.tsx`

- [ ] **Step 1: Wrap Novel Editor**
Dynamically import `Editor` with `ssr: false`. Use `onUpdate` to extract Markdown. 

- [ ] **Step 2: Add Mode Toggle**
In `page.tsx`, create a state `isEditing = false`. Toggle between `PaginatedReader` and `MarkdownEditor`. Add a "Save" button that triggers a Server Action to update the DB.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/components/features/editor/ frontend/src/app/summaries/
git commit -m "feat: integrate novel.sh editor and edit mode toggle"
```
