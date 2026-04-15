# Feature: Quiz Generation + Attempts

> Part of the **Evaluate** step in the core learning loop.  
> See [`master-spec.md`](../master-spec.md) for quiz JSON schema.  
> See [`features/quiz-settings.md`](./quiz-settings.md) for question type settings, content analysis flagging, and auto vs manual mode. That document is the authoritative spec for quiz configuration — this document covers the core generation and attempt flow only.

---

## What This Feature Does

Generates a quiz strictly from the user's uploaded document. Stores attempt results and updates per-topic performance, which feeds into weak area detection.

---

## Backend: Quiz Chain

Location: `app/chains/quiz_chain.py`

> The chain receives a resolved `question_distribution` dict — it does not decide types or counts itself.  
> See [`features/quiz-settings.md`](./quiz-settings.md) for full resolution logic.

```
Step 1: Retrieve
  Action: pgvector search, top 5 chunks, scoped to user_id + document_id
  Output: list[str]

Step 2: Extract Factual Statements
  Prompt: "List all factual statements, definitions, and testable concepts in these notes."
  Output: list[str]

Step 3: Generate Questions
  Input:  chunks + question_distribution (e.g. {mcq: 5, true_false: 2, ordering: 2})
  Prompt: Dynamically assembled per type — see quiz-settings.md TYPE_PROMPTS
  Output: raw JSON string

Step 4: Validate
  - Parse JSON
  - Per type:
      MCQ:          exactly 4 options, correct_answer is one of the options
      True/False:   correct_answer is boolean
      Identification: correct_answer is a non-empty string
      Multi-select: correct_answers is array, all items exist in options, len >= 2
      Ordering:     correct_order is valid permutation of step indices
  - On validation failure: retry Step 3 once with error context
  Output: QuizOutput (validated Pydantic model)
```

---

## Backend: Quiz Attempt

Route: `POST /api/v1/quizzes/{id}/attempt`

```python
# Input: { answers: { q_id: answer } }
# Output: { score: float, per_topic: { topic: { correct: int, total: int } } }
```

Scoring logic per type:
- **MCQ / True/False / Identification:** exact match (case-insensitive for identification)
- **Multi-select:** all correct answers must be selected, no incorrect answers selected
- **Ordering:** full correct order required for full credit (no partial credit in MVP)

After scoring:
1. Calculate overall score (percentage)
2. For each topic in this quiz: UPSERT `user_topic_performance`
3. Store `quiz_attempt` row

---

## Frontend

Question UI per type:
- **MCQ:** Radio buttons, one selectable
- **True/False:** Two large buttons (True / False)
- **Identification:** Text input, answer checked case-insensitively
- **Multi-select:** Checkboxes, multiple selectable
- **Ordering:** Draggable list — user drags steps into correct order

All questions shown on one page, submitted together. Score reveal shows overall % + per-topic breakdown. "View weak areas" CTA shown if any topic below 70%.

Quiz settings panel shown before generation — see [`features/quiz-settings.md`](./quiz-settings.md) for the panel spec.

---

## Tests

- `test_quiz_chain_generates_valid_json` — output parses correctly for all 5 types
- `test_quiz_attempt_mcq_scoring` — exact match scoring
- `test_quiz_attempt_identification_case_insensitive` — "ATP synthase" == "atp synthase"
- `test_quiz_attempt_multiselect_scoring` — partial selection = incorrect
- `test_quiz_attempt_ordering_scoring` — wrong order = incorrect
- `test_topic_performance_updated` — upsert works correctly
- `test_quiz_quota_enforced` — 429 on exceeded quota
