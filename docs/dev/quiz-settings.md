# Feature: Quiz Settings + Content Analysis

> Extends [`features/quiz.md`](./quiz.md) with per-generation settings, content-aware type flagging, and auto vs manual mode.  
> Quiz settings are **per-generation only** — no global defaults.  
> See [`features/settings.md`](./settings.md) for the general settings architecture this follows.

---

## Question Types (MVP)

| Type | ID | Description | Example |
|---|---|---|---|
| Multiple Choice | `mcq` | 4 options, one correct | "Which of the following is..." |
| True/False | `true_false` | Binary correct/incorrect | "Osmosis requires ATP. True or False?" |
| Identification | `identification` | Fill-in-the-blank, single answer | "The ___ is the powerhouse of the cell." |
| Multi-select | `multi_select` | Multiple correct answers from options | "Which of the following are symptoms of..." |
| Ordering/Sequencing | `ordering` | Arrange steps in correct order | "Order the steps of glycolysis." |

---

## Content Analysis — Applicability Flags

Before a user generates a quiz, the system analyzes the document's summary and chunks to determine which question types are applicable to that specific material. This runs **once per document** when the summary is first generated, and is stored alongside the summary.

### Analysis Logic

```
MCQ          → Always applicable (any factual content supports MCQ)
True/False   → Applicable when content has clear true/false propositions
Identification → Applicable when content has specific terms, names, or values
Multi-select → Applicable when content has categories, lists, or grouped concepts
Ordering     → Applicable when content has sequential processes, steps, or timelines
```

### Storage

Applicability flags are stored in the `summaries` table as a JSON column:

```sql
ALTER TABLE summaries ADD COLUMN quiz_type_flags JSONB;
```

```json
{
  "mcq":          { "applicable": true,  "reason": "Content has factual statements" },
  "true_false":   { "applicable": true,  "reason": "Content has testable propositions" },
  "identification": { "applicable": true, "reason": "Content has specific terms and definitions" },
  "multi_select": { "applicable": false, "reason": "Content lacks grouped or categorical concepts" },
  "ordering":     { "applicable": true,  "reason": "Content describes a sequential process" }
}
```

### When Flags Are Generated

The content analysis step runs as **Step 6b** in the summary pipeline, parallel to the MermaidJS diagram step (Step 6a). Both are optional enrichment steps that run after the core 5-step summary chain.

```
Steps 1–5: Summary chain (unchanged)
Step 6a:   MermaidJS evaluation + generation (conditional)
Step 6b:   Quiz type applicability analysis (always runs, stores flags)
```

Both steps run concurrently in the ARQ worker using `asyncio.gather`.

---

## Quiz Settings Schema

Quiz settings are passed as an optional field on the quiz generation request. They are **not** stored in `user_preferences` — they are per-generation only.

### Pydantic Schema

```python
# app/api/v1/schemas/quiz.py

from pydantic import BaseModel, field_validator, model_validator
from typing import Literal
from uuid import UUID

class QuizTypeSettings(BaseModel):
    mcq: bool = True
    true_false: bool = True
    identification: bool = True
    multi_select: bool = True
    ordering: bool = True

    @model_validator(mode="after")
    def at_least_one_type(self):
        if not any([self.mcq, self.true_false, self.identification,
                    self.multi_select, self.ordering]):
            raise ValueError("At least one question type must be selected")
        return self

class QuizSettings(BaseModel):
    auto_mode: bool = True
    # When auto_mode=True: type_overrides is ignored
    # When auto_mode=False: type_overrides determines which types to include
    type_overrides: QuizTypeSettings | None = None

class QuizRequest(BaseModel):
    document_id: UUID
    settings: QuizSettings | None = None  # None = full auto mode
```

### Settings Resolution for Quiz

```python
# app/services/quiz_service.py

def resolve_quiz_settings(
    request_settings: QuizSettings | None,
    applicability_flags: dict,
) -> list[str]:
    """
    Returns the list of question types to include in this quiz.

    Resolution order:
    1. Start with all applicable types from content analysis flags
    2. If auto_mode=True (or no settings): use applicable types only
    3. If auto_mode=False: use user-selected types, but still exclude inapplicable ones
    4. Always exclude inapplicable types regardless of user selection
    """
    applicable = {
        type_id
        for type_id, flag in applicability_flags.items()
        if flag["applicable"]
    }

    # Auto mode or no settings — use all applicable types
    if not request_settings or request_settings.auto_mode:
        return list(applicable)

    # Manual mode — intersect user selection with applicable types
    if request_settings.type_overrides:
        user_selected = {
            type_id
            for type_id, enabled in request_settings.type_overrides.model_dump().items()
            if enabled
        }
        # Inapplicable types are always excluded, even if user selected them
        return list(user_selected & applicable)

    return list(applicable)
```

**The key rule:** Inapplicable types are always excluded, regardless of user selection. If a user manually enables `ordering` for a document that has no sequential processes, it is still excluded.

---

## Question Count Logic

The system determines question count based on chunk count (a proxy for content length):

```python
# app/services/quiz_service.py

def calculate_question_count(chunk_count: int, type_count: int) -> int:
    """
    Returns total question count for a quiz.
    Scales with content length. Distributes across selected types.
    Minimum: 5 questions. Maximum: 25 questions.
    """
    if chunk_count <= 3:
        base = 5
    elif chunk_count <= 8:
        base = 10
    elif chunk_count <= 15:
        base = 15
    else:
        base = 20

    # Scale slightly if many types are active (more variety)
    if type_count >= 4:
        base = min(base + 3, 25)

    return base

def distribute_questions(total: int, types: list[str]) -> dict[str, int]:
    """
    Distributes total question count across selected types.
    MCQ gets the largest share. Other types are distributed evenly.

    Example with total=10, types=[mcq, true_false, identification]:
    → { mcq: 5, true_false: 3, identification: 2 }
    """
    if not types:
        return {}

    distribution = {}

    if "mcq" in types and len(types) > 1:
        mcq_count = max(total // 2, 2)
        remaining = total - mcq_count
        other_types = [t for t in types if t != "mcq"]
        per_other = remaining // len(other_types)
        remainder = remaining % len(other_types)

        distribution["mcq"] = mcq_count
        for i, t in enumerate(other_types):
            distribution[t] = per_other + (1 if i < remainder else 0)
    else:
        per_type = total // len(types)
        remainder = total % len(types)
        for i, t in enumerate(types):
            distribution[t] = per_type + (1 if i < remainder else 0)

    return distribution
```

---

## Updated Quiz Chain

Location: `app/chains/quiz_chain.py`

The chain receives the resolved type list and distribution — it doesn't make those decisions itself.

```python
class QuizChain:
    async def run(
        self,
        chunks: list[str],
        settings: ResolvedSettings,           # global settings (format, style, custom instructions)
        question_distribution: dict[str, int], # e.g. {"mcq": 5, "true_false": 3, "identification": 2}
    ) -> QuizOutput:
        ...
```

### Generation Prompt (Dynamic by Type)

Each type has a specific sub-prompt that is assembled into the full generation prompt:

```python
TYPE_PROMPTS = {
    "mcq": "Generate {count} multiple choice questions with exactly 4 options each. Mark the correct answer.",
    "true_false": "Generate {count} true/false questions about clear factual claims.",
    "identification": "Generate {count} fill-in-the-blank questions. Blank replaces a specific term or value.",
    "multi_select": "Generate {count} multiple-select questions where 2 or more answers are correct. Mark all correct answers.",
    "ordering": "Generate {count} sequencing questions where the student arranges steps in the correct order. Provide 4-6 steps each.",
}
```

The full prompt is assembled as:

```python
def build_quiz_prompt(distribution: dict[str, int]) -> str:
    instructions = []
    for type_id, count in distribution.items():
        if count > 0:
            instructions.append(TYPE_PROMPTS[type_id].format(count=count))

    return "\n".join([
        "Generate the following questions strictly from the provided study material.",
        "Do not use knowledge outside the provided content.",
        "",
        *instructions,
        "",
        "Return valid JSON matching the quiz schema exactly.",
    ])
```

---

## Updated Quiz JSON Schema

Extended to support all five question types:

```json
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "question": "Which enzyme catalyzes...",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "B",
      "topic": "Enzymes",
      "explanation": "..."
    },
    {
      "id": "q2",
      "type": "true_false",
      "question": "ATP is produced during glycolysis.",
      "correct_answer": true,
      "topic": "Glycolysis",
      "explanation": "..."
    },
    {
      "id": "q3",
      "type": "identification",
      "question": "The ___ is responsible for ATP synthesis in mitochondria.",
      "correct_answer": "ATP synthase",
      "topic": "Mitochondria",
      "explanation": "..."
    },
    {
      "id": "q4",
      "type": "multi_select",
      "question": "Which of the following are products of aerobic respiration?",
      "options": ["ATP", "CO2", "Ethanol", "H2O", "Lactic acid"],
      "correct_answers": ["ATP", "CO2", "H2O"],
      "topic": "Aerobic Respiration",
      "explanation": "..."
    },
    {
      "id": "q5",
      "type": "ordering",
      "question": "Arrange the steps of the citric acid cycle in order.",
      "steps": ["Isocitrate formation", "Oxaloacetate regeneration", "Citrate formation", "Succinate formation"],
      "correct_order": [2, 0, 3, 1],
      "topic": "Citric Acid Cycle",
      "explanation": "..."
    }
  ]
}
```

---

## Content Analysis Chain

Location: `app/chains/content_analysis_chain.py`

Separate from the quiz chain. Runs once per document, stored with summary.

```python
ANALYSIS_PROMPT = """
Analyze this study content and determine which question types are applicable.

For each type, respond with applicable: true or false and a brief reason.

Types to evaluate:
- true_false: Does the content have clear true/false propositions or binary facts?
- identification: Does the content have specific named terms, values, or definitions to recall?
- multi_select: Does the content have grouped concepts, categories, or lists where multiple items share a property?
- ordering: Does the content describe sequential steps, processes, or timelines with a defined order?

Note: MCQ is always applicable and does not need evaluation.

Return JSON only:
{
  "true_false":   { "applicable": bool, "reason": "..." },
  "identification": { "applicable": bool, "reason": "..." },
  "multi_select": { "applicable": bool, "reason": "..." },
  "ordering":     { "applicable": bool, "reason": "..." }
}
"""
```

---

## Frontend: Quiz Generation Panel

### Applicability Flags Display

Before the user clicks "Generate Quiz", the panel shows which types are applicable for this document:

```
Generate Quiz for: [Document Title]

Question Types         Status
─────────────────────────────────────────
☑ Multiple Choice      ✓ Applicable
☑ True / False         ✓ Applicable
☑ Identification       ✓ Applicable
☐ Multi-select         ✗ Not applicable for this material
☑ Ordering / Sequence  ✓ Applicable

[Auto] toggle: ON  ← when ON, checkboxes are disabled (greyed out)
                     system selects from applicable types automatically

[Generate Quiz]
```

When **Auto is ON:**
- Checkboxes are visible but disabled (greyed, unclickable)
- Applicable types show a checkmark, inapplicable show ✗
- User sees what auto mode will do without being able to change it

When **Auto is OFF:**
- Checkboxes become interactive
- Inapplicable types remain disabled with ✗ — user cannot select them
- User can deselect applicable types if they want fewer type varieties

### Component Location

`components/features/quiz/quiz-settings-panel.tsx`

Props:
```typescript
interface QuizSettingsPanelProps {
  applicabilityFlags: QuizTypeFlags  // from summary.quizTypeFlags
  onGenerate: (settings: QuizSettings | null) => void
}
```

When auto mode is on and all defaults match, `onGenerate` is called with `null` (no override needed). When user makes changes, it passes the full `QuizSettings` object.

---

## Drizzle Schema Update

```typescript
// frontend/src/db/schema.ts — updated summaries table
export const summaries = pgTable("summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  format: text("format").notNull(),
  content: text("content").notNull(),
  diagramSyntax: text("diagram_syntax"),
  diagramType: text("diagram_type"),
  quizTypeFlags: jsonb("quiz_type_flags"),  // QuizTypeFlags | null
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// Type for quiz type flags
export type QuizTypeFlags = {
  mcq:            { applicable: true;  reason: string }  // always true
  true_false:     { applicable: boolean; reason: string }
  identification: { applicable: boolean; reason: string }
  multi_select:   { applicable: boolean; reason: string }
  ordering:       { applicable: boolean; reason: string }
}
```

---

## Updated master-spec Schema Changes

The following SQL additions are needed in Alembic:

```sql
-- Add to summaries table
ALTER TABLE summaries ADD COLUMN quiz_type_flags JSONB;

-- No changes to quizzes table — question types are in the questions JSONB
```

---

## Tests

**Backend (pytest):**

```
test_content_analysis_detects_ordering       — sequential content flags ordering=true
test_content_analysis_detects_multi_select   — categorical content flags multi_select=true
test_content_analysis_no_ordering            — definition list flags ordering=false
test_mcq_always_applicable                   — mcq is never flagged false
test_quiz_settings_auto_uses_applicable      — auto mode returns only applicable types
test_quiz_settings_manual_excludes_inapplicable — user-selected inapplicable type excluded
test_quiz_settings_manual_at_least_one       — all unchecked returns 422
test_question_count_short_content            — 3 chunks → 5 questions
test_question_count_long_content             — 15+ chunks → 15-20 questions
test_question_distribution_mcq_majority      — mcq gets ~50% of questions
test_quiz_chain_all_types_valid_json         — all 5 types parse correctly
test_ordering_question_has_steps_array       — ordering type has steps field
test_multi_select_has_correct_answers_array  — multi_select has correct_answers (plural)
```

**Frontend (vitest):**

```
QuizSettingsPanel shows applicable types with checkmarks
QuizSettingsPanel shows inapplicable types as disabled with ✗
Auto mode ON: checkboxes are disabled
Auto mode OFF: applicable checkboxes become interactive
Auto mode OFF: inapplicable checkboxes remain disabled
Generate called with null when auto=ON and no changes
Generate called with QuizSettings when auto=OFF
```
