# Quiz Results & UX Enhancement Design Spec

> **Project:** Clarift — AI Study Engine  
> **Date:** 2026-04-25  
> **Sub-Project:** Group A (Quiz Results + Quiz UX/Markdown)  
> **Status:** Approved for implementation

---

## Problem Statement

1. **Quiz results are too basic.** After submitting, users see only "Score: X%, Weak topics: ..." inline. There's no dedicated results page with detailed analysis.
2. **Correct answers are always visible.** Students can't self-test before seeing answers.
3. **Quiz UX is inconsistent.** Legacy `/quizzes/[id]` shows all questions at once (scroll), while newer `/quizzes/[id]/attempt` uses a wizard. Need to standardize.
4. **No markdown support.** Math equations, code blocks, and tables in questions are shown as plain text.
5. **Answer keys lack guardrails.** Identification questions might have markdown in `correct_answer`, breaking validation.

---

## Goals

- Create an enhanced quiz results page with score reveal, weak topics, mastery graph, and gated answer review
- Standardize all quiz attempts on the carousel/wizard pattern
- Render quiz questions and options as markdown (math, code, tables)
- Update backend prompts to generate markdown-formatted questions
- Add validation to ensure identification answer keys are plain text
- All components must support dark mode and use design.md brand tokens

---

## Architecture

### New Components

| Component | Path | Purpose |
|-----------|------|---------|
| `ScoreReveal` | `components/features/quiz/score-reveal.tsx` | Animated score display with contextual message |
| `WeakTopicsList` | `components/features/quiz/weak-topics-list.tsx` | Amber cards showing weak areas with accuracy |
| `QuestionReview` | `components/features/quiz/question-review.tsx` | Per-question review with reveal toggle |
| `QuizResultsActions` | `components/features/quiz/quiz-results-actions.tsx` | Retry quiz + reveal answers buttons |

### Modified Components

| Component | Path | Change |
|-----------|------|--------|
| `ResultsPage` | `app/(app)/quizzes/[id]/results/page.tsx` | Complete redesign with new sections |
| `AttemptWizard` | `components/features/quiz/attempt-wizard.tsx` | Redirect to results page after submit |
| `QuizAttempt` (legacy) | `components/features/quiz/quiz-attempt.tsx` | Deprecate — redirect to attempt wizard |
| `MasteryChart` | `components/features/quiz/mastery-chart.tsx` | Update colors to brand tokens |
| `MCQQuestion` | `components/features/quiz/attempt-wizard.tsx` | Render options with RichMarkdown |
| `QuestionText` | Inline usage in attempt-wizard.tsx | Use `RichMarkdown` component directly for question text rendering |

### Modified Backend

| File | Path | Change |
|------|------|--------|
| `quiz_chain.py` | `backend/src/chains/quiz_chain.py` | Update TYPE_PROMPTS for markdown, add answer key guardrails |

---

## Design Details

### Score Reveal Component

Follows `design.md` Score Reveal spec (lines 469-510):

```
Card layout — two sections separated by border

Top section (score display):
  background: linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(99,102,241,0.04) 100%)
  padding: 24px 20px, text-align: center
  border-bottom: 1px border-default

  Score ring:
    80px × 80px circle
    background: rgba(semantic-color, 0.1)  ← color matches score tier
    border: 2px solid rgba(semantic-color, 0.3)
    margin: 0 auto 10px

    Score number inside ring: 28px font-bold
      70%+:   success-500
      40–69%: accent-500 (amber)
      <40%:   danger-500
    "score" label below number: 10px, same color, opacity 0.8

  Contextual title (below ring):
    70%+:   "Great work — keep it up"
    40–69%: "Good progress — review weak areas"
    <40%:   "Keep going — practice makes perfect"
    font-size: 14px font-weight 600 text-primary

  Subtitle: "X of Y correct"
    font-size: 12px text-tertiary

Bottom section (per-topic breakdown):
  padding: 14px 18px, gap: 10px between topics

  Each topic row:
    [topic name text-sm font-medium text-primary]
    [accuracy % text-sm font-weight 600, right-aligned]
      strong (≥70%): success-500
      weak (<70%):   accent-500
    [3px progress bar below: success fill or amber fill]

Score number animates: counts up from 0 to final value over 800ms
  Use requestAnimationFrame, easeOutQuart easing
```

**Dark mode:** Use `dark:` variants for all colors. Gradient background uses `dark:from-success-500/5 dark:to-brand-500/5`.

### Weak Topics List

Follows `design.md` Weak Areas Display spec (lines 513-543):

```
Each weak topic — full card (not left-border row):
  background: surface-card
  border: 1px border-default
  border-radius: 12px
  padding: 14px 16px
  display: flex, align-items: center, gap: 12px
  margin-bottom: 8px

  Icon ring (left):
    36px × 36px, border-radius: 10px
    background: rgba(245,158,11,0.1)
    border: 1px solid rgba(245,158,11,0.2)
    Target icon, 18px, accent-500

  Content (flex: 1):
    Topic name: text-sm font-medium text-primary, margin-bottom 4px
    Progress bar: 3px height, accent-500 fill on border-default track
    Stat line: text-xs text-tertiary  e.g. "8 attempts across 3 quizzes"

  Percentage (right, flex-shrink: 0):
    font-size: 16px font-weight 700, color: accent-500

Empty state (no weak areas):
  text-center, padding: 32px 20px
  Target icon: 32px, text-tertiary, margin-bottom 12px
  Title: "No weak areas yet" text-sm font-medium text-primary
  Body: "Complete a few quizzes to discover your gaps." text-xs text-tertiary
  No CTA button — this state is informational only
```

**Note:** For results page, we don't have attempt history stats, so omit the "8 attempts across 3 quizzes" line.

### Topic Mastery Graph

Update `MasteryChart` to use brand tokens (recharts uses SVG attributes, not Tailwind classes):
- Grid: `stroke="#E5E4F0"` (border-default) / dark: `stroke="#2D2C45"`
- Axis text: `fill="#6B6888"` (text-secondary) / dark: `fill="#9896B8"`
- Radar stroke: `stroke="#6366F1"` (brand-500)
- Radar fill: `fill="#6366F1"` with `fillOpacity={0.3}`
- Weak areas (<70%): Use accent-500 `#F59E0B` for data points below 70%

### Question Review with Reveal Toggle

**Default state (answers hidden):**
- Show question text (markdown rendered)
- Show user's answer with color coding:
  - Correct: `bg-success-100 text-success-800` + CheckCircle icon
  - Incorrect: `bg-danger-100 text-danger-800` + XCircle icon
- "Correct answer hidden" placeholder in muted style
- No explanation shown

**Revealed state (after clicking button):**
- Show correct answer (if user was wrong)
- Show explanation (markdown rendered)
- Smooth fade-in: opacity 0→1 over 200ms

**Per-question layout:**
```
Card:
  background: surface-card
  border: 1px border-default
  border-radius: 16px
  padding: 18px (mobile), 24px (desktop)

Header (flex, space-between):
  Left: question number + type badge
  Right: correctness indicator (CheckCircle/XCircle)

Question text:
  prose-compact for markdown rendering
  margin: 14px 0

User answer row:
  flex row, gap-2
  Label: "Your answer:" text-xs text-secondary
  Value: text-sm with color coding

Correct answer row (hidden until reveal):
  Label: "Correct answer:" text-xs text-secondary
  Value: text-sm text-success-800

Explanation (hidden until reveal):
  background: surface-subtle
  border-radius: 10px
  padding: 12px 14px
  margin-top: 10px
  prose-compact for markdown
```

### Results Actions

Two buttons at bottom of page:
1. **"Reveal Correct Answers"** (Primary, `bg-brand-500`)
   - Disabled state if already revealed
   - On click: sets `showAnswers = true` in parent state
   - All question reviews animate to revealed state

2. **"Retry Quiz"** (Ghost, `text-text-secondary hover:bg-surface-overlay`)
   - Links to `/quizzes/[id]/attempt`
   - Starts fresh attempt

### Quiz Attempt Standardization

**Decision:** Deprecate legacy `QuizAttempt` component. All quiz attempts go through `AttemptWizard` at `/quizzes/[id]/attempt`.

**Changes to AttemptWizard:**
- After successful submit, redirect to `/quizzes/${quizId}/results?attempt_id=${response.attempt_id}`
- Remove any inline result display
- Ensure smooth transition (loading state during submit, then redirect)

**Legacy page update:**
- `/quizzes/[id]` should redirect to `/quizzes/[id]/attempt` (the dedicated attempt page already exists and uses AttemptWizard)

### Markdown Rendering

**Question text:**
- Use `RichMarkdown` component with `className="prose-compact"`
- Supports: LaTeX math (`$...$` and `$$...$$`), code blocks, tables, bold, italic, lists
- Already configured with `remark-math` + `rehype-katex`

**Option text (MCQ, Multi-Select, Ordering):**
- Also render via `RichMarkdown` but with minimal styling
- Use `className="prose-compact prose-p:text-sm prose-p:leading-normal"`
- Limit to inline elements (no headings, no blockquotes)

**True/False options:**
- No markdown needed (just "True" / "False")

**Identification input:**
- Plain text input (no markdown rendering)

### Backend Prompt Updates

**TYPE_PROMPTS modifications:**

Add to all prompts (after "Base every question STRICTLY on the provided source material"):
```
Markdown formatting is ALLOWED in question text and options:
- Use LaTeX ($...$ or $$...$$) for mathematical expressions, chemical formulas, and equations.
- Use code blocks (```lang...```) for programming snippets.
- Use tables (| col | col |) for structured data.
- Use bold/italic for emphasis.
- Use lists for multi-part information.

STRICT GUARDRAIL for identification/fill-in-the-blank questions:
- The `correct_answer` field MUST be plain text only.
- NEVER include markdown syntax (*, _, $, `, #, etc.) in `correct_answer`.
- NEVER include LaTeX in `correct_answer`.
- If the question asks about a formula, the answer must be the NAME or DESCRIPTION, not the formula itself.
- Example: Question: "The formula $E=mc^2$ represents ____. (2 words)" -> correct_answer: "mass-energy equivalence" NOT "$E=mc^2$".
```

**Validation update (_validate_questions):**

Add new validation for identification questions:
```python
elif qtype == "identification":
    answer = q.get("correct_answer", "")
    if not answer:
        errors.append(f"Identification question {q['id']} has empty correct_answer")
    elif len(str(answer).split()) > 5:
        errors.append(
            f"Identification question {q['id']} correct_answer too long "
            f"({len(str(answer).split())} words, max 5)"
        )
    # NEW: Check for markdown syntax in answer
    import re
    markdown_patterns = [r'\*\*', r'\*', r'_', r'\$', r'`', r'#', r'\[', r'\]\(', r'!\[']
    if any(re.search(pattern, str(answer)) for pattern in markdown_patterns):
        errors.append(
            f"Identification question {q['id']} correct_answer contains markdown syntax. "
            f"It must be plain text only."
        )
```

---

## Data Flow

### Quiz Attempt Flow
```
User starts quiz → AttemptWizard (carousel) → Submit → API POST /attempts
→ Backend validates → Returns attempt_id → Frontend redirects to /results?attempt_id=...
```

### Results Page Flow
```
Server Component fetches /attempts/{attempt_id} → Renders ScoreReveal + WeakTopics + MasteryChart
→ User clicks "Reveal Correct Answers" → Client state update → QuestionReview components re-render with answers visible
```

---

## Error Handling

- Results fetch fails: Show error state with "Retry" button
- Attempt submit fails: Show error in AttemptWizard, don't redirect
- Missing attempt_id param: `notFound()`
- Reveal answers: No error case (pure UI state)

---

## Testing Strategy

- **Unit:** ScoreReveal animation logic (count-up 0→score)
- **Unit:** QuestionReview state toggle (hidden/revealed)
- **Unit:** Backend validation catches markdown in identification answers
- **Integration:** Full quiz attempt → submit → redirect → results display
- **E2E:** Complete quiz, verify results page shows score, weak topics, mastery graph
- **E2E:** Click "Reveal Answers", verify correct answers appear
- **Visual:** Dark mode renders correctly for all new components

---

## Files to Create/Modify

### Create
- `frontend/src/components/features/quiz/score-reveal.tsx`
- `frontend/src/components/features/quiz/weak-topics-list.tsx`
- `frontend/src/components/features/quiz/question-review.tsx`
- `frontend/src/components/features/quiz/quiz-results-actions.tsx`

### Modify
- `frontend/src/app/(app)/quizzes/[id]/results/page.tsx` (complete rewrite)
- `frontend/src/components/features/quiz/attempt-wizard.tsx` (redirect after submit)
- `frontend/src/components/features/quiz/quiz-attempt.tsx` (deprecate or redirect)
- `frontend/src/components/features/quiz/mastery-chart.tsx` (brand tokens)
- `backend/src/chains/quiz_chain.py` (prompts + validation)

---

## Dependencies

- Frontend: No new packages (uses existing `react-markdown`, `remark-math`, `rehype-katex`)
- Backend: No new packages

---

## Out of Scope

- Practice drill changes (separate feature)
- Backend API route changes (use existing endpoints)
- Quiz generation settings UI changes
- Real-time collaboration or multiplayer

---

## Success Criteria

- [ ] Quiz results page shows animated score reveal with contextual message
- [ ] Weak topics displayed in amber cards with accuracy percentages
- [ ] Topic mastery radar graph uses brand tokens and supports dark mode
- [ ] "Reveal Correct Answers" button toggles answer visibility
- [ ] "Retry Quiz" button starts new attempt
- [ ] All quiz attempts use carousel/wizard pattern
- [ ] Quiz questions render markdown (math, code, tables)
- [ ] Quiz options render markdown
- [ ] Identification answer keys validated as plain text (no markdown)
- [ ] All components support dark mode
- [ ] No regression on existing quiz functionality
- [ ] TypeScript compiles without errors

---

## Grouping Note

This spec covers Sub-Projects 3 and 4 combined per user direction. Implementation plan will be written as a single plan with tasks for both areas.
