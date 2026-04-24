# Summary Preferences Unification & LLM-Generated Titles Design

> **Status:** Approved  
> **Scope:** Plan 2 of 3 (Mermaid removal = Plan 1, Chat state = Plan 3)

---

## Goal

Unify the divergent summary preference schemas between frontend and backend, replace ambiguous UX options, remove the redundant creation-time format selector, and add LLM-generated titles for summaries and quizzes.

---

## Background

**Current drift:**
- **Backend DB:** `user_preferences.output_format` and `user_preferences.explanation_style` are both single `TEXT` values (`bullet | step-by-step | example-first` and `simple | detailed | mental-models | eli5`).
- **Frontend UI:** Treats preferences as multi-select arrays with values like `Bullet Points`, `Paragraphs`, `Q&A`, `Flashcards`, `Summaries`.
- **Creation flow:** Uses yet another enum (`bullet | outline | paragraph`) sent to `POST /api/v1/summaries`.
- **Titles:** Summaries and quizzes display raw IDs or generic labels (`"Outline summary"`, `"Quiz 78716a5d"`), hurting wayfinding.

**Resolution:**
- Make preferences true multi-select arrays in the DB.
- Consolidate all option lists into one canonical set.
- Remove the creation-time `format` parameter entirely.
- Generate concise titles (max 32 chars) during the same LLM call that produces content.
- Allow users to rename via inline UI; store renames in the same `title` column.

---

## Architecture

### Data Flow

```
Onboarding / Settings Page
   └─> OnboardingForm (multi-select chips)
         └─> Server Action: savePreferences(userId, output_formats[], explanation_styles[])
               └─> Drizzle INSERT/UPDATE user_preferences (output_formats TEXT[], explanation_styles TEXT[])

Summary Creation
   └─> SummaryCreation (no format dropdown)
         └─> Optional: OverrideSettingsModal (same multi-select chips)
               └─> POST /api/v1/summaries { document_id, override_preferences? }
                     └─> ARQ Worker
                           └─> Summary Chain
                                 ├─> Generates markdown content
                                 ├─> Generates title (max 32 chars, same LLM call)
                                 └─> Persists: content, title, output_formats, explanation_styles

Quiz Creation
   └─> Same pattern: generates title + questions in one chain call
```

---

## Database Schema Changes

### Alembic Migration (Backend Source of Truth)

**File:** `backend/alembic/versions/..._unify_preferences_and_add_titles.py`

```python
# 1. user_preferences: single TEXT -> TEXT[] with value remapping
op.alter_column('user_preferences', 'output_format', new_column_name='output_formats')
op.execute("""
    ALTER TABLE user_preferences
    ALTER COLUMN output_formats TYPE TEXT[]
    USING ARRAY[
        CASE output_formats
            WHEN 'bullet' THEN 'bullet_points'
            WHEN 'step-by-step' THEN 'step_by_step'
            WHEN 'example-first' THEN 'examples'
            ELSE 'bullet_points'
        END
    ]
""")

op.alter_column('user_preferences', 'explanation_style', new_column_name='explanation_styles')
op.execute("""
    ALTER TABLE user_preferences
    ALTER COLUMN explanation_styles TYPE TEXT[]
    USING ARRAY[
        CASE explanation_styles
            WHEN 'simple' THEN 'simple_direct'
            WHEN 'detailed' THEN 'detailed_academic'
            WHEN 'mental-models' THEN 'mental_models'
            WHEN 'eli5' THEN 'eli5'
            ELSE 'simple_direct'
        END
    ]
""")

# 2. summaries: add title, remove format
op.add_column('summaries', sa.Column('title', sa.Text(), nullable=True))
op.drop_column('summaries', 'format')

# 3. quizzes: add title
op.add_column('quizzes', sa.Column('title', sa.Text(), nullable=True))
```

**Note:** Existing summaries/quizzes will have `title = NULL`. Frontend falls back to `"Untitled summary"` / `"Untitled quiz"` when `title` is absent.

### SQLAlchemy Models (Backend)

**File:** `backend/src/db/models.py`

```python
class UserPreference(Base):
    __tablename__ = "user_preferences"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    output_formats: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=["bullet_points"])
    explanation_styles: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=["simple_direct"])
    custom_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, default=now)

class Summary(Base):
    __tablename__ = "summaries"
    ...
    title: Mapped[str | None] = mapped_column(Text, nullable=True)  # NEW
    # format column REMOVED
    ...

class Quiz(Base):
    __tablename__ = "quizzes"
    ...
    title: Mapped[str | None] = mapped_column(Text, nullable=True)  # NEW
    ...
```

### Drizzle Schema (Frontend)

**File:** `frontend/src/db/schema.ts`

```typescript
export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  outputFormats: text("output_formats").array().notNull().default(["bullet_points"]),
  explanationStyles: text("explanation_styles").array().notNull().default(["simple_direct"]),
  customInstructions: text("custom_instructions"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const summaries = pgTable("summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),  // NEW, nullable for back-compat
  content: text("content").notNull(),
  diagramSyntax: text("diagram_syntax"),
  diagramType: text("diagram_type"),
  quizTypeFlags: jsonb("quiz_type_flags"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const quizzes = pgTable("quizzes", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),  // NEW, nullable for back-compat
  questions: jsonb("questions").notNull(),
  questionTypes: text("question_types").array().notNull(),
  questionCount: integer("question_count").notNull(),
  autoMode: boolean("auto_mode").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
```

---

## API Contract Changes

### Pydantic Schemas

**File:** `backend/src/api/v1/schemas/summary.py`

```python
class SummaryCreateRequest(BaseModel):
    document_id: UUID
    override_preferences: UserPreferenceOverride | None = None
    # REMOVED: format field

class SummaryResponse(BaseModel):
    id: UUID
    document_id: UUID
    title: str | None = Field(None, max_length=32)  # NEW
    content: str
    diagram_syntax: str | None
    diagram_type: str | None
    quiz_type_flags: dict[str, Any] | None
    created_at: datetime

class UserPreferenceOverride(BaseModel):
    output_formats: list[str] | None = Field(None, max_length=10)  # validated against canonical set in service layer
    explanation_styles: list[str] | None = Field(None, max_length=10)  # validated against canonical set in service layer
    custom_instructions: str | None = Field(None, max_length=500)
```

**File:** `backend/src/api/v1/schemas/quiz.py`

```python
class QuizResponse(BaseModel):
    id: UUID
    document_id: UUID
    title: str | None = Field(None, max_length=32)  # NEW
    questions: list[dict[str, Any]]
    question_types: list[str]
    question_count: int
    auto_mode: bool
    created_at: datetime
```

### FastAPI Routes

- `POST /api/v1/summaries` — remove `format` from request body; accept `override_preferences` with new array fields.
- `GET /api/v1/summaries/{document_id}` — response now includes `title`.
- `GET /api/v1/quizzes/{id}` — response now includes `title`.
- No new FastAPI routes for renames; handled via Next.js Server Actions.

### Backend Canonical Option Sets

Service-layer validation uses these exact string values (must match frontend):

```python
OUTPUT_FORMAT_OPTIONS = {
    "bullet_points", "paragraphs", "q_and_a",
    "examples", "tables", "step_by_step"
}

EXPLANATION_STYLE_OPTIONS = {
    "simple_direct", "detailed_academic", "analogy_based",
    "socratic", "eli5", "mental_models"
}
```

### Validation Strategy

- `UserPreferenceOverride` values are validated against `OUTPUT_FORMAT_OPTIONS` and `EXPLANATION_STYLE_OPTIONS` in the **service layer**, not in Pydantic. Invalid values are silently filtered out before reaching the LLM prompt. This keeps the FastAPI layer thin and allows the canonical set to evolve without changing Pydantic schemas.
- `title` length is enforced by the LLM prompt instruction and by `Field(max_length=32)` on response models. Chain output parsing should also validate `len(title) <= 32`.

### Generated Types

After backend changes, run:
```bash
cd frontend && pnpm run generate:api
```
This updates `src/types/api.ts` automatically.

---

## Prompt Engineering

### Summary Chain System Prompt Addition

**File:** `backend/src/chains/summary_chain.py`

Append to the final generation prompt:

```
Additional user preferences:
- Output formats to blend (if applicable): {output_formats}
- Explanation styles to blend (if applicable): {explanation_styles}
- Custom instructions: {custom_instructions}

Rules:
1. Incorporate the requested formats and styles where they naturally fit. Do not force a format if the content doesn't support it.
2. Generate a concise, descriptive title for this summary (max 32 characters).
3. Return ONLY valid JSON with keys: "title", "content", "diagram_syntax", "diagram_type", "quiz_type_flags".
```

### Quiz Chain System Prompt Addition

**File:** `backend/src/chains/quiz_chain.py`

Append to generation prompt:

```
Also generate a concise title for this quiz based on the topics covered (max 32 characters).
Return JSON with keys: "title", "questions", "question_types", "question_count".
```

---

## Frontend Components

### 1. OnboardingForm — Updated Options

**File:** `frontend/src/components/features/onboarding/onboarding-form.tsx`

```typescript
const OUTPUT_FORMAT_OPTIONS = [
  { value: "bullet_points", label: "Bullet Points", description: "Quick, scannable key concepts" },
  { value: "paragraphs", label: "Paragraphs", description: "Flowing prose with clear transitions" },
  { value: "q_and_a", label: "Q&A", description: "Question and answer format for active recall" },
  { value: "examples", label: "Examples", description: "Concrete examples that illustrate concepts" },
  { value: "tables", label: "Tables", description: "Structured comparisons and data" },
  { value: "step_by_step", label: "Step-by-Step", description: "Numbered procedures and processes" },
];

const EXPLANATION_STYLE_OPTIONS = [
  { value: "simple_direct", label: "Simple & Direct", description: "Plain language, no fluff" },
  { value: "detailed_academic", label: "Detailed & Academic", description: "In-depth with technical terminology" },
  { value: "analogy_based", label: "Analogy-based", description: "Compare complex ideas to familiar things" },
  { value: "socratic", label: "Socratic", description: "Learn through guided questioning" },
  { value: "eli5", label: "ELI5", description: "Explain like I'm five — ultra simple" },
  { value: "mental_models", label: "Mental Models", description: "Frame concepts through useful mental models" },
];
```

**Multi-select behavior:**
- Use checkbox chips or a multi-select dropdown.
- Minimum 1 selection required for each category.
- Save as `string[]` to Drizzle.

### 2. SummaryCreation — Remove Format Dropdown

**File:** `frontend/src/components/features/summary/summary-creation.tsx`

- Remove `const [format, setFormat] = useState(...)` and the `<select>` dropdown.
- Remove `format` from the `POST /api/v1/summaries` body.
- Keep the "Override Settings" button which opens `OverrideSettingsModal` using the same multi-select arrays.

### 3. OverrideSettingsModal

**File:** `frontend/src/components/features/generation/override-settings-modal.tsx`

- Update to use `output_formats` and `explanation_styles` arrays.
- Share the same `OUTPUT_FORMAT_OPTIONS` and `EXPLANATION_STYLE_OPTIONS` constants (extract to shared file if not already).

### 4. Summary & Quiz Cards — Display Title

**Files:**
- `frontend/src/components/features/summary/summary-card.tsx`
- `frontend/src/components/features/summary/summary-list.tsx`
- `frontend/src/components/features/summary/summaries-client.tsx`
- `frontend/src/components/features/quiz/quiz-list.tsx`

**Changes:**
- Display `summary.title ?? "Untitled summary"` instead of capitalizing `format`.
- Display `quiz.title ?? "Untitled quiz"` instead of `"Quiz {quiz.id.slice(0, 8)}"`.

### 5. Rename Inline Edit

**New component:** `frontend/src/components/features/rename-title.tsx`

This is a generic presentational component. The actual save action is injected as a prop so the component can be reused for both summaries and quizzes.

```typescript
// Pseudocode
export function RenameTitle({
  id,
  currentTitle,
  onSave,
}: {
  id: string;
  currentTitle: string | null;
  onSave: (id: string, title: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(currentTitle ?? "");

  async function save() {
    const trimmed = title.trim();
    if (trimmed && trimmed !== currentTitle) {
      await onSave(id, trimmed);
    }
    setIsEditing(false);
  }

  return isEditing ? (
    <input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === "Enter" && save()}
      maxLength={32}
      autoFocus
    />
  ) : (
    <span onClick={() => setIsEditing(true)}>
      {currentTitle ?? "Untitled"} <PencilIcon />
    </span>
  );
}
```

**Usage in summary card:**
```tsx
<RenameTitle
  id={summary.id}
  currentTitle={summary.title}
  onSave={updateSummaryTitle}
/>
```

**Usage in quiz list:**
```tsx
<RenameTitle
  id={quiz.id}
  currentTitle={quiz.title}
  onSave={updateQuizTitle}
/>
```

**Server Actions:**
- `frontend/src/db/actions/summary-actions.ts`: `updateSummaryTitle(summaryId: string, title: string)`
- `frontend/src/db/actions/quiz-actions.ts`: `updateQuizTitle(quizId: string, title: string)`

---

## Title Generation Constraints

- **Max length:** 32 characters (enforced by prompt + Pydantic `Field(max_length=32)`).
- **Generation timing:** Same LLM call as content generation (zero extra latency/cost).
- **Applicability:** Only for new summaries/quizzes created after deployment. Existing records show `"Untitled summary"` / `"Untitled quiz"` fallback.
- **Rename:** Users can edit via inline UI; no restrictions other than max 32 chars.

---

## Testing Strategy

### Backend
- `test_summary_chain_returns_title` — assert `len(title) <= 32` and title is non-empty.
- `test_quiz_chain_returns_title` — same.
- `test_create_summary_without_format_field` — assert 200, no format in DB.
- `test_user_preferences_arrays` — assert `output_formats` and `explanation_styles` persist as arrays.

### Frontend
- `test_summary_creation_no_format_dropdown` — assert dropdown is removed.
- `test_summary_card_shows_title` — assert title renders, not format label.
- `test_rename_title` — simulate inline edit, assert Server Action called.
- `test_onboarding_multi_select` — assert multiple options can be selected and saved.

### Integration
- End-to-end: create summary → verify title appears in list → rename → verify persistence.

---

## Rollout & Backward Compatibility

**Deployment order:** Backend first, then frontend. The backend migration and API changes must be live before the frontend starts sending array-based `override_preferences` payloads.

| Concern | Mitigation |
|---|---|
| Old frontend sends `format` to backend | Backend Pydantic models use `extra="ignore"` so unknown fields are silently dropped. Since the DB column is dropped, there is no deprecated-field period. |
| Existing summaries lack `title` | Frontend shows `"Untitled summary"` fallback. |
| Existing `user_preferences` rows have single TEXT | Migration remaps old values to new canonical array values via SQL CASE. |
| `generate:api` must be run | Listed as explicit step in implementation plan. |

---

## Open Issues / Follow-ups

1. **Plan 1 (Mermaid):** Remove `diagram_syntax` / `diagram_type` from schema after Plan 1 completes, or keep them nullable for backward compatibility.
2. **Plan 3 (Chat State):** Zustand store for cross-page chat memory; independent of this plan.
3. **Shared constants:** Consider extracting `OUTPUT_FORMAT_OPTIONS` and `EXPLANATION_STYLE_OPTIONS` to `frontend/src/lib/preference-options.ts` to share between onboarding, settings, and override modal.

---

## Decision Log

| Decision | Rationale |
|---|---|
| Multi-select arrays in DB | User wants LLM to blend formats, not enforce one rigidly. |
| Remove creation `format` enum | Redundant with global/multi-select preferences; simplifies UX. |
| Same LLM call for title | Avoids extra latency and token cost. |
| 32 char max title | Short enough for dense UI cards, long enough for descriptive names. |
| No backfill for existing records | Scope control; new records only. Fallback UI handles old records gracefully. |
| Rename via Next.js Server Action | Pure CRUD belongs in Next.js/Drizzle per architecture boundary. |
