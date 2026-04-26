# Tiptap WYSIWYG Editor Design Spec

## Overview
Replace the `@uiw/react-md-editor` markdown editor with a true WYSIWYG editor powered by Tiptap for the Summary editing feature. Students will no longer see raw Markdown syntax when editing summaries. The editor supports rich formatting, LaTeX math, tables, and GitHub-style alerts while preserving Markdown as the canonical storage format.

## Motivation
- Current `react-md-editor` exposes raw Markdown syntax, which is unfriendly for non-technical Filipino students
- Previous attempt to use `novel.sh` failed due to peer-dependency conflicts with Next.js 16's strict module boundaries
- Need a solution that is compatible with Next.js 16.2.3 + React 19.2.4, supports LaTeX, and round-trips Markdown reliably

## Tech Stack
- **Core**: `@tiptap/react`, `@tiptap/starter-kit`
- **Markdown**: `@tiptap/extension-markdown` (beta)
- **Math**: Custom KaTeX node extension (see Math section below for rationale)
- **Tables**: `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-cell`, `@tiptap/extension-table-header`
- **Lists**: `@tiptap/extension-task-list`, `@tiptap/extension-task-item`
- **Links**: `@tiptap/extension-link`
- **Custom**: Custom Tiptap nodes for GitHub-style alerts (`> [!NOTE]`, `> [!IMPORTANT]`) — implemented as standard Tiptap nodes (not `ReactNodeViewRenderer`) to avoid React 19 stability issues
- **SSR**: `immediatelyRender: false` in `useEditor` config (Next.js App Router hydration guard)

## Math Extension Strategy

`@tiptap/extension-mathematics` is a Tiptap Pro extension and may require a paid subscription for production use. To avoid licensing costs and keep dependencies fully open-source, we will build a **custom KaTeX node extension**:

- **Inline math**: Custom Tiptap inline node that parses `$...$` and renders via KaTeX
- **Block math**: Custom Tiptap block node that parses `$$...$$` and renders via KaTeX
- **Implementation**: Standard Tiptap `Node` extension with `parseHTML`/`renderHTML` (no `ReactNodeViewRenderer`); uses KaTeX's `katex.renderToString()` synchronously
- **Round-trip**: The custom nodes serialize back to `$...$` and `$$...$$` via the Markdown extension's custom node handlers

This approach reuses the existing `katex` dependency already in `package.json` and the global KaTeX CSS import in `layout.tsx`.

## Architecture

### Component Hierarchy
```
frontend/src/components/features/editor/
├── tiptap-editor.tsx          # Main editor wrapper (Client Component)
├── tiptap-toolbar.tsx         # Fixed formatting toolbar
├── slash-command.tsx          # /command palette UI
├── tiptap-provider.tsx        # useEditor hook, config, and extensions
└── markdown-editor.tsx        # DELETE (legacy react-md-editor wrapper)
```

### SSR Strategy
- `tiptap-editor.tsx` is a `"use client"` component
- Tiptap initialized with `immediatelyRender: false` to prevent hydration mismatches
- No `next/dynamic` import required — Tiptap core is ESM-safe and Next.js 16 compatible
- KaTeX CSS is already loaded globally in `layout.tsx`

## Editor Features

### Toolbar (Fixed)
- Formatting: Bold, italic, strikethrough, code inline
- Headings: H1, H2, H3
- Lists: Bullet list, ordered list, task list
- Blocks: Blockquote, code block, horizontal rule
- Links: Add/remove links
- Tables: Insert table (3x3 default), add/remove rows and columns
- Math: Insert inline math (`$...$`) and block math (`$$...$$`)
- Alerts: Insert GitHub-style note/important/warning callout blocks
- History: Undo, redo

### Slash Commands
Type `/` anywhere in the editor to open a command palette:
- `/heading` → Insert heading
- `/bullet` → Insert bullet list
- `/table` → Insert table
- `/math` → Insert math block
- `/note` → Insert note callout
- `/code` → Insert code block
- `/divider` → Insert horizontal rule

### What Is NOT Included
- **Bubble menu** (floating toolbar on text selection): Avoided to prevent React 19 `flushSync` crash with `ReactNodeViewRenderer`
- **Drag-and-drop block reordering**: Avoided for same React 19 stability reason
- **Mermaid diagram editing**: Out of scope for this PR; diagrams remain render-only in read mode

## Data Flow

```
[Server Component: page.tsx]
    ↓ passes initialContent (markdown string) + summaryId
[Client Component: TiptapEditor]
    ↓ @tiptap/extension-markdown parses markdown → Tiptap document
    ↓ user edits (WYSIWYG, no markdown visible)
    ↓ on save: extension serializes Tiptap document → markdown string
    ↓ calls updateSummaryContent Server Action directly (imported in client file)
    ↓ on success: router.push to read mode
[Server Component: page.tsx]
    ↓ renders PaginatedReader with updated content
```

## Markdown Round-trip

### Supported Syntax
| Markdown Feature | Tiptap Representation | Notes |
|---|---|---|
| Headers `#` `##` `###` | Heading nodes | Preserved |
| Bold `**text**` | Bold mark | Preserved |
| Italic `*text*` | Italic mark | Preserved |
| Strikethrough `~~text~~` | Strike mark | Preserved |
| Inline code `` `code` `` | Code mark | Preserved |
| Code blocks ` ```lang ` | CodeBlock node | Preserved |
| Bullet lists `- item` | BulletList + ListItem | Preserved |
| Ordered lists `1. item` | OrderedList + ListItem | Preserved |
| Task lists `- [ ] item` | TaskList + TaskItem | Preserved |
| Links `[text](url)` | Link mark | Preserved |
| Tables | Table + Row + Cell + Header | Preserved |
| Math `$inline$` / `$$block$$` | Custom KaTeX node | Preserved via custom extension |
| Alerts `> [!NOTE]` | Custom Alert node | Custom parser/serializer |

### Lossy Behavior
- Unsupported syntax (e.g., HTML tags, custom HTML attributes) is stripped or rendered as plain text
- If a parse error occurs, Tiptap gracefully falls back to plain text; a `console.warn` is logged
- Deeply nested tables or merged cells may be simplified

## Server Action Refactor

**Rationale:** Move the Server Action invocation into the Client Component for cleaner component boundaries. `page.tsx` currently defines `handleSave` inline and passes it to `MarkdownEditor`. While Next.js supports passing Server Actions as props, colocating the action call inside `tiptap-editor.tsx` simplifies the Server Component and keeps edit-related logic in one place.

**Changes:**
- Remove `handleSave` from `page.tsx`
- Pass only `initialContent` and `summaryId` to `TiptapEditor`
- Import `updateSummaryContent` directly inside `tiptap-editor.tsx` (Next.js allows importing Server Actions in Client Components)
- Call `updateSummaryContent(summaryId, markdown)` from within the Client Component
- Use `useTransition` for pending state during save

## State Management

### Editor State
- Tiptap editor instance managed via `useEditor` hook in `tiptap-provider.tsx`
- Editor content is ephemeral; canonical source is the Markdown string from the backend
- Auto-save is **not** implemented in this PR; user clicks Save explicitly

### UI State
- `isSaving`: Boolean, managed with `useTransition` or `useState`
- `showSlashMenu`: Boolean, managed locally in `slash-command.tsx`
- Save/cancel actions return user to read mode (`/summaries/${id}`)

## Error Handling

| Error Type | Behavior |
|---|---|
| **Markdown parse failure** | Tiptap renders unsupported syntax as plain text; `console.warn` logged |
| **Save failure** | Inline error banner above toolbar; editor stays open with unsaved changes |
| **Invalid LaTeX** | KaTeX renders as plain text with error class; does not crash editor |
| **Hydration mismatch** | Prevented by `immediatelyRender: false` |

## Styling

- Toolbar: Horizontal flex row with grouped buttons, using existing Tailwind tokens (`bg-surface-card`, `border-border-default`, `text-text-primary`)
- Editor area: `min-h-[300px]`, `rounded-xl`, `border`, `bg-surface-card`, `p-4`
- Slash menu: Floating dropdown, styled like a command palette, positioned at cursor
- Math: Inline math uses KaTeX rendering; block math is centered
- Alerts: Styled callout blocks with colored left border (blue for NOTE, amber for IMPORTANT, red for WARNING)

## Files Changed

### Create
- `frontend/src/components/features/editor/tiptap-editor.tsx`
- `frontend/src/components/features/editor/tiptap-toolbar.tsx`
- `frontend/src/components/features/editor/slash-command.tsx`
- `frontend/src/components/features/editor/tiptap-provider.tsx`

### Modify
- `frontend/src/app/(app)/summaries/[id]/page.tsx`
- `frontend/package.json`
- `frontend/next.config.ts` (add Tiptap packages to `transpilePackages` if ESM issues arise)

### Delete
- `frontend/src/components/features/editor/markdown-editor.tsx`

## Migration Plan

1. **Install dependencies**
   ```bash
   pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-markdown @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header @tiptap/extension-task-list @tiptap/extension-task-item @tiptap/extension-link
   pnpm remove @uiw/react-md-editor novel tiptap-markdown
   ```

2. **Build core components** (`tiptap-provider.tsx`, `tiptap-toolbar.tsx`, `slash-command.tsx`)

3. **Build `tiptap-editor.tsx`**
   - Wraps provider + toolbar + slash command
   - Imports `updateSummaryContent` Server Action
   - Handles save/cancel flow

4. **Update `page.tsx`**
   - Remove `handleSave` server action
   - Replace `<MarkdownEditor />` with `<TiptapEditor initialContent={summary.content} summaryId={id} />`

5. **Update `next.config.ts`**
   - Add Tiptap packages to `transpilePackages` if runtime ESM errors occur

6. **Verify**
   - `pnpm run generate:openapi`
   - `pnpm run test:run`
   - Manual test: create summary → edit → verify LaTeX, tables, alerts render in edit mode → save → verify read mode shows correctly

## Open Questions / Future Work

1. **Mermaid diagrams in edit mode**: Currently out of scope. Mermaid blocks are rendered as code blocks in the editor; read mode handles them via `MermaidBlock` component.
2. **Auto-save**: Could be added later using debounced `editor.getHTML()` or `editor.storage.markdown.getMarkdown()` calls.
3. **Collaborative editing**: Tiptap supports Y.js; could be a future enhancement.

## References

- Tiptap Next.js guide: https://tiptap.dev/docs/editor/getting-started/install/nextjs
- Tiptap Markdown extension: https://tiptap.dev/docs/editor/markdown
- Tiptap Mathematics extension: https://tiptap.dev/docs/editor/extensions/nodes/mathematics
- Prior PR context: `docs/superpowers/plans/2026-04-21-summary-editor.md`
- Prior design spec: `docs/superpowers/specs/2026-04-21-summary-editor-paginated-design.md`
