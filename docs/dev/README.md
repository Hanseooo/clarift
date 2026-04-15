# Clarift Documentation

> Spec-driven development documentation for AI agents and engineers.  
> **Start here if you're an AI agent:** Read [`agents.md`](./agents.md) first.

---

## Document Index

### Core Documents

| Document | Purpose |
|---|---|
| [`agents.md`](./agents.md) | **AI agent entry point.** Rules, task patterns, what "done" means. |
| [`project-context.md`](./project-context.md) | What Clarift is, who it's for, the core learning loop. |
| [`architecture.md`](./architecture.md) | System design, auth flow, async job flow, directory structure. |
| [`decisions.md`](./decisions.md) | Why each technology and pattern was chosen. |
| [`master-spec.md`](./master-spec.md) | Full stack, database schema, API contract, quota limits. |
| [`prd.md`](./prd.md) | Product requirements, MVP scope, success metrics. |
| [`implementation-plan.md`](./implementation-plan.md) | 3-week sprint plan, daily tasks, post-MVP upgrade path. |
| [`modularity-guidelines.md`](./modularity-guidelines.md) | Code structure rules, layer responsibilities, naming conventions. |

### Feature Specifications

| Document | Feature |
|---|---|
| [`features/auth.md`](./features/auth.md) | Google OAuth, JWT, user sync |
| [`features/onboarding.md`](./features/onboarding.md) | Format preference capture, middleware redirect |
| [`features/document-upload.md`](./features/document-upload.md) | File upload, async processing, chunking, embeddings |
| [`features/summary.md`](./features/summary.md) | 5-step summary chain |
| [`features/quiz.md`](./features/quiz.md) | Quiz generation + attempt scoring |
| [`features/practice.md`](./features/practice.md) | Weak area detection + targeted practice |
| [`features/chat.md`](./features/chat.md) | Grounded RAG chat |
| [`features/quota.md`](./features/quota.md) | Quota enforcement, rolling window, daily reset |
| [`features/payments.md`](./features/payments.md) | PayMongo subscription, webhooks |

### Reference Documents

| Document | Purpose |
|---|---|
| [`stack-setup.md`](./stack-setup.md) | Day 1 setup commands, project init, infra provisioning |
| [`testing-strategy.md`](./testing-strategy.md) | How to test chains, workers, SSE, and components |
| [`observability.md`](./observability.md) | Sentry, token logging, latency tracking, cost monitoring |
| [`drizzle-schema.md`](./drizzle-schema.md) | Full Drizzle schema file + common query patterns |
| [`design.md`](./design.md) | Complete design system — colors, typography, components, dark mode rules. |

---

## Quick Reference

### The Core Learning Loop
```
Ingest → Structure → Evaluate → Diagnose → Remediate
Upload → Summary  → Quiz     → Weak Areas → Practice
```

### Who Owns What
```
Next.js + Drizzle → CRUD, auth session, quota display
FastAPI           → AI chains, file processing, quota enforcement, job queue
```

### The One Rule That Matters Most
```
Routes → Services → Chains
Never skip a layer. Never add logic to a route. Never let a chain touch the DB.
```

---

## Cross-Reference Map

When working on... | Also read...
---|---
Any backend feature | `modularity-guidelines.md` → Backend Modules section
Any frontend feature | `modularity-guidelines.md` → Frontend Modules section
Database changes | `master-spec.md` → Database Schema + `decisions.md` → Alembic Owns Migrations
Auth | `features/auth.md` + `architecture.md` → Auth Flow
Quota | `features/quota.md` + `decisions.md` → Quota Enforcement in FastAPI Only
AI chains | `master-spec.md` → AI Models + `modularity-guidelines.md` → Chain Interface Pattern
Payments | `features/payments.md` (contains full webhook impl)
Deployment | `architecture.md` → Infrastructure
