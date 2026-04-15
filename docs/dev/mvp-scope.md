# MVP Scope

> **Read this before writing any code.**  
> This is the gate document. If a feature is not listed under "In MVP", do not build it.  
> See [`roadmap.md`](./roadmap.md) for the full phasing plan (MVP → Features → Improvements).

---

## What MVP Is

MVP is the complete, polished, production-deployable version of Clarift's core learning loop — with payments, settings, and diagrams included. It is **not** a prototype. It needs to be good enough to show investors and convert real users to Pro.

**The definition of done for MVP:** A Filipino student can sign up, upload their board exam reviewer, get a structured summary with diagrams, take a quiz, see their weak areas, do targeted practice, and pay for Pro — all in one session, with no rough edges.

---

## MVP Feature Boundary

### ✅ In MVP

| Feature | Spec |
|---|---|
| Google OAuth | [`features/auth.md`](./features/auth.md) |
| Onboarding (global settings capture) | [`features/onboarding.md`](./features/onboarding.md) |
| Document upload + async processing | [`features/document-upload.md`](./features/document-upload.md) |
| Structured summary (5-step chain) | [`features/summary.md`](./features/summary.md) |
| MermaidJS diagrams (when applicable) | [`features/mermaid.md`](./features/mermaid.md) |
| Quiz generation + attempts | [`features/quiz.md`](./features/quiz.md) |
| Quiz settings (auto/manual, type flagging) | [`features/quiz-settings.md`](./features/quiz-settings.md) |
| Weak area detection | [`features/practice.md`](./features/practice.md) |
| Targeted practice | [`features/practice.md`](./features/practice.md) |
| Grounded chat | [`features/chat.md`](./features/chat.md) |
| Global settings (format + style + custom instructions) | [`features/settings.md`](./features/settings.md) |
| Per-generation settings override | [`features/settings.md`](./features/settings.md) |
| Quota system (count-based, daily reset) | [`features/quota.md`](./features/quota.md) |
| Pro subscription via PayMongo | [`features/payments.md`](./features/payments.md) |
| Env-based Pro override for testing | [`features/settings.md`](./features/settings.md#env-based-pro-override) |

### ❌ Not in MVP — Phase 2 (Retention)

- Spaced repetition
- Flashcards
- Study streaks
- Progress tracking history
- Weak-topic review history

### ❌ Not in MVP — Phase 3 (Improvements)

- Redis caching (embeddings, summaries, quiz outputs)
- Token-based credits (replace count system)
- Magic link auth
- Web search fallback (Brave API)

### ❌ Not in MVP — Phase 4+

- Multi-document synthesis
- Domain-specific learning modes
- School dashboards
- Advanced LangChain workflows

---

## MVP Quota Limits

| Feature | Free | Pro |
|---|---|---|
| Summaries | 3/day | 10/day |
| Quizzes | 3/day | 15/day |
| Targeted practice | 1/day | 10/day |
| Chat | Resets every 5 hours | Resets every 5 hours |
| Uploads | 5 documents max | Unlimited |

**Reset:** Daily at midnight Philippine time (UTC+8 = 16:00 UTC).  
**Chat:** Rolling window via Redis TTL, not daily reset.

---

## MVP Settings

All settings live in `user_preferences`. Every generation reads from this table unless a per-generation override is provided.

| Setting | Options | Default |
|---|---|---|
| `output_format` | `bullet`, `step-by-step`, `example-first` | `bullet` |
| `explanation_style` | `mental-models`, `simple`, `detailed`, `eli5` | `simple` |
| `custom_instructions` | Free text, max 500 characters | `""` (empty) |

Per-generation overrides use the same three fields. If provided, they replace global settings for that generation only. If not provided, global settings are used.

---

## MVP Stack (No Changes Allowed Without Updating This Doc)

Full stack: [`master-spec.md`](./master-spec.md)  
Setup commands: [`stack-setup.md`](./stack-setup.md)

**Key constraint:** No Redis caching of AI outputs in MVP. Caching slots exist in the service layer (comments mark where to add it) but are not wired. Every generation hits Gemini.

---

## Env-Based Pro Override

For testing without a real PayMongo transaction:

```bash
# backend .env
FORCE_PRO_USER_IDS=user-id-1,user-id-2   # comma-separated, optional
TESTING_MODE=true                           # if true, all users get Pro limits
```

When `TESTING_MODE=true`, `quota_service.py` skips the tier check and uses Pro limits for all users. This is removed/disabled before production launch. See [`features/settings.md`](./features/settings.md#env-based-pro-override).

---

## What "Modular" Means for MVP

MVP is built so that Phase 2 and Phase 3 features are **additions, not refactors**:

| Future Feature | How It Plugs In |
|---|---|
| Redis caching | Wrap service method calls — routes and chains unchanged |
| Spaced repetition | New tables + new service — no changes to existing quiz/practice services |
| Token-based credits | Extend `quota_service.py` — same interface, different counting logic |
| Magic link auth | Add NextAuth provider — no FastAPI changes |
| Multi-document synthesis | New chain file + new route — existing chains unchanged |

The modularity rules that make this possible are in [`modularity-guidelines.md`](./modularity-guidelines.md).
