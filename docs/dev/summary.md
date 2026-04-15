# Feature: Structured Summary

> Part of the **Structure** step in the core learning loop.  
> See [`master-spec.md`](../master-spec.md) for schema and API contract.

---

## What This Feature Does

Transforms a processed document into a structured, formatted summary using a 5-step LangChain chain. Output format respects the user's stored preference.

---

## Backend: Summary Chain

Location: `app/chains/summary_chain.py`

The chain is multi-step. Each step's output becomes the next step's input.

```
Step 1: Retrieve
  Input:  document_id, user_id
  Action: pgvector cosine similarity search, top 5 chunks
  Filter: WHERE user_id = :user_id AND document_id = :document_id
  Output: list[str] (chunk contents)

Step 2: Extract Key Concepts
  Input:  chunks
  Prompt: "From these study notes, identify and list all key concepts, terms, and ideas."
  Output: list[Concept]

Step 3: Cluster Into Topics
  Input:  concepts
  Prompt: "Group these concepts into logical study topics."
  Output: list[Topic] with nested concepts

Step 4: Generate Outline
  Input:  topics
  Prompt: "Create a structured study outline from these topics."
  Output: str (outline)

Step 5: Generate Final Summary
  Input:  outline + chunks + ResolvedSettings (format, style, custom_instructions)
  Prompt: Format + style aware. Custom instructions appended here only.
  Output: str (formatted summary in Markdown)

Step 6a: MermaidJS Diagram (conditional, parallel with 6b)
  See: features/mermaid.md

Step 6b: Quiz Type Content Analysis (always runs, parallel with 6a)
  Input:  outline + key concepts from Steps 2–4
  Chain:  app/chains/content_analysis_chain.py
  Output: QuizTypeFlags stored in summaries.quiz_type_flags
  See:    features/quiz-settings.md
```

Steps 6a and 6b run concurrently via `asyncio.gather` in the ARQ worker. Neither blocks the other. Both results are stored before the job emits the `complete` SSE event.

---

## Backend: Service + Route

**Service** (`app/services/summary_service.py`):
- Checks if summary already exists for this `document_id + format` combination
- If exists: return cached DB result (no chain call)
- If not: enqueue ARQ job, return job record

**Route** (`POST /api/v1/summaries`):
- Dependency: `get_current_user`, `enforce_quota("summaries")`
- Delegates to service

---

## Frontend

- Summary page renders Markdown via `react-markdown` with `remark-math`, `rehype-katex`, `rehype-highlight`
- While job is running: skeleton loader with SSE progress
- On complete: render summary with format label shown

---

## Tests

- `test_summary_chain_bullet` — correct bullet format output
- `test_summary_chain_step_by_step` — correct format
- `test_summary_quota_exceeded` — 429 returned
- `test_summary_document_not_ready` — 409 returned
- `test_summary_cached` — second request returns existing summary, no chain call
