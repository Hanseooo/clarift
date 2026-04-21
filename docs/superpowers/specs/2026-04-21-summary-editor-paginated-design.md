# Summary Editor & Paginated Display Design Spec

## Overview
This feature transforms the AI-generated markdown summary into an interactive, mobile-first learning experience. The display is paginated for bite-sized reading, rendered with advanced markdown capabilities (math, tables, callouts), and features a toggle to switch into a Notion-like rich-text editor (`novel`) for user modifications.

## Display Structure: Paginated "Reading Mode"
- **Splitting Logic:** The backend generates a single continuous Markdown string. The frontend splits this string into an array of "pages" or "slides" by delimiting on `##` (Heading 2).
- **UI Layout (Mobile & Desktop):** 
  - A swipeable/clickable carousel of pages.
  - A progress indicator (e.g., a progress bar or "Page 2 of 5" text) sits at the top or bottom of the view.
  - Sticky "Generate Quiz" CTA remains accessible.

## Enhanced Markdown Rendering
To support STEM students and complex topics, the frontend `react-markdown` component will be upgraded with the following plugins:
- `remark-gfm`: For tables, strikethrough, and task lists.
- `remark-math` & `rehype-katex`: For LaTeX math equations (`$inline$` and `$$block$$`).
- `rehype-pretty-code`: For syntax highlighting in code blocks.
- `remark-github-blockquote-alert`: To render GitHub-style blockquote alerts (e.g., `> [!NOTE]`) as styled "Key Concept" callout boxes.

## AI Prompt Adjustments
The `summary_chain.py` system prompt will be explicitly updated to leverage these capabilities:
> "Format your responses using advanced Markdown:
> - Use Markdown Tables for comparisons.
> - Use LaTeX syntax for math: `$inline$` and `$$block$$`.
> - Highlight Key Concepts using GitHub alert syntax: `> [!NOTE]` or `> [!IMPORTANT]`.
> - Structure your content logically using `##` (Heading 2), as this defines the pagination boundaries in the UI."

## Editing Experience: "Edit Mode"
- **Toggle:** A "Read Mode / Edit Mode" toggle sits at the top of the summary view.
- **Editor Integration:** Clicking "Edit Mode" un-splits the pages and loads the entire raw Markdown string into `novel` (a Tiptap-based block editor).
- **Notion-like Features:** Users can use slash commands (`/`), drag-and-drop blocks, and rich formatting.
- **Saving:** When editing is complete, the `novel` editor serializes the content back to Markdown. A Next.js Server Action saves the updated Markdown to the database, and the UI returns to the paginated Reading Mode.
