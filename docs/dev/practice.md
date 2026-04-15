# Feature: Weak Area Detection + Targeted Practice

> Part of the **Diagnose** and **Remediate** steps in the core learning loop.  
> This is Clarift's key differentiator.

---

## Weak Area Detection

### Logic

A topic is considered weak when ALL three conditions are met:

```python
is_weak = (
    attempts >= 5
    and (correct / attempts) < 0.70
    and quiz_count >= 2  # appeared in at least 2 different quizzes
)
```

This prevents a topic from being flagged as "weak" after a single bad attempt. The threshold requires sustained underperformance.

### Route: `GET /api/v1/practice/weak-areas`

Returns topics meeting the weak criteria for the current user, with accuracy percentages.

```json
{
  "weak_topics": [
    { "topic": "Pharmacokinetics", "accuracy": 0.42, "attempts": 8 },
    { "topic": "Acid-Base Balance", "accuracy": 0.55, "attempts": 6 }
  ]
}
```

### Frontend Display

- Visual accuracy meters per topic (e.g., progress bar at 42%)
- "Start Practice" button for each weak topic or "Practice All Weak Topics"
- Empty state when no weak topics yet — encourages taking more quizzes

---

## Targeted Practice

### Practice Chain

Location: `app/chains/practice_chain.py`

```
Step 1: Select Chunks
  - For each weak topic: retrieve top 3 relevant chunks
  - Combine chunks (capped at 5 total for LLM context)
  - Prioritize chunks with lowest accuracy topic coverage

Step 2: Generate Drills
  Prompt: "Generate 5 practice drills for these weak topics.
           Start with recall-level questions, progress to application-level.
           Format: { question, type, correct_answer, explanation, difficulty: 1|2|3 }"
  Output: list[Drill]

Step 3: Validate + Order
  - Validate drill JSON structure
  - Sort by difficulty (1 → 3)
  Output: PracticeOutput
```

### Practice Drill Schema

```json
{
  "drills": [
    {
      "id": "d1",
      "topic": "Pharmacokinetics",
      "difficulty": 1,
      "type": "recall",
      "question": "Define bioavailability.",
      "correct_answer": "The fraction of an administered drug that reaches systemic circulation.",
      "explanation": "Bioavailability is affected by first-pass metabolism..."
    },
    {
      "id": "d2",
      "topic": "Pharmacokinetics",
      "difficulty": 3,
      "type": "application",
      "question": "A drug has 30% oral bioavailability. If IV dose is 50mg, what oral dose achieves the same effect?",
      "correct_answer": "~167mg",
      "explanation": "Oral dose = IV dose / bioavailability = 50 / 0.30..."
    }
  ]
}
```

### Quota

Targeted practice allows 1 session per day for Free tier. The quota dependency enforces this—Free users see an upgrade prompt if they exceed their daily session. The quota dependency enforces this — Free users see an upgrade prompt instead.

---

## Tests

- `test_weak_area_threshold` — topic only flagged when all 3 conditions met
- `test_weak_area_not_flagged_low_attempts` — < 5 attempts not flagged
- `test_practice_chain_difficulty_progression` — drills sorted 1→2→3
- `test_practice_quota_free_tier` — 429 for free tier users
- `test_practice_chunks_user_scoped` — chunks only from requesting user
