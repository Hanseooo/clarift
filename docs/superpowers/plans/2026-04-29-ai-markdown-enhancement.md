# AI Markdown Output Enhancement Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize and expand markdown formatting instructions across all backend system prompts so the AI consistently uses tables, LaTeX, code blocks, and Mermaid diagrams where appropriate.

**Architecture:** Update prompt strings in chain and service files. No API contracts change. No database changes. Verify that existing `remark/rehype` plugins already support the newly encouraged syntax.

**Tech Stack:** Python (FastAPI, LangChain), Gemini, react-markdown with remark-gfm, remark-math, rehype-katex, rehype-highlight, Mermaid v11.

---

## Chunk 1: Expand Chat System Prompt for STEM

### Task 1: Update `CHAT_SYSTEM_PROMPT` in `config.py`

**Files:**
- Modify: `backend/src/core/config.py`
- Test: `backend/tests/test_config.py` (add or modify)

- [ ] **Step 1: Read current chat prompt**

Run: Read `backend/src/core/config.py` lines 44-77.

- [ ] **Step 2: Write the failing test**

```python
# backend/tests/test_config.py
import pytest
from src.core.config import CHAT_SYSTEM_PROMPT

def test_chat_prompt_allows_latex():
    assert "LaTeX" in CHAT_SYSTEM_PROMPT or "latex" in CHAT_SYSTEM_PROMPT

def test_chat_prompt_allows_code_blocks():
    assert "code blocks" in CHAT_SYSTEM_PROMPT

def test_chat_prompt_allows_tables():
    assert "tables" in CHAT_SYSTEM_PROMPT
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pytest backend/tests/test_config.py -v`
Expected: FAIL — current prompt only mentions headings, bullets, bold, inline code.

- [ ] **Step 4: Update the prompt**

In `backend/src/core/config.py`, append to the output format instruction:

```python
CHAT_SYSTEM_PROMPT = """\
You are Clarift, a study assistant for Filipino students...

Output format:
<answer>
[markdown-formatted answer. Use headings, bullet points, bold text, inline code, \
**LaTeX** (`$...$` or `$$...$$`) for math/chemistry, \
**code blocks** (```lang...```) for programming, \
**tables** (`| col | col |`) for structured comparisons]
</answer>
<used_citations>[...]</used_citations>
"""
```

Keep all existing rules (source fidelity, citations, fallback message).

- [ ] **Step 5: Run test to verify it passes**

Run: `pytest backend/tests/test_config.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/core/config.py backend/tests/test_config.py
git commit -m "feat(prompts): allow latex, code blocks, and tables in chat"
```

---

## Chunk 2: Expand Practice Drill Prompt

### Task 2: Update practice chain drill generation prompt

**Files:**
- Modify: `backend/src/chains/practice_chain.py`
- Test: `backend/tests/test_practice_chain.py` (add or modify)

- [ ] **Step 1: Read current drill prompt**

Run: Read `backend/src/chains/practice_chain.py` lines 95-136.

- [ ] **Step 2: Write the failing test**

```python
# backend/tests/test_practice_chain.py
import pytest
from src.chains.practice_chain import DRILL_GENERATION_PROMPT

def test_drill_prompt_allows_markdown():
    assert "LaTeX" in DRILL_GENERATION_PROMPT
    assert "code blocks" in DRILL_GENERATION_PROMPT
    assert "tables" in DRILL_GENERATION_PROMPT
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pytest backend/tests/test_practice_chain.py::test_drill_prompt_allows_markdown -v`
Expected: FAIL

- [ ] **Step 4: Update the prompt**

In `backend/src/chains/practice_chain.py`, insert into the drill generation prompt (near the output format rules):

```python
DRILL_GENERATION_PROMPT = """\
... existing instructions ...

Formatting rules for question text:
- LaTeX (`$...$` or `$$...$$`) is allowed for mathematical expressions, chemical formulas, and equations.
- Code blocks (```lang...```) are allowed for programming snippets.
- Tables (`| col | col |`) are allowed for structured data.
- Bold/italic and lists are allowed for emphasis and multi-part information.
"""
```

Keep the JSON-only output constraint unchanged.

- [ ] **Step 5: Run test to verify it passes**

Run: `pytest backend/tests/test_practice_chain.py::test_drill_prompt_allows_markdown -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/chains/practice_chain.py backend/tests/test_practice_chain.py
git commit -m "feat(prompts): allow markdown formatting in practice drills"
```

---

## Chunk 3: Expand Mini-Lesson Prompt

### Task 3: Update mini-lesson prompt in `practice_service.py`

**Files:**
- Modify: `backend/src/services/practice_service.py`
- Test: `backend/tests/test_practice_service.py` (add or modify)

- [ ] **Step 1: Read current mini-lesson prompt**

Run: Read `backend/src/services/practice_service.py` lines 121-148.

- [ ] **Step 2: Write the failing test**

```python
# backend/tests/test_practice_service.py
from src.services.practice_service import MINI_LESSON_PROMPT

def test_mini_lesson_allows_latex():
    assert "LaTeX" in MINI_LESSON_PROMPT
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pytest backend/tests/test_practice_service.py::test_mini_lesson_allows_latex -v`
Expected: FAIL

- [ ] **Step 4: Update the prompt**

In `backend/src/services/practice_service.py`, append to formatting rules:

```python
MINI_LESSON_PROMPT = """\
... existing instructions ...

Formatting rules:
- Standard Markdown (bold, italics, bullet lists).
- LaTeX (`$...$` or `$$...$$`) for math or chemical formulas.
- Do NOT use Heading 2 (`##`) — UI handles title separately.
- No JSON, no markdown code fences, no meta-commentary.
"""
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pytest backend/tests/test_practice_service.py::test_mini_lesson_allows_latex -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/practice_service.py backend/tests/test_practice_service.py
git commit -m "feat(prompts): allow latex in mini-lesson generation"
```

---

## Chunk 4: Re-introduce Mermaid Diagrams in Summary Chain

### Task 4: Update summary chain to explicitly permit Mermaid diagrams

**Files:**
- Modify: `backend/src/chains/summary_chain.py`
- Test: `backend/tests/test_summary_chain.py` (add or modify)

- [ ] **Step 1: Read current summary prompt**

Run: Read `backend/src/chains/summary_chain.py` lines 112-167.

- [ ] **Step 2: Write the failing test**

```python
# backend/tests/test_summary_chain.py
from src.chains.summary_chain import SUMMARY_PROMPT

def test_summary_prompt_mentions_mermaid():
    assert "mermaid" in SUMMARY_PROMPT.lower()
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pytest backend/tests/test_summary_chain.py::test_summary_prompt_mentions_mermaid -v`
Expected: FAIL

- [ ] **Step 4: Update the prompt**

In `backend/src/chains/summary_chain.py`, add a new formatting rule after the table rule:

```python
SUMMARY_PROMPT = """\
... existing instructions ...

- Markdown tables ONLY for explicit comparisons.
- LaTeX for math: inline `$E=mc^2$`, display `$$...$$`.
- **Mermaid diagrams**: if the content describes a process, flow, hierarchy, or relationship, \
  include a Mermaid diagram inside a fenced code block labeled `mermaid`. \
  Example:
  ```mermaid
  flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
  ```
- End with a 2-3 sentence summary paragraph.
"""
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pytest backend/tests/test_summary_chain.py::test_summary_prompt_mentions_mermaid -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/chains/summary_chain.py backend/tests/test_summary_chain.py
git commit -m "feat(prompts): reintroduce mermaid diagrams in summary generation"
```

---

## Chunk 5: Map Output Format Preferences to Prompt Instructions

### Task 5: Enhance `summary_service.py` to inject format-specific rendering hints

**Files:**
- Modify: `backend/src/services/summary_service.py`
- Test: `backend/tests/test_summary_service.py` (add or modify)

- [ ] **Step 1: Read current preference validation and injection**

Run: Read `backend/src/services/summary_service.py` lines 64-71 and 169-196.

- [ ] **Step 2: Write the failing test**

```python
# backend/tests/test_summary_service.py
from src.services.summary_service import _build_format_hints

def test_q_and_a_hint():
    hints = _build_format_hints(["q_and_a"])
    assert "Q:" in hints or "question" in hints.lower()

def test_examples_hint():
    hints = _build_format_hints(["examples"])
    assert "Examples" in hints
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pytest backend/tests/test_summary_service.py -v`
Expected: FAIL — function doesn't exist yet.

- [ ] **Step 4: Implement `_build_format_hints`**

In `backend/src/services/summary_service.py`, add:

```python
OUTPUT_FORMAT_HINTS = {
    "bullet_points": "Use bullet points for key concepts.",
    "numbered_list": "Use a numbered list for sequential steps.",
    "paragraph": "Use concise paragraphs with clear topic sentences.",
    "tables": "Use markdown tables for comparisons or structured data.",
    "step_by_step": "Break complex processes into numbered steps.",
    "q_and_a": 'Use a Q&A format: prefix questions with "> **Q:**" and answers with "> **A:**" or numbered pairs.',
    "examples": "Include a dedicated '## Examples' section with concrete cases from the source material.",
    "analogies": "Include helpful analogies where they clarify difficult concepts.",
    "mnemonics": "Include memory aids or mnemonics where appropriate.",
}

def _build_format_hints(formats: list[str]) -> str:
    hints = [OUTPUT_FORMAT_HINTS[f] for f in formats if f in OUTPUT_FORMAT_HINTS]
    return "\n".join(hints)
```

Then inject the hints into the summary prompt (in the service method that calls the chain):

```python
format_hints = _build_format_hints(preferences.output_formats)
# Append format_hints to the user prompt or system prompt
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pytest backend/tests/test_summary_service.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/summary_service.py backend/tests/test_summary_service.py
git commit -m "feat(prompts): inject output-format rendering hints into summary generation"
```

---

## Chunk 6: Verification

### Task 6: Run backend verification

- [ ] **Step 1: Run ruff**

Run: `ruff check .`
Expected: No errors.

- [ ] **Step 2: Run pytest**

Run: `pytest`
Expected: All tests pass.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix lint and test issues for prompt enhancements"
```

---

## Files to Create or Modify Summary

| File | Action | Reason |
|------|--------|--------|
| `backend/src/core/config.py` | Modify | Expand chat system prompt |
| `backend/src/chains/practice_chain.py` | Modify | Allow markdown in drills |
| `backend/src/services/practice_service.py` | Modify | Allow LaTeX in mini-lessons |
| `backend/src/chains/summary_chain.py` | Modify | Reintroduce Mermaid diagrams |
| `backend/src/services/summary_service.py` | Modify | Inject format-specific hints |
| `backend/tests/test_config.py` | Modify/Create | Test chat prompt contents |
| `backend/tests/test_practice_chain.py` | Modify/Create | Test drill prompt contents |
| `backend/tests/test_practice_service.py` | Modify/Create | Test mini-lesson prompt |
| `backend/tests/test_summary_chain.py` | Modify/Create | Test summary prompt contents |
| `backend/tests/test_summary_service.py` | Modify/Create | Test format hints function |
