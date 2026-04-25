# Product Requirements Document (PRD)

> **Product:** Clarift  
> **Version:** MVP (Phase 1)  
> **Date:** April 2026  
> **Status:** Active  

> See [`project-context.md`](./project-context.md) for background.  
> See [`features/`](./features/) for detailed feature specifications.

---

## Problem

Filipino students — particularly those preparing for board exams in nursing, CPA, engineering, and medicine — study inefficiently. They reread notes passively, use generic AI tools that answer from general knowledge rather than their actual study material, and don't know what they don't understand until they fail a practice exam.

Existing tools fall into two categories:
- **Generic AI (ChatGPT, Gemini):** Provides broad answers, not grounded in the student's material. Creates false confidence.
- **Organization tools (NotebookLM):** Organizes notes but doesn't guide learning. Still passive.

Neither tool closes the learning loop: study → test → identify gaps → remediate.

---

## Solution

Clarift is a structured learning engine that:
1. Ingests the student's own material (PDF, image, text)
2. Generates structured summaries via multi-step AI chains
3. Quizzes the student strictly on their uploaded material
4. Identifies weak topics from quiz performance
5. Generates targeted practice for those weak areas

The system works only from the student's uploaded material. It never answers from general knowledge.

---

## Users

### Primary (MVP)
Filipino students preparing for licensure exams:
- Nursing board (NLE)
- CPA board (CPA licensure)
- Engineering board (various)
- Medical board (PNMAT, PLE)

### Secondary (MVP)
University students with heavy reading loads.

### Future
Review centers, universities, corporate learners.

---

## MVP Scope

### In Scope

| Feature | Description |
|---|---|
| Google OAuth | Sign in with Google |
| Onboarding | Capture output format preference (bullet, step-by-step, example-first) |
| Document upload | PDF, image, text — async processing via ARQ |
| Structured summary | Multi-step chain: extract → cluster → outline → format |
| Quiz generation | MCQ, T/F, fill-in-blank — strictly from uploaded material |
| Quiz attempt | Submit answers, score, save results |
| Weak area detection | Identify weak topics from quiz performance |
| Targeted practice | Generate focused drills for weak topics |
| Grounded chat | RAG-based chat scoped to selected documents |
| Quota system | Count-based limits, Free and Pro tiers |
| Pro subscription | ₱149/month via PayMongo (GCash + card) |

### Out of Scope (MVP)

| Feature | Phase |
|---|---|
| Magic link auth | Phase 2 |
| Spaced repetition + flashcards | Phase 2 |
| Progress tracking + streaks | Phase 2 |
| Web search fallback (Brave API) | Phase 3 |
| MermaidJS diagrams | Phase 4 |
| Multi-document synthesis | Phase 5 |
| School dashboards | Phase 6 |

---

## Functional Requirements

### FR-001: Document Upload
- Accepts PDF, PNG, JPG, JPEG, plain text
- Maximum file size: 10MB
- Processing is asynchronous — user receives job ID immediately
- Status updates delivered via SSE
- Text extracted via PyMuPDF (PDF) or Gemini Vision (images)
- Chunks stored in pgvector with user_id and document_id metadata

### FR-002: Structured Summary
- Generated via 5-step LangChain chain
- Output format respects user preference (bullet, step-by-step, example-first)
- Strictly sourced from uploaded document chunks
- Cached by document_id + format post-MVP

### FR-003: Quiz Generation
- Question types: MCQ (4 options), True/False, Fill-in-the-blank
- All questions derived from uploaded material only
- Output is validated JSON
- Minimum 5 questions per quiz

### FR-004: Quiz Attempt
- User selects answers, submits
- Score calculated and stored
- Per-topic performance updated in `user_topic_performance`

### FR-005: Weak Area Detection
- A topic is considered weak when:
  - `attempts >= 5`
  - AND `accuracy < 70%`
  - AND `appears_in_quizzes >= 2`
- Weak topics displayed to user with accuracy percentage

### FR-006: Targeted Practice
- Drills generated for weak topics only
- Difficulty increases progressively within a session
- Grounded strictly in uploaded material chunks

### FR-007: Grounded Chat
- Context limited to user-selected documents
- Maximum 5 retrieved chunks per response
- Must cite source chunk
- If answer not in material: responds "I cannot find this in your uploaded notes"
- Uses Gemini Flash Lite (cost efficiency)

### FR-008: Quota System
- Every AI feature call passes through quota check in FastAPI
- Quota check is transactional (`SELECT FOR UPDATE`)
- Daily reset at midnight (local time)
- Chat rolling window via Redis TTL
- Quota display in UI via Drizzle read

### FR-009: Payments
- Pro subscription at ₱149/month
- PayMongo integration (GCash + credit/debit card)
- Webhook updates user tier in database
- Downgrade to Free tier on payment failure/cancellation

### FR-010: Onboarding
- Captured once on first login
- Stored in `user_preferences.output_format`
- Options: bullet | step-by-step | example-first
- Applied to all summary and practice generation

---

## Non-Functional Requirements

### Performance
- Document upload response (before processing): < 2 seconds
- SSE first event (processing started): < 1 second after job enqueue
- Summary generation (full chain): < 20 seconds
- Quiz generation: < 15 seconds
- Chat response (first token): < 3 seconds

### Security
- All FastAPI routes require valid JWT
- All DB queries filtered by user_id
- Vector search always scoped to user_id
- Files stored in R2 with private ACL, accessed via signed URLs
- Quota enforcement uses database-level locking

### Reliability
- All Gemini calls wrapped in tenacity retry (3 attempts, exponential backoff)
- ARQ jobs retry on failure (configurable, default 2 retries)
- Failed document processing updates status to `failed` with error message

### Cost
- Free user: ~₱2/month (~$0.04)
- Pro user: ~₱15/month (~$0.25)
- Revenue per Pro user: ₱149
- Gross margin: ~90%

---

## Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| Return within 48 hours | > 40% of active users | User session tracking |
| Full loop completion | > 50% of users who upload also complete a quiz | Funnel analytics |
| Quiz score improvement | > 20% improvement on retake | Quiz attempt data |
| Free → Pro conversion | > 5% | Payment events |
| Willingness to pay (survey) | > 30% say yes | In-app survey |

---

## Quota Limits Reference

| Feature | Free | Pro |
|---|---|---|
| Summaries | 3/day | 10/day |
| Quizzes | 3/day | 15/day |
| Targeted practice | 3/day | 10/day |
| Chat | 12/day | 60/day |
| Uploads | 8 documents max | Unlimited |
