# Design Spec: Chat Persona System & AI Output Improvements

> **Date:** 2026-05-02  
> **Status:** Approved for implementation  
> **Scope:** Backend chains, frontend chat/settings UI, quiz answer validation  

---

## 1. Overview

This spec addresses five interconnected improvements to Clarift's AI output system:

1. **Chat Persona System** — Replace strict RAG with Tutor mode as default; add configurable personas.
2. **Acceptable Answers** — Allow identification questions to have multiple valid answers (aliases, abbreviations, alternate spellings).
3. **Identification UX Fix** — Fix the "double word" blank-fill problem where the sentence reads redundantly.
4. **Modular Prompt Composition** — Extract reusable prompt "skills" to ensure consistency and reduce token bloat.
5. **Universal Preference Injection** — Wire existing user preferences (education level, explanation style, custom instructions) into **all** chains, not just summary.

---

## 2. Chat Persona System

### 2.1 Problem

Current chat is strict RAG: "Answer ONLY from provided chunks." This feels robotic and limits the product's value as a study partner. Students often want to ask follow-ups, get elaboration, or have a natural conversation.

### 2.2 Solution

Replace strict RAG with **Tutor mode** as the default. Introduce three **modes** and five **personas**.

#### Modes (behavioral contract)

| Mode | Source Knowledge | General Knowledge | Labels Required |
|---|---|---|---|
| `strict_rag` | Only from chunks | Never | Citations `[N]` only |
| `tutor` (default) | First, preferred | Allowed if clearly labeled | `[N]` for source; `[AI Knowledge]:` for external |
| `socratic` | Guides from source | Rarely | Cites source when used |

#### Personas (tone + explanation style combined)

Each persona is a complete profile. The LLM receives a single persona description, not raw settings.

| Persona | Tone | Explanation Style | Best For |
|---|---|---|---|
| `default` | Neutral, helpful | Adapts to question | General use |
| `encouraging` | Warm, supportive | Step-by-step with gentle praise | Students who need confidence |
| `direct` | Concise, no fluff | Bullet points, facts only | Exam cramming |
| `witty` | Light humor | Analogies, memorable framing | Dry or difficult topics |
| `patient` | Gentle, never rushed | Socratic, asks guiding questions | Deep understanding |

**Rule:** Tone and explanation style are **combined** into a single persona to avoid combinatorial complexity and LLM confusion.

### 2.3 System Prompt Structure (Tutor Mode)

```
You are Clarift, an AI study assistant for Filipino students. Your current persona is {persona_name}.

## Persona: {persona_name}
{persona_description}

## Mode: {mode_name}
{mode_behavior_rules}

## Provided Context
[1] <chunk 1>
[2] <chunk 2>
...

## Rules
1. Source-first: Always check the provided context first. Cite chunks with [N].
2. Label external knowledge: If you use general knowledge beyond the chunks, preface it with "[AI Knowledge]:".
3. Never contradict the source material. If general knowledge conflicts with the chunks, trust the chunks.
4. If the answer is not in the chunks and you genuinely don't know, say "I don't have enough information in your notes to answer that."
5. Be conversational. Greet naturally, ask clarifying questions when ambiguous, and offer follow-up suggestions.

## Output Format
<answer>
[Markdown-formatted response...]
</answer>

<used_citations>
[Comma-separated numbers, or NONE]
</used_citations>
```

### 2.4 Chat Settings Data Model

**Backend:** Extend `users.user_preferences` JSONB:

```json
{
  "education_level": "College Undergraduate",
  "output_formats": ["bullet_points"],
  "explanation_styles": ["simple_direct"],
  "custom_instructions": "Relate examples to nursing contexts",
  "chat_settings": {
    "mode": "tutor",
    "persona": "encouraging"
  }
}
```

**Frontend TypeScript:**

```typescript
// frontend/src/types/preferences.ts
export interface ChatSettings {
  mode: "strict_rag" | "tutor" | "socratic";
  persona: "default" | "encouraging" | "direct" | "witty" | "patient";
}

export interface OverridePreferences {
  education_level?: string;
  output_formats?: string[];
  explanation_styles?: string[];
  custom_instructions?: string;
  chat_settings?: ChatSettings;
}
```

### 2.5 Frontend: Chat Settings UI

**Location:** Settings page (`/settings`) and inline chat override.

**Design (per `design.md`):**
- Use **option cards** (not dropdowns) for mode and persona selection.
- Each card must have: icon box, title, description, and **preview snippet** showing an example response in that style.
- Selected state: `border-brand-500`, `bg-brand-50/5`, checkmark badge top-right.
- Mobile: stacked cards, full width. Desktop: 2-column grid.
- Custom instructions textarea: max 500 chars, counter turns amber at 400, red at 480.

**Inline Override:** Chat header shows current persona as a small chip. Tapping it opens a bottom sheet (mobile) or popover (desktop) to temporarily override mode/persona for that session only. Override does not persist to user settings.

---

## 3. Acceptable Answers for Identification

### 3.1 Problem

Identification questions currently accept only a single `correct_answer`. This fails for:
- Abbreviations vs full names (`HTTP` vs `Hypertext Transfer Protocol`)
- Alternate spellings (`color` vs `colour`)
- "Give at least one..." questions where multiple answers are valid

### 3.2 Solution

Add `acceptable_answers: string[]` to identification question JSON.

**Schema:**
```json
{
  "id": "id1",
  "type": "identification",
  "question": "What protocol encrypts web traffic? (abbreviation)",
  "correct_answer": "HTTPS",
  "acceptable_answers": ["HTTPS", "Hypertext Transfer Protocol", "HTTP Secure"],
  "explanation": "HTTPS is the secure version of HTTP."
}
```

**Rules:**
- `correct_answer` remains the **canonical** answer displayed to the user.
- `acceptable_answers` is **optional**. Existing quizzes without it continue to work (lazy backfill).
- LLM is instructed to populate `acceptable_answers` only when genuinely applicable (e.g., abbreviations, common synonyms).
- If `acceptable_answers` is empty or missing, grading falls back to `correct_answer` only.

### 3.3 Grading Logic

```python
from difflib import SequenceMatcher

_SIMILARITY_THRESHOLD = 0.85

def _normalize(s: str) -> str:
    return s.strip().lower().rstrip(".")

def _is_similar(a: str, b: str) -> bool:
    return SequenceMatcher(None, a, b).ratio() >= _SIMILARITY_THRESHOLD

def check_identification(user_answer: str, question: dict) -> bool:
    user = _normalize(user_answer)
    canonical = _normalize(question["correct_answer"])
    if user == canonical or _is_similar(user, canonical):
        return True
    for ans in question.get("acceptable_answers") or []:
        norm = _normalize(ans)
        if user == norm or _is_similar(user, norm):
            return True
    return False
```

**Fuzzy matching:** Uses `difflib.SequenceMatcher` with an 0.85 threshold to catch typos and minor spelling variations (e.g., `colour` vs `color`, `hte` vs `the`). This is lightweight, has no external dependencies, and runs synchronously.

**Shared utility:** Both `submit_quiz_attempt()` and `get_attempt_by_id()` in `quiz_service.py` must call `check_identification()` (or a unified `grade_question()` utility) to ensure consistency between submission scoring and review breakdown.

### 3.4 Prompt Update

In `quiz_chain.py` identification `TYPE_PROMPT`, add:

```
- If the answer has common abbreviations, synonyms, or alternate spellings, include them in `acceptable_answers`.
- Example: "correct_answer": "HTTPS", "acceptable_answers": ["HTTPS", "Hypertext Transfer Protocol"]
- If there are no valid alternatives, omit `acceptable_answers` or set it to [].
```

---

## 4. Identification UX Fix — Double Word Problem

### 4.1 Problem

When the LLM creates a fill-in-the-blank for multi-word answers, the surrounding text often repeats part of the answer:

> Question: `"This topic focuses on ___ experiences (2 words)"`  
> Answer: `"user experiences"`  
> Filled: `"This topic focuses on user experiences experiences"` ← Redundant

### 4.2 Solution

**Prompt instruction addition:**

```
When creating a fill-in-the-blank for multi-word answers, replace ONLY the first word of the answer phrase with the blank. Ensure the sentence reads naturally when the correct answer is inserted.

WRONG: "The study of ___ behavior (2 words)" -> "human behavior" -> "The study of human behavior behavior"
CORRECT: "The study of ___ (2 words)" -> "human behavior" -> "The study of human behavior"
```

**Validation:** Add a lightweight check in `quiz_chain.py` validation that logs an `INFO` level warning if `question` contains `correct_answer` as a substring after the blank. This does **not** block quiz generation — it is purely for observability so we can monitor prompt effectiveness.

---

## 5. Modular Prompt Composition ("Skills")

### 5.1 Problem

Every chain duplicates:
- Source fidelity rules
- Filipino student persona
- JSON output formatting rules
- Self-check instructions

This causes token bloat (~2000+ tokens for quiz chain) and inconsistency.

### 5.2 Solution

Extract reusable prompt modules into `backend/src/chains/prompts/`:

```
prompts/
├── __init__.py
├── persona.py          # Clarift persona definitions
├── fidelity.py         # Source fidelity rules
├── output_rules.py     # JSON/XML formatting rules
├── self_check.py       # Self-check templates
├── preferences.py      # User preference injection builder
├── fallback.py         # Fallback behavior instructions
└── chat_modes.py       # Mode-specific behavior rules
```

### 5.3 Usage Example

```python
from src.chains.prompts import persona, fidelity, output_rules, preferences, chat_modes

prompt = f"""
{persona.clarift()}
{chat_modes.tutor()}
{fidelity.strict_source_only()}
{preferences.build_context(user_prefs)}
{output_rules.json(QUESTION_SCHEMA)}

## Task
Generate quiz questions from the following chunks:
{chunk_text}
"""
```

### 5.4 Benefit

- **Consistency:** One source of truth for fidelity, persona, formatting.
- **Token efficiency:** No duplicated paragraphs across chains.
- **Testability:** Each module can be unit-tested independently.
- **A/B testing:** Swap persona or fidelity modules without touching chain logic.

---

## 6. Universal Preference Injection

### 6.1 Problem

User preferences (`education_level`, `output_formats`, `explanation_styles`, `custom_instructions`) are **only used by the summary chain**. They are completely ignored by quiz, practice, and chat.

### 6.2 Solution

Create a shared utility `build_preference_context(prefs: dict | None) -> str` that all chains call.

**Utility (`backend/src/chains/prompts/preferences.py`):**

```python
def build_preference_context(prefs: dict | None) -> str:
    if not prefs:
        return ""
    parts = []
    if level := prefs.get("education_level"):
        parts.append(f"Adapt complexity to {level} level when the material allows.")
    if styles := prefs.get("explanation_styles"):
        parts.append(f"Use these explanation styles when natural: {', '.join(styles)}.")
    if custom := prefs.get("custom_instructions"):
        # Sanitize to prevent prompt injection: strip delimiters and wrap in XML
        safe = custom[:500]
        for token in ["---", "###", "<|", "[/INST]", "<script", "<?xml"]:
            safe = safe.replace(token, "")
        safe = safe.strip()
        parts.append(
            f"<user_preferences>\n<custom_instructions>\n{safe}\n</custom_instructions>\n</user_preferences>"
        )
    return "\n".join(parts)
```

**Hard constraint prepended to every prompt:**
```
NEVER contradict the source material. NEVER invent facts. If a preference cannot be applied naturally, ignore it.
```

### 6.3 Rollout

| Chain | Preference Fields Used |
|---|---|
| Summary | All (already implemented; migrate to shared utility) |
| Quiz | `education_level`, `explanation_styles`, `custom_instructions` |
| Practice | `education_level`, `explanation_styles`, `custom_instructions` |
| Chat | `education_level`, `explanation_styles`, `custom_instructions`, `chat_settings` |

---

## 7. Multi-Select Grading & Display Fix

### 7.1 Problem

The frontend shows blank/missing correct answers for multi-select questions. Additionally, **backend grading is broken**: `quiz_service.py` uses `question.get("correct_answer")` for all question types, but multi-select questions store answers in `correct_answers` (array). This causes multi-select answers to always be graded as incorrect.

### 7.2 Backend Fix

Update both `submit_quiz_attempt()` and `get_attempt_by_id()` to handle multi-select:

```python
def grade_question(question: dict, user_answer) -> bool:
    qtype = question.get("type")
    if qtype == "multi_select":
        expected = set(a.strip().lower() for a in question.get("correct_answers") or [])
        selected = set(a.strip().lower() for a in (user_answer if isinstance(user_answer, list) else [user_answer]))
        return selected == expected
    elif qtype == "identification":
        return check_identification(str(user_answer), question)
    else:
        expected = str(question.get("correct_answer") or "").strip().lower()
        return str(user_answer).strip().lower() == expected
```

Both service methods must call `grade_question()` to ensure consistency.

### 7.3 Frontend Fix

Audit all frontend code that accesses `question.correct_answer`:
- Quiz runner: answer option rendering
- Quiz review: correct answer display
- Score reveal: per-question breakdown

Ensure multi-select questions use `question.correct_answers` (array) throughout the UI pipeline.

---

## 8. API & Schema Changes

### 8.1 Backend Models

No database migration needed — all changes are within existing JSONB columns or prompt strings.

### 8.2 Pydantic Models

**`backend/src/api/schemas/quiz.py`:**

```python
class QuizQuestion(BaseModel):
    id: str
    type: Literal["mcq", "true_false", "identification", "multi_select", "ordering"]
    question: str
    topic: str
    explanation: str
    options: list[str] | None = None
    correct_answer: str | bool | None = None
    correct_answers: list[str] | None = None      # for multi-select
    acceptable_answers: list[str] | None = None   # NEW: for identification aliases
    steps: list[str] | None = None
    correct_order: list[int] | None = None

class AttemptQuestionResponse(BaseModel):
    # ... existing fields ...
    acceptable_answers: list[str] | None = None   # NEW: so frontend can show alternatives in review
```

**`backend/src/api/schemas/chat.py`:**

```python
class ChatRequest(BaseModel):
    query: str
    document_ids: list[str] | None = None
    messages: list[dict] | None = None
    mode_override: Literal["strict_rag", "tutor", "socratic"] | None = None  # NEW
    persona_override: Literal["default", "encouraging", "direct", "witty", "patient"] | None = None  # NEW: session-only override
```

### 8.3 OpenAPI Regeneration

After backend changes, run:
```bash
cd frontend && pnpm run generate:openapi
```

---

## 9. Implementation Plan

### Phase 1: Foundation (Backend)

1. **Fix chat architecture layering**
   - Move LLM prompt construction and invocation from `services/chat_chain.py` to `src/chains/chat_chain.py`
   - Create `src/services/chat_service.py` that handles retrieval, preference fetching, and delegates to the chain
   - Update `routers/chat.py` to call the service
2. **Create `backend/src/chains/prompts/` modules**
   - `persona.py`, `fidelity.py`, `output_rules.py`, `self_check.py`, `preferences.py`, `fallback.py`, `chat_modes.py`
3. **Update `preferences.py` utility**
   - `build_preference_context()` with sanitization
4. **Update chat chain**
   - New system prompt with mode + persona support
   - Inject `chat_settings` from user preferences
   - Handle `mode_override` / `persona_override` from request
5. **Update quiz chain**
   - Add `acceptable_answers` to identification prompt
   - Add double-word UX instruction
   - Inject `build_preference_context()`
6. **Update practice chain**
   - Inject `build_preference_context()`
7. **Update grading logic**
   - Extract unified `grade_question()` utility
   - `check_identification()` uses `acceptable_answers` + fuzzy matching
   - Fix multi-select grading in both `submit_quiz_attempt()` and `get_attempt_by_id()`

### Phase 2: Frontend

7. **Update settings page**
   - Add chat mode selector (option cards)
   - Add persona selector (option cards)
   - Each with preview snippets
8. **Update chat UI**
   - Show persona chip in header
   - Tap chip → bottom sheet/popover for inline override
   - Update message rendering to handle `[AI Knowledge]:` labels
9. **Fix multi-select display bug**
   - Audit all `correct_answer` references; use `correct_answers` for multi-select

### Phase 3: Polish & Verification

10. **Add tests**
    - `test_build_preference_context()` — sanitization, formatting
    - `test_check_identification()` — canonical + aliases
    - `test_chat_mode_prompt_injection()` — strict vs tutor vs socratic
11. **Run verification**
    - `ruff check . && pytest` (backend)
    - `pnpm run test:run` (frontend)
    - `pnpm run generate:api` after schema changes

---

## 10. Rollback & Risks

| Risk | Mitigation |
|---|---|
| Tutor mode hallucinates more | Strong `[AI Knowledge]:` labeling + self-check. Monitor error rates. |
| `acceptable_answers` bloats JSON | Only populate when genuinely applicable. Empty array omitted. |
| Persona changes confuse returning users | Default to `tutor` + `default`. Existing users migrated smoothly. |
| Prompt modules introduce indirection | Each module is pure string functions. No external deps. Easy to inline if needed. |

---

## 11. Success Criteria

- [ ] Chat defaults to Tutor mode and feels conversational, not robotic.
- [ ] Chat clearly labels when it uses general knowledge vs. source material.
- [ ] Identification questions accept abbreviations/alternate spellings without marking them wrong.
- [ ] Identification blanks read naturally (no double words).
- [ ] User preferences affect quiz, practice, and chat output quality.
- [ ] Multi-select correct answers display properly in the frontend.
- [ ] All backend tests pass. All frontend tests pass.
