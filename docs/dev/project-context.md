# Project Context

## What is Clarift?

Clarift is an AI-powered study engine built for Filipino students and review center learners. It transforms passive studying into a structured, active learning loop by working exclusively with a user's own uploaded material — not generic knowledge.

**Tagline:** The Study Engine Built Around Your Own Material  
**Mission:** Turn studying hard into learning effectively

---

## The Problem Being Solved

Filipino students preparing for board exams (nursing, CPA, engineering, etc.) and university subjects face three concrete problems:

1. **Passive learning** — rereading notes without retention or structured recall
2. **Generic AI limitations** — tools like ChatGPT answer from general knowledge, not from the student's actual study material, creating false confidence
3. **Unknown gaps** — students don't know what they don't know, so they can't study efficiently

---

## The Core Learning Loop

This is the product. Every feature exists to serve this loop.

```
Ingest → Structure → Evaluate → Diagnose → Remediate
```

| Step | What Happens |
|---|---|
| Ingest | User uploads PDF, image, or text |
| Structure | Multi-step AI chain generates structured summary |
| Evaluate | Quiz generated strictly from uploaded material |
| Diagnose | Weak areas identified from quiz performance |
| Remediate | Targeted practice generated for weak topics |

---

## Target Users (MVP)

- **Primary:** Filipino students preparing for board exams (nursing, CPA, engineering, medicine)
- **Secondary:** University students with heavy reading loads
- **Future:** Review centers, universities, corporate learners

---

## Business Model

| Tier | Price | Limits |
|---|---|---|
| Free | ₱0 | 3 summaries/day, 3 quizzes/day, limited uploads, chat resets every 5 hours |
| Pro | ₱149/month | 10 summaries/day, 15 quizzes/day, 10 practice sessions/day |

Payments via PayMongo (supports GCash + credit cards).

---

## What Clarift is NOT

- Not a chatbot
- Not a note-taking tool
- Not a wrapper over Gemini
- Not a generic Q&A tool

It is a **structured learning system** that guides users through understanding, testing, and improving — using only their own material.

---

## Key Differentiators

| Feature | Generic AI | NotebookLM | Clarift |
|---|---|---|---|
| Source Material | General knowledge | Uploaded files | Uploaded files + structured workflows |
| Output Style | Chat responses | Summaries | Structured learning flow |
| Personalization | Minimal | Limited | Format preference + weak-area targeting |
| Learning Method | None | Passive reading | Active recall + gap detection |
| Goal | Answer questions | Organize notes | Improve understanding and mastery |

---

## Team

- **Hans Rainier Amoguis** — Lead engineer, critical path owner (backend AI, architecture, integration)
- **Angela Jelly Gardan** — Co-founder
- **Ivanne Tripoli** — Co-founder
- UI implementation and non-critical tasks are shared

---

## Related Documents

- Architecture: [`architecture.md`](./architecture.md)
- Tech stack decisions: [`decisions.md`](./decisions.md)
- Feature specifications: [`features/`](./features/)
- Implementation plan: [`implementation-plan.md`](./implementation-plan.md)
- Agent instructions: [`agents.md`](./agents.md)
