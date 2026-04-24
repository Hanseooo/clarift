# Summary Preferences Unification & LLM-Generated Titles Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify frontend/backend preference schemas (multi-select arrays), remove redundant creation-time format selector, add LLM-generated titles (max 32 chars) for summaries and quizzes, and allow inline renaming.

**Architecture:** Migrate DB columns from single TEXT to TEXT arrays, update chain prompts to generate titles in the same LLM call, update all frontend components to use new canonical option sets, and add a generic `RenameTitle` component backed by Next.js Server Actions.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Next.js 15, Drizzle ORM, React, Tailwind

---

## File Structure

| File | Responsibility |
|---|---|
| `backend/alembic/versions/..._unify_preferences_and_add_titles.py` | Migration: arrays + titles |
| `backend/src/db/models.py` | SQLAlchemy model updates |
| `backend/src/api/v1/schemas/summary.py` | Remove `format`, add `title`, update `UserPreferenceOverride` |
| `backend/src/api/v1/schemas/quiz.py` | Add `title` to `QuizResponse` |
| `backend/src/api/v1/routers/summaries.py` | Remove `format` from request, add `title` to response |
| `backend/src/api/v1/routers/quizzes.py` | Add `title` to response |
| `backend/src/chains/summary_chain.py` | Generate title in same call, remove format param |
| `backend/src/chains/quiz_chain.py` | Generate title in same call |
| `backend/src/services/summary_service.py` | Accept arrays, validate against canonical sets |
| `backend/src/services/quiz_service.py` | Accept title from chain |
| `backend/src/worker.py` | Persist `title` field |
| `frontend/src/db/schema.ts` | Drizzle schema: arrays + titles |
| `frontend/src/types/preferences.ts` | Update `OverridePreferences` interface |
| `frontend/src/lib/preference-options.ts` | NEW — shared canonical option constants |
| `frontend/src/components/features/onboarding/onboarding-form.tsx` | Use shared options, multi-select chips |
| `frontend/src/components/features/summary/summary-creation.tsx` | Remove format dropdown |
| `frontend/src/components/features/generation/override-settings-modal.tsx` | Use shared options, arrays |
| `frontend/src/components/features/summary/summary-card.tsx` | Display title, not format |
| `frontend/src/components/features/summary/summary-list.tsx` | Display title |
| `frontend/src/components/features/summary/summaries-client.tsx` | Display title, filter by title |
| `frontend/src/components/features/quiz/quiz-list.tsx` | Display title |
| `frontend/src/components/features/rename-title.tsx` | NEW — generic inline rename component |
| `frontend/src/db/actions/summary-actions.ts` | NEW — `updateSummaryTitle` Server Action |
| `frontend/src/db/actions/quiz-actions.ts` | NEW — `updateQuizTitle` Server Action |

---

## Chunk 1: Database Migration & Backend Models

### Task 1: Write Alembic Migration

**Files:**
- Create: `backend/alembic/versions/..._unify_preferences_and_add_titles.py`

- [ ] **Step 1: Write migration file**

```python
"""unify preferences to arrays and add titles

Revision ID: ...
Revises: ...
Create Date: ...
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '...'
down_revision = '...'
branch_labels = None
depends_on = None

def upgrade():
    # 1. user_preferences: single TEXT -> TEXT[] with remapping
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

def downgrade():
    # Reverse order
    op.drop_column('quizzes', 'title')
    op.add_column('summaries', sa.Column('format', sa.Text(), nullable=False, server_default='bullet'))
    op.drop_column('summaries', 'title')

    op.alter_column('user_preferences', 'explanation_styles', new_column_name='explanation_style')
    op.execute("ALTER TABLE user_preferences ALTER COLUMN explanation_style TYPE TEXT USING explanation_style[1]")

    op.alter_column('user_preferences', 'output_formats', new_column_name='output_format')
    op.execute("ALTER TABLE user_preferences ALTER COLUMN output_format TYPE TEXT USING output_formats[1]")
```

- [ ] **Step 2: Run migration**

```bash
cd backend
alembic upgrade head
```

Expected: Migration succeeds, no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/alembic/versions/..._unify_preferences_and_add_titles.py
git commit -m "feat: migrate preferences to arrays and add titles"
```

### Task 2: Update SQLAlchemy Models

**Files:**
- Modify: `backend/src/db/models.py`

- [ ] **Step 1: Update UserPreference model**

```python
class UserPreference(Base):
    __tablename__ = "user_preferences"
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    output_formats: Mapped[list[str]] = mapped_column(
        postgresql.ARRAY(sa.Text), nullable=False, default=["bullet_points"]
    )
    explanation_styles: Mapped[list[str]] = mapped_column(
        postgresql.ARRAY(sa.Text), nullable=False, default=["simple_direct"]
    )
    custom_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, default=sa.func.now()
    )
```

- [ ] **Step 2: Update Summary model**

```python
class Summary(Base):
    __tablename__ = "summaries"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    document_id: Mapped[UUID] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str | None] = mapped_column(Text, nullable=True)  # NEW
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # format REMOVED
    diagram_syntax: Mapped[str | None] = mapped_column(Text, nullable=True)
    diagram_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    quiz_type_flags: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=sa.func.now())
```

- [ ] **Step 3: Update Quiz model**

```python
class Quiz(Base):
    __tablename__ = "quizzes"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    document_id: Mapped[UUID] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str | None] = mapped_column(Text, nullable=True)  # NEW
    questions: Mapped[list[dict]] = mapped_column(JSONB, nullable=False)
    question_types: Mapped[list[str]] = mapped_column(postgresql.ARRAY(sa.Text), nullable=False)
    question_count: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    auto_mode: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=sa.func.now())
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/db/models.py
git commit -m "feat: update SQLAlchemy models for arrays and titles"
```

---

## Chunk 2: Backend API & Service Layer

### Task 3: Update Pydantic Schemas

**Files:**
- Modify: `backend/src/api/v1/schemas/summary.py`
- Modify: `backend/src/api/v1/schemas/quiz.py`

- [ ] **Step 1: Update Summary schemas**

```python
from pydantic import BaseModel, Field
from typing import Any
from uuid import UUID

class SummaryCreateRequest(BaseModel):
    document_id: UUID
    override_preferences: "UserPreferenceOverride" | None = None

class SummaryResponse(BaseModel):
    id: UUID
    document_id: UUID
    title: str | None = Field(None, max_length=32)
    content: str
    diagram_syntax: str | None
    diagram_type: str | None
    quiz_type_flags: dict[str, Any] | None
    created_at: datetime

class UserPreferenceOverride(BaseModel):
    output_formats: list[str] | None = Field(None, max_length=10)
    explanation_styles: list[str] | None = Field(None, max_length=10)
    custom_instructions: str | None = Field(None, max_length=500)
```

- [ ] **Step 2: Update Quiz schema**

```python
class QuizResponse(BaseModel):
    id: UUID
    document_id: UUID
    title: str | None = Field(None, max_length=32)
    questions: list[dict[str, Any]]
    question_types: list[str]
    question_count: int
    auto_mode: bool
    created_at: datetime
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/v1/schemas/summary.py backend/src/api/v1/schemas/quiz.py
git commit -m "feat: update pydantic schemas for arrays and titles"
```

### Task 4: Update Summary Router

**Files:**
- Modify: `backend/src/api/v1/routers/summaries.py`

- [ ] **Step 1: Remove format handling**

```python
# Remove any reference to 'format' in the request body handling
# The create endpoint should now only accept document_id and override_preferences
```

- [ ] **Step 2: Add title to response serialization**

```python
def _to_summary_response(summary: Summary) -> SummaryResponse:
    return SummaryResponse(
        id=summary.id,
        document_id=summary.document_id,
        title=summary.title,  # NEW
        content=summary.content,
        diagram_syntax=summary.diagram_syntax,
        diagram_type=summary.diagram_type,
        quiz_type_flags=summary.quiz_type_flags,
        created_at=summary.created_at,
    )
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/v1/routers/summaries.py
git commit -m "feat: remove format from summary router, add title to response"
```

### Task 5: Update Summary Service

**Files:**
- Modify: `backend/src/services/summary_service.py`

- [ ] **Step 1: Add canonical option constants and validation helper**

```python
OUTPUT_FORMAT_OPTIONS = {
    "bullet_points", "paragraphs", "q_and_a",
    "examples", "tables", "step_by_step"
}

EXPLANATION_STYLE_OPTIONS = {
    "simple_direct", "detailed_academic", "analogy_based",
    "socratic", "eli5", "mental_models"
}

def _validate_preferences(prefs: dict | None) -> dict:
    """Filter invalid preference values."""
    if not prefs:
        return {}
    result = {}
    if "output_formats" in prefs:
        result["output_formats"] = [
            v for v in prefs["output_formats"] if v in OUTPUT_FORMAT_OPTIONS
        ]
    if "explanation_styles" in prefs:
        result["explanation_styles"] = [
            v for v in prefs["explanation_styles"] if v in EXPLANATION_STYLE_OPTIONS
        ]
    if "custom_instructions" in prefs:
        result["custom_instructions"] = prefs["custom_instructions"]
    return result
```

- [ ] **Step 2: Update generate_summary_for_document signature**

```python
async def generate_summary_for_document(
    db,
    user_id: UUID,
    document_id: UUID,
    override_preferences: dict | None = None,
) -> SummaryChainOutput:
    # Remove format_value parameter
    validated_prefs = _validate_preferences(override_preferences)
    # ... rest of function
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/summary_service.py
git commit -m "feat: add preference validation, remove format param from summary service"
```

---

## Chunk 3: Backend Chains — Title Generation

### Task 6: Update Summary Chain

**Files:**
- Modify: `backend/src/chains/summary_chain.py`

- [ ] **Step 1: Update chain output type**

```python
class SummaryChainOutput(TypedDict):
    title: str
    content: str
    quiz_type_flags: dict[str, Any]
```

- [ ] **Step 2: Update final prompt to request title**

Append to the generation prompt:

```
Additional user preferences:
- Output formats to blend (if applicable): {output_formats}
- Explanation styles to blend (if applicable): {explanation_styles}
- Custom instructions: {custom_instructions}

Rules:
1. Incorporate the requested formats and styles where they naturally fit.
2. Generate a concise, descriptive title for this summary (max 32 characters).
3. Return ONLY valid JSON with keys: "title", "content", "quiz_type_flags".
```

- [ ] **Step 3: Parse title from LLM output**

```python
import json

# After LLM returns content:
try:
    parsed = json.loads(llm_output)
    title = parsed.get("title", "")[:32]
    content = parsed.get("content", "")
    quiz_type_flags = parsed.get("quiz_type_flags", {})
except json.JSONDecodeError:
    # Fallback: use first line as title if markdown, or generic
    title = "Untitled summary"[:32]
    content = llm_output
    quiz_type_flags = {}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/chains/summary_chain.py
git commit -m "feat: generate title in summary chain, remove diagram from output"
```

### Task 7: Update Quiz Chain

**Files:**
- Modify: `backend/src/chains/quiz_chain.py`

- [ ] **Step 1: Update chain output type**

```python
class QuizChainOutput(TypedDict):
    title: str
    questions: list[dict[str, Any]]
    question_types: list[str]
    question_count: int
```

- [ ] **Step 2: Update prompt to request title**

Append:

```
Also generate a concise title for this quiz based on the topics covered (max 32 characters).
Return JSON with keys: "title", "questions", "question_types", "question_count".
```

- [ ] **Step 3: Parse title from output**

Same pattern as summary chain: parse JSON, extract `title`, truncate to 32 chars.

- [ ] **Step 4: Commit**

```bash
git add backend/src/chains/quiz_chain.py
git commit -m "feat: generate title in quiz chain"
```

### Task 8: Update Worker Persistence

**Files:**
- Modify: `backend/src/worker.py`

- [ ] **Step 1: Persist title for summaries**

```python
# In run_summary_job, update the success path:
.values(
    title=chain_output["title"],  # NEW
    content=chain_output["content"],
    quiz_type_flags=chain_output["quiz_type_flags"],
)
```

- [ ] **Step 2: Persist title for quizzes**

```python
# In run_quiz_job, update the success path:
.values(
    title=chain_output["title"],  # NEW
    questions=chain_output["questions"],
    question_types=chain_output["question_types"],
    question_count=chain_output["question_count"],
)
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/worker.py
git commit -m "feat: persist title field in worker jobs"
```

---

## Chunk 4: Frontend — Schema & Shared Constants

### Task 9: Update Drizzle Schema

**Files:**
- Modify: `frontend/src/db/schema.ts`

- [ ] **Step 1: Update userPreferences table**

```typescript
export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  outputFormats: text("output_formats").array().notNull().default(["bullet_points"]),
  explanationStyles: text("explanation_styles").array().notNull().default(["simple_direct"]),
  customInstructions: text("custom_instructions"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Update summaries table**

```typescript
export const summaries = pgTable("summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),  // NEW, nullable for back-compat
  content: text("content").notNull(),
  diagramSyntax: text("diagram_syntax"),
  diagramType: text("diagram_type"),
  quizTypeFlags: jsonb("quiz_type_flags"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 3: Update quizzes table**

```typescript
export const quizzes = pgTable("quizzes", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),  // NEW, nullable for back-compat
  questions: jsonb("questions").notNull(),
  questionTypes: text("question_types").array().notNull(),
  questionCount: integer("question_count").notNull(),
  autoMode: boolean("auto_mode").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/db/schema.ts
git commit -m "feat: update drizzle schema for arrays and titles"
```

### Task 10: Create Shared Preference Options

**Files:**
- Create: `frontend/src/lib/preference-options.ts`

- [ ] **Step 1: Write shared constants file**

```typescript
export interface PreferenceOption {
  value: string;
  label: string;
  description: string;
}

export const OUTPUT_FORMAT_OPTIONS: PreferenceOption[] = [
  { value: "bullet_points", label: "Bullet Points", description: "Quick, scannable key concepts" },
  { value: "paragraphs", label: "Paragraphs", description: "Flowing prose with clear transitions" },
  { value: "q_and_a", label: "Q&A", description: "Question and answer format for active recall" },
  { value: "examples", label: "Examples", description: "Concrete examples that illustrate concepts" },
  { value: "tables", label: "Tables", description: "Structured comparisons and data" },
  { value: "step_by_step", label: "Step-by-Step", description: "Numbered procedures and processes" },
];

export const EXPLANATION_STYLE_OPTIONS: PreferenceOption[] = [
  { value: "simple_direct", label: "Simple & Direct", description: "Plain language, no fluff" },
  { value: "detailed_academic", label: "Detailed & Academic", description: "In-depth with technical terminology" },
  { value: "analogy_based", label: "Analogy-based", description: "Compare complex ideas to familiar things" },
  { value: "socratic", label: "Socratic", description: "Learn through guided questioning" },
  { value: "eli5", label: "ELI5", description: "Explain like I'm five — ultra simple" },
  { value: "mental_models", label: "Mental Models", description: "Frame concepts through useful mental models" },
];

export const EDUCATION_LEVEL_OPTIONS = [
  "High School",
  "College Undergraduate",
  "College Graduate",
  "Postgraduate",
  "Other",
];
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/preference-options.ts
git commit -m "feat: add shared preference option constants"
```

---

## Chunk 5: Frontend — Settings & Onboarding

### Task 11: Update OnboardingForm

**Files:**
- Modify: `frontend/src/components/features/onboarding/onboarding-form.tsx`

- [ ] **Step 1: Replace hardcoded options with imports**

```typescript
import {
  OUTPUT_FORMAT_OPTIONS,
  EXPLANATION_STYLE_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
} from "@/lib/preference-options";
```

- [ ] **Step 2: Update state to use arrays**

```typescript
const [selectedFormats, setSelectedFormats] = useState<string[]>(
  userPreferences?.outputFormats ?? ["bullet_points"]
);
const [selectedStyles, setSelectedStyles] = useState<string[]>(
  userPreferences?.explanationStyles ?? ["simple_direct"]
);
```

- [ ] **Step 3: Render multi-select chips**

```tsx
<fieldset>
  <legend>How should summaries look?</legend>
  <div className="flex flex-wrap gap-2">
    {OUTPUT_FORMAT_OPTIONS.map((option) => (
      <label
        key={option.value}
        className={cn(
          "cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors",
          selectedFormats.includes(option.value)
            ? "border-indigo-600 bg-indigo-50 text-indigo-900"
            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        )}
      >
        <input
          type="checkbox"
          className="sr-only"
          value={option.value}
          checked={selectedFormats.includes(option.value)}
          onChange={(e) => {
            const value = e.target.value;
            setSelectedFormats((prev) =>
              prev.includes(value)
                ? prev.filter((v) => v !== value)
                : [...prev, value]
            );
          }}
        />
        <span className="font-medium">{option.label}</span>
        <span className="ml-1 text-xs opacity-75">{option.description}</span>
      </label>
    ))}
  </div>
</fieldset>
```

Repeat for explanation styles using `EXPLANATION_STYLE_OPTIONS`.

- [ ] **Step 4: Update save handler**

```typescript
async function handleSave() {
  await savePreferences({
    outputFormats: selectedFormats,
    explanationStyles: selectedStyles,
    // ... other fields
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/features/onboarding/onboarding-form.tsx
git commit -m "feat: update onboarding form to use multi-select arrays and shared options"
```

---

## Chunk 6: Frontend — Summary Creation & Override Modal

### Task 12: Remove Format Dropdown from SummaryCreation

**Files:**
- Modify: `frontend/src/components/features/summary/summary-creation.tsx`

- [ ] **Step 1: Remove format state and dropdown**

```typescript
// REMOVE:
// const [format, setFormat] = useState<"bullet" | "outline" | "paragraph">("bullet");

// REMOVE the <select> dropdown and its options
```

- [ ] **Step 2: Update API call**

```typescript
const response = await authClient.POST("/api/v1/summaries", {
  body: {
    document_id: documentId,
    // REMOVED: format
    override_preferences: overridePreferences ?? undefined,
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/summary/summary-creation.tsx
git commit -m "feat: remove format dropdown from summary creation"
```

### Task 13: Update OverrideSettingsModal

**Files:**
- Modify: `frontend/src/components/features/generation/override-settings-modal.tsx`

- [ ] **Step 1: Use shared options and arrays**

```typescript
import {
  OUTPUT_FORMAT_OPTIONS,
  EXPLANATION_STYLE_OPTIONS,
} from "@/lib/preference-options";
```

- [ ] **Step 2: Update state to arrays**

```typescript
const [outputFormats, setOutputFormats] = useState<string[]>([]);
const [explanationStyles, setExplanationStyles] = useState<string[]>([]);
```

- [ ] **Step 3: Render multi-select using same chip pattern as OnboardingForm**

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/features/generation/override-settings-modal.tsx
git commit -m "feat: update override modal to use multi-select arrays"
```

---

## Chunk 7: Frontend — Display Titles

### Task 14: Update Summary Components

**Files:**
- Modify: `frontend/src/components/features/summary/summary-card.tsx`
- Modify: `frontend/src/components/features/summary/summary-list.tsx`
- Modify: `frontend/src/components/features/summary/summaries-client.tsx`

- [ ] **Step 1: Display title instead of format**

In `summary-card.tsx`:
```typescript
const displayTitle = summary.title ?? "Untitled summary";
// Use displayTitle instead of formatLabel
```

In `summary-list.tsx`:
```typescript
// Replace format display with:
<span>{summary.title ?? "Untitled summary"}</span>
```

In `summaries-client.tsx`:
```typescript
// Update search/filter to check title:
const filtered = summaries.filter((s) =>
  (s.title ?? "Untitled summary").toLowerCase().includes(searchQuery.toLowerCase())
);
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/summary/summary-card.tsx frontend/src/components/features/summary/summary-list.tsx frontend/src/components/features/summary/summaries-client.tsx
git commit -m "feat: display title instead of format in summary components"
```

### Task 15: Update QuizList

**Files:**
- Modify: `frontend/src/components/features/quiz/quiz-list.tsx`

- [ ] **Step 1: Display title instead of ID**

```typescript
// Replace:
// <p>Quiz {quiz.id.slice(0, 8)}</p>
// With:
<p className="text-sm font-medium text-text-primary truncate">
  {quiz.title ?? "Untitled quiz"}
</p>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/quiz/quiz-list.tsx
git commit -m "feat: display title instead of id in quiz list"
```

---

## Chunk 8: Frontend — Rename Component & Server Actions

### Task 16: Create RenameTitle Component

**Files:**
- Create: `frontend/src/components/features/rename-title.tsx`

- [ ] **Step 1: Write component**

```typescript
'use client';

import { useState } from 'react';
import { PencilIcon } from 'lucide-react'; // or your icon library

interface RenameTitleProps {
  id: string;
  currentTitle: string | null;
  onSave: (id: string, title: string) => Promise<void>;
}

export function RenameTitle({ id, currentTitle, onSave }: RenameTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(currentTitle ?? '');
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === currentTitle) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(id, trimmed);
      setIsEditing(false);
    } catch (error) {
      // Error handling: keep editing state, show toast if available
      console.error('Failed to rename:', error);
    } finally {
      setIsSaving(false);
    }
  }

  if (isEditing) {
    return (
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') {
            setTitle(currentTitle ?? '');
            setIsEditing(false);
          }
        }}
        maxLength={32}
        autoFocus
        disabled={isSaving}
        className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
      />
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="group flex items-center gap-1"
      type="button"
    >
      <span className="font-medium">{currentTitle ?? 'Untitled'}</span>
      <PencilIcon className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-50" />
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/rename-title.tsx
git commit -m "feat: add generic RenameTitle component"
```

### Task 17: Create Server Actions

**Files:**
- Create: `frontend/src/db/actions/summary-actions.ts`
- Create: `frontend/src/db/actions/quiz-actions.ts`

- [ ] **Step 1: Write summary rename action**

```typescript
'use server';

import { db } from '@/db';
import { summaries } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function updateSummaryTitle(summaryId: string, title: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  await db
    .update(summaries)
    .set({ title: title.slice(0, 32) })
    .where(eq(summaries.id, summaryId));

  revalidatePath('/summaries');
  revalidatePath(`/summaries/${summaryId}`);
}
```

- [ ] **Step 2: Write quiz rename action**

```typescript
'use server';

import { db } from '@/db';
import { quizzes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function updateQuizTitle(quizId: string, title: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  await db
    .update(quizzes)
    .set({ title: title.slice(0, 32) })
    .where(eq(quizzes.id, quizId));

  revalidatePath('/quizzes');
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/db/actions/summary-actions.ts frontend/src/db/actions/quiz-actions.ts
git commit -m "feat: add server actions for renaming summaries and quizzes"
```

### Task 18: Wire RenameTitle into Components

**Files:**
- Modify: `frontend/src/components/features/summary/summary-card.tsx`
- Modify: `frontend/src/components/features/quiz/quiz-list.tsx`

- [ ] **Step 1: Import and use RenameTitle**

In `summary-card.tsx`:
```typescript
import { RenameTitle } from '@/components/features/rename-title';
import { updateSummaryTitle } from '@/db/actions/summary-actions';

// In the card render:
<RenameTitle
  id={summary.id}
  currentTitle={summary.title}
  onSave={updateSummaryTitle}
/>
```

In `quiz-list.tsx`:
```typescript
import { RenameTitle } from '@/components/features/rename-title';
import { updateQuizTitle } from '@/db/actions/quiz-actions';

// In the list item render:
<RenameTitle
  id={quiz.id}
  currentTitle={quiz.title}
  onSave={updateQuizTitle}
/>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/summary/summary-card.tsx frontend/src/components/features/quiz/quiz-list.tsx
git commit -m "feat: wire RenameTitle into summary and quiz components"
```

---

## Chunk 9: Regenerate Types & Final Verification

### Task 19: Regenerate API Types

**Files:**
- Regenerate: `frontend/src/types/api.ts`

- [ ] **Step 1: Start backend**

```bash
cd backend
uvicorn app.main:app --reload
```

- [ ] **Step 2: Generate types**

```bash
cd frontend
pnpm run generate:api
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "chore: regenerate api types after schema changes"
```

### Task 20: Run Full Test Suite

- [ ] **Step 1: Backend tests**

```bash
cd backend
pytest -v
```

Expected: All tests pass. New tests for title generation should be included.

- [ ] **Step 2: Frontend tests**

```bash
cd frontend
pnpm run test:run
```

Expected: All tests pass.

- [ ] **Step 3: Lint checks**

```bash
cd backend && ruff check .
cd frontend && pnpm run lint  # or biome check
```

Expected: No errors.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address lint and test issues"
```

---

## Verification Checklist

- [ ] `user_preferences` table has `output_formats` and `explanation_styles` as TEXT[]
- [ ] `summaries` table has `title` column, no `format` column
- [ ] `quizzes` table has `title` column
- [ ] Backend tests pass
- [ ] Frontend tests pass
- [ ] `pnpm run generate:api` produces committed diff
- [ ] Onboarding form shows multi-select chips for formats and styles
- [ ] Summary creation has no format dropdown
- [ ] Summary cards display titles, not format labels
- [ ] Quiz list displays titles, not IDs
- [ ] Inline rename works for both summaries and quizzes
- [ ] Ruff and Biome pass with no errors

---

## Rollout Notes

- **Deployment order:** Backend first (migration must run before frontend expects new schema).
- **Backward compatibility:** Frontend falls back to "Untitled" for records without titles.
- **Old frontend compatibility:** Backend Pydantic `extra="ignore"` handles old `format` payloads gracefully.
