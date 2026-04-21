# Document Management (View & Delete) Design Spec

## Overview
This feature implements the UI and backend logic to view uploaded PDF/text documents natively in the browser and safely delete them from the database and vector store.

## UI Design: Document Viewer (`/documents/[id]`)
- **Desktop Layout:** A split-pane view. The left side contains metadata (Title, Status Pills), action buttons ("Generate Summary", "Take Quiz", "Delete"), and a fallback "Open Fullscreen" button. The right side contains the document viewer.
- **Mobile Layout:** Stacked layout. Metadata and actions sit on top. Instead of a cramped iframe, a large "View Fullscreen Document" button is shown, opening the presigned URL in a new tab.
- **Viewer Implementation:** A native `<iframe>` pointing to the document's presigned S3/storage URL.
- **Loading State:** If the document status is `pending` or `processing`, the viewer area shows a skeleton loader or a centered "Processing Document..." spinner. The action buttons (Summary/Quiz) are disabled.

## UI Design: Deletion Flow
- **Trigger:** A "Delete" button accessible on the document card (in the list view) and on the document detail page.
- **Styling:** Adheres strictly to `docs/dev/design.md`. The button uses a `danger-100` background and `danger-800` text, turning to a solid red (`danger-500`) with white text on hover.
- **Confirmation:** Clicking "Delete" opens a shadcn `AlertDialog`.
  - Title: "Delete this document?"
  - Description: "This will permanently remove the document and all associated data from the database. This action cannot be undone."
  - Actions: "Cancel" (ghost variant) and "Delete" (destructive variant).

## Backend Integration
- **Deletion API:** A new endpoint (`DELETE /api/documents/{id}`) or Next.js Server Action is required.
- **Data Cleanup:** The deletion process must remove the document record from the primary database (Drizzle) and ideally cascade to delete associated vector chunks in the pgvector database to save storage and prevent ghost data in RAG queries.
