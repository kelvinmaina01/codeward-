<div align="center">

```
 ██████╗ ██████╗ ██████╗ ███████╗██╗    ██╗ █████╗ ██████╗ ██████╗
██╔════╝██╔═══██╗██╔══██╗██╔════╝██║    ██║██╔══██╗██╔══██╗██╔══██╗
██║     ██║   ██║██║  ██║█████╗  ██║ █╗ ██║███████║██████╔╝██║  ██║
██║     ██║   ██║██║  ██║██╔══╝  ██║███╗██║██╔══██║██╔══██╗██║  ██║
╚██████╗╚██████╔╝██████╔╝███████╗╚███╔███╔╝██║  ██║██║  ██║██████╔╝
 ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝
```

**The automated principal engineer sitting on every pull request.**

[![License: All Rights Reserved](https://img.shields.io/badge/License-All%20Rights%20Reserved-red.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22-3fb950.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6.svg)](https://typescriptlang.org)
[![Powered by Claude](https://img.shields.io/badge/Powered%20by-Claude%20Sonnet%204.5-7c6fff.svg)](https://anthropic.com)
[![GitHub App](https://img.shields.io/badge/GitHub-App-24292e.svg)](https://github.com/apps/codeward)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-3fb950.svg)](CONTRIBUTING.md)
[![Status](https://img.shields.io/badge/Status-Beta-e3b341.svg)](#)

<br/>

> *"We stopped merging CVEs into our payment service. Codeward caught a live Stripe key on a junior dev's first PR. That could have been very expensive."*
> — VP Engineering, Fintech startup

<br/>

[**Get Started →**](https://codeward.io) · [**Documentation**](https://docs.codeward.io) · [**Live Demo**](#demo) · [**Discord**](https://discord.gg/codeward) · [**Report a Bug**](https://github.com/codeward-io/codeward/issues)

</div>

---

## Table of Contents

- [What is Codeward?](#what-is-codeward)
- [Why Codeward](#why-codeward)
- [How It Works](#how-it-works)
- [The 8 Agents](#the-8-agents)
  - [Orchestrator Agent](#orchestrator-agent)
  - [Security Agent](#security-agent)
  - [Bloat Agent](#bloat-agent)
  - [Broken Code Agent](#broken-code-agent)
  - [Architecture Agent](#architecture-agent)
  - [AI-Era Agent](#ai-era-agent)
  - [Compliance Agent](#compliance-agent)
  - [Data & DX Agent](#data--dx-agent)
  - [Chat Agent](#chat-agent)
- [The 100+ Debt Checks](#the-100-debt-checks)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [GitHub App Setup](#github-app-setup)
  - [Running Locally](#running-locally)
- [Sandbox Infrastructure](#sandbox-infrastructure)
- [Multi-Agent Communication](#multi-agent-communication)
- [API Reference](#api-reference)
- [Dashboard](#dashboard)
- [Pricing](#pricing)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

---

## What is Codeward?

Codeward is a **multi-agent AI code quality platform** that analyses every commit across 100+ checks, posts annotated findings to your PRs, and blocks merges on critical issues — automatically, in under 6 minutes.

It is not a linter. It is not a static analyser. It is not another GitHub Action wrapper.

Codeward **runs your actual code** inside an ephemeral Firecracker sandbox — loading prod-like data, firing real HTTP requests, executing your test suite, scanning your AST, running OWASP ZAP, checking your CVEs, and testing AI-era vulnerabilities that no other tool was built to catch.

Eight specialised agents run in parallel. A coordinator aggregates their findings, computes a weighted debt score, makes the gate decision, and posts a full annotated report back to your PR — all without touching your production environment.

```
You push a commit
       ↓
Codeward receives webhook (HMAC-verified)
       ↓
Orchestrator Agent reads diff + repo config
       ↓
8 agents spawn in parallel inside isolated sandbox
  ├── Security Agent    → 18 checks (OWASP, CVE, RLS, secrets...)
  ├── Bloat Agent       → 18 checks (AST duplicates, dead code...)
  ├── Broken Code Agent → 18 checks (tests, race conditions, leaks...)
  ├── Architecture Agent→ 18 checks (N+1, indexes, cold start...)
  ├── AI-Era Agent      → 18 checks (prompt injection, RAG drift...)
  ├── Compliance Agent  → 10 checks (GDPR, EU AI Act, WCAG...)
  ├── Data/DX Agent     → 10 checks (pipelines, onboarding, alerts...)
  └── Chat Agent        → Always on, spawns any agent on demand
       ↓
Orchestrator aggregates results + computes debt score
       ↓
GitHub check run posted (pass / block)
PR comment with annotated findings + suggested diffs
```

---

## Why Codeward

| | Manual Review | SonarQube | GitHub Actions | **Codeward** |
|---|---|---|---|---|
| Runs actual code in sandbox | ❌ | ❌ | ✅ partial | ✅ |
| Security: secrets + CVEs + OWASP | ✅ slow | ✅ partial | ✅ partial | ✅ all 18 |
| AI-era checks (prompt injection, RAG drift) | ❌ | ❌ | ❌ | ✅ 18 checks |
| Auto-refactor with AST | ❌ | ❌ | ❌ | ✅ |
| Compliance (GDPR, EU AI Act, WCAG) | ❌ | ❌ | ❌ | ✅ scheduled |
| Flaky test detection (10 reruns) | ❌ | ❌ | ❌ | ✅ |
| Cross-repo duplicate detection | ❌ | ❌ | ❌ | ✅ pgvector |
| Hard merge blocks on critical findings | ✅ | ✅ | ✅ | ✅ |
| Chat agent with full codebase access | ❌ | ❌ | ❌ | ✅ |
| Average analysis time | Hours | ~5 min | ~10 min | **< 6 min** |
| Cost per commit analysis | Engineer time | $20k+/yr | CI minutes | **~$0.08** |

---

## How It Works

### Step 1 — You push a commit

Codeward installs as a GitHub App. No CI changes required. No YAML files to write. When you push, GitHub sends a webhook to Codeward's receiver, which verifies the HMAC signature and creates a priority job in the queue.

### Step 2 — The Orchestrator reads the diff

The Orchestrator Agent (Claude Sonnet 4.5) reads the commit diff, your `codeward.yml` config, and decides which agents to run, in what order, and with what priority. For a small CSS change it may skip the Architecture Agent. For a payments file it runs Security at maximum priority.

### Step 3 — 8 agents run in parallel

A Firecracker microVM spins up in under 125ms. Your stack is detected from `package.json` / `requirements.txt` / `Gemfile`. Dependencies install from a cached layer. A seeded prod-like database is loaded. All 8 agents run simultaneously — wall clock time 4–6 minutes.

### Step 4 — Results aggregated, gate decided

Each agent writes a structured JSON result to Postgres. The Orchestrator reads all results, applies weighted scoring (Security ×2.0, AI-Era ×1.5, Architecture ×1.2, Bloat ×1.0), computes the overall debt score delta, and makes the gate decision.

### Step 5 — Report posted to your PR

A GitHub check run is created (🔴 blocked / 🟢 passed). A PR comment is posted with every finding: file, line number, severity, description, and a suggested diff. The sandbox is destroyed. Your team resolves findings and pushes again.

---

## The 8 Agents

### Orchestrator Agent

> *"The principal engineer who never sleeps."*

**Model:** `claude-sonnet-4-6` (Opus 4.5 on Enterprise tier)

The Orchestrator is the brain of Codeward. It receives the webhook event, reads the commit diff, parses the repo config, and decides which sub-agents to spawn and in what order. After all agents complete, it aggregates their structured results, applies the weighted debt scoring formula, makes the merge gate decision, and posts the final report to GitHub.

The Orchestrator never touches code directly — it only coordinates, decides, and communicates.

**Tools available:**
- `read_repo_config` — reads `codeward.yml` from the repo root
- `spawn_sub_agent` — dispatches a named agent to the job queue
- `aggregate_results` — reads all agent JSON results from Postgres
- `post_github_status` — creates check runs and PR comments via GitHub Apps API
- `trigger_rollback` — fires rollback if post-deploy anomaly detected

---

### Security Agent

> *"18 checks. Zero exceptions. Hard blocks on every critical."*

**Model:** `claude-haiku-4-5` + deterministic tool calls
**Weight:** ×2.0 (highest)
**Run mode:** Every push, in parallel

The Security Agent runs all 18 security checks from the expanded framework. Most checks are deterministic tool calls — OWASP ZAP, truffleHog, Trivy, RLS policy inspection. The LLM interprets tool output and generates fix suggestions. Critical findings always block the merge.

**Checks (18):**

| # | Check | Tool | Severity |
|---|---|---|---|
| 1 | Exposed API keys & secrets | truffleHog v3 (700+ detectors, full git history) | 🔴 Critical |
| 2 | Missing auth on API routes | Endpoint probing, expect 401 | 🔴 Critical |
| 3 | SQL injection vectors | OWASP ZAP + AST query builder scan | 🔴 Critical |
| 4 | Database RLS missing | Supabase/Postgres policy existence per table | 🔴 Critical |
| 5 | XSS & CSRF vulnerabilities | OWASP ZAP payload injection | 🔴 Critical |
| 6 | Known CVEs in dependencies | Trivy against NVD + GitHub Advisory DB | 🟡 High |
| 7 | Missing rate limiting | 100 rapid requests to /login /signup | 🟡 High |
| 8 | Prompt injection | Override payloads on all LLM endpoints | 🟡 High |
| 9 | Insecure Non-Human Identities | Long-lived tokens, unrotated PATs | 🟡 High |
| 10 | Supply chain integrity | SBOM verification, GitHub Actions audit | 🟡 High |
| 11 | Cryptographic failures | AST scan for MD5/SHA-1, hardcoded IVs | 🟡 High |
| 12 | SSRF in microservices | Probe metadata endpoints via URL inputs | 🟡 High |
| 13 | Missing MFA for destructive actions | DELETE/admin routes without step-up auth | 🟠 Medium |
| 14 | CI/CD pipeline log leaks | Runner log scan, poisoned pipeline audit | 🟠 Medium |
| 15 | Multitenant data leaks | Every shared-table query checked for tenant_id | 🟠 Medium |
| 16 | Logging & alerting gaps | 5 rapid failures triggered, checks if alert fires | 🟠 Medium |
| 17 | Error information leakage | Fuzz endpoints, check 500s for stack traces (CWE-209) | 🟠 Medium |
| 18 | Business logic bypass | Direct URL access to success pages skipping payment | 🟠 Medium |

---

### Bloat Agent

> *"The code your team forgot to delete, found and removed."*

**Model:** `claude-haiku-4-5` + tree-sitter AST
**Weight:** ×1.0
**Run mode:** Every push, in parallel

The Bloat Agent parses your codebase using tree-sitter — a language-agnostic AST parser supporting JS, TS, Python, Go, Ruby, Rust. It traces call graphs, identifies semantic duplicates (same behaviour, different names), finds dead code, and generates refactored diffs. After generating a proposed change it re-runs the test suite to verify nothing breaks before posting the diff.

**Checks (18):**

| # | Check | Method |
|---|---|---|
| 1 | Duplicate functions | Semantic AST match — same behaviour, different names |
| 2 | Dead code | Call graph trace — zero-reference functions, vars, imports |
| 3 | God files (1000+ lines) | Multiple responsibilities flagged, split points suggested |
| 4 | Copy-paste blocks (5+ lines) | Blocks appearing 2+ times, auto-extracted to helpers |
| 5 | Redundant dependencies | Installed but unused, 3 packages doing 1 job |
| 6 | Oversized functions (80+ lines) | Cyclomatic complexity > 10, extraction suggested |
| 7 | Vibe rewrite pattern | >60% file changed, zero new tests added |
| 8 | Commented-out code blocks | Large blocks, git blame checked before removal |
| 9 | Feature bloat (low usage) | Telemetry correlation, flags features <1% MAU |
| 10 | Cognitive load bloat | LLM "time to comprehend" analysis on abstractions |
| 11 | CSS & asset bloat | Unused Tailwind classes, oversized images, LCP impact |
| 12 | Over-configurability | Env vars unchanged 6+ months, hardcoding suggested |
| 13 | YAGNI / just-in-case logic | Future-requirement branches never materialised |
| 14 | Microservice over-segmentation | Network overhead vs. logic size, nanoservice merge suggested |
| 15 | Shadow dependencies | Multiple versions of same lib bundled |
| 16 | Verbose logging spam | DEBUG/INFO log volume in prod, storage cost projected |
| 17 | Legacy polyfill debt | IE11 polyfills checked against support matrix |
| 18 | Documentation rot | README/docs vs. actual code signatures, discrepancies flagged |

---

### Broken Code Agent

> *"Runs your tests 10 times. Finds what one run misses."*

**Model:** `claude-haiku-4-5` + test runner
**Weight:** ×1.8
**Run mode:** Every push, Karpathy loop (up to 3× on failure)

The Broken Code Agent runs the full test suite inside the sandbox, then runs an additional 10-iteration flaky test detection pass. If any test fails, the agent attempts to isolate the root cause by inspecting the stack trace, heap profile, and AST — looping up to 3 times before declaring a definitive failure.

**Checks (18):**

| # | Check | Method |
|---|---|---|
| 1 | Failing tests | Full suite, any single failure = hard block |
| 2 | Runtime exceptions | App runs in sandbox, null dereferences caught live |
| 3 | Race conditions | 100 concurrent requests, consistency assertions |
| 4 | Broken migrations | Seeded test DB, integrity verified post-run |
| 5 | Silent data corruption | Write known values, read back through all paths |
| 6 | Swallowed errors | AST scan, empty catch blocks, unhandled rejections |
| 7 | Missing input validation | Malformed/oversized inputs, expects 400 not 500 |
| 8 | Memory leaks | 60s sustained load, heap growth measured |
| 9 | Flaky test debt | Test suite run 10×, non-deterministic failures flagged |
| 10 | Silent promise rejections | AST scan: await without try/catch or .catch() |
| 11 | Stale feature flags | 100% "on" flags for 30+ days, removal suggested |
| 12 | Implicit contract reliance | Functions relying on global state not in signature |
| 13 | Swallowed API timeouts | Outbound HTTP/gRPC without explicit timeout |
| 14 | Memory bloat (non-leak) | Large objects in global scope, no TTL or eviction |
| 15 | Broken rollback paths | Down migration attempted on every PR |
| 16 | Type-safety gaps | `any` count + `ts-ignore` below project threshold |
| 17 | Resource exhaustion | Unclosed file handles, DB connections, sockets |
| 18 | Zombie workers | Background jobs restarting repeatedly, no progress |

---

### Architecture Agent

> *"Instruments your running app. Finds what EXPLAIN ANALYZE reveals."*

**Model:** `claude-haiku-4-5` + k6 + PostgreSQL tools
**Weight:** ×1.2
**Run mode:** Every push, in parallel

The Architecture Agent instruments the running application with query counters, fires `EXPLAIN ANALYZE` on every query, and runs k6 load tests at 1× and 2× expected traffic. It traces the full import graph to detect circular dependencies and measures cold start latency for serverless-targeted code.

**Checks (18):** N+1 queries · Missing DB indexes · Unbounded result sets · Circular dependencies · No caching strategy · Tight coupling · Synchronous blocking calls · Missing retry logic · Distributed monolith pattern · Missing distributed tracing · Synchronous dependency chains · Database as integration point · Data archival debt · Hardcoded environment logic · Lack of write idempotency · Manual deployment steps · Cold start latency · Missing backpressure handling

---

### AI-Era Agent

> *"The checks that didn't exist two years ago."*

**Model:** `claude-sonnet-4-6`
**Weight:** ×1.5 (scaling to ×2.0)
**Run mode:** Every push, in parallel

Most tools were built before AI entered the stack. The AI-Era Agent tests prompt injection, system prompt leakage, RAG pipeline freshness, PII flowing into LLM context, and whether AI-generated code is properly attributed and validated.

**Checks (18):** Prompt injection · Unbounded token spend · Unvalidated AI output · Deprecated model version lock · PII in AI pipelines · No AI rate limiting · Hallucination trust pattern · Training data exposure · System prompt leakage · Non-deterministic UI drift · Vector DB stale indices · AI refactoring logic shift · Lack of AI attribution · Prompt version mismatch · RAG context bloat · Missing human-in-the-loop · Model bias accumulation · Evasive AI testing

---

### Compliance Agent

> *"Compliance drift happens silently between audits. This runs every night."*

**Model:** `claude-sonnet-4-6`
**Run mode:** Daily scheduled + every push
**Tier:** Pro and Enterprise only

**Checks (10):** EU AI Act non-compliance · Cross-border data sovereignty · NHI compliance · RTBF gaps (right to be forgotten from backups/logs/training sets) · Consent versioning debt · Missing WCAG 2.2 accessibility · Shadow AI usage · Inadequate audit trails · Data minimisation violations · Algorithmic impact assessment

---

### Data & DX Agent

> *"The weekly report your team lead actually wants to read."*

**Model:** `claude-haiku-4-5`
**Run mode:** Weekly scheduled
**Produces:** Team health report

**Data checks (10):** Pipeline entanglement · Missing data contracts · Vector DB embedding drift · Dark data accumulation · Lack of data lineage · Silent data quality degradation · Missing event schema registry · Analytics debt · Data access control gaps · Retention policy violations

**DX checks (10):** Flaky CI/CD pipelines · Local env parity gap · Onboarding lead time · Documentation rot · Tooling fragmentation · High build/test latency · Missing self-service infra · Alert fatigue · Absence of golden paths · Searchability debt

---

### Chat Agent

> *"Ask it what your biggest risk is right now. It actually checks."*

**Model:** `claude-sonnet-4-6`
**Run mode:** Always on
**Access:** Full codebase + all agent run history + staging environments

The Chat Agent is the Codeward sidebar interface. It is not a chatbot with knowledge about your codebase — it has **tool access** to your codebase. When you ask "what is the biggest security risk in our payments repo right now?" it runs the Security Agent and reads the results. When you ask "why did the Architecture Agent flag this PR?" it reads the actual run data.

**Tools available:** `query_run_history` · `spawn_any_agent` · `read_any_repo` · `trigger_refactor` · `explain_debt_item` · `compare_repos` · `read_staging_logs`

---

## The 100+ Debt Checks

| Category | Checks | Agent | Weight | Gate |
|---|---|---|---|---|
| 🔴 Security | 18 | Security Agent | ×2.0 | Hard block |
| 🟡 Bloat | 18 | Bloat Agent | ×1.0 | Accumulates |
| 🔴 Broken Code | 18 | Broken Code Agent | ×1.8 | Hard block |
| 🔵 Architecture | 18 | Architecture Agent | ×1.2 | Health trend |
| 🟢 AI-Era | 18 | AI-Era Agent | ×1.5→2.0 | Hard block (critical) |
| ⚖️ Compliance | 10 | Compliance Agent | Legal risk | Scheduled daily |
| 🛠️ DX | 10 | Data/DX Agent | Medium | Weekly report |
| 📊 Data | 10 | Data/DX Agent | Medium | Weekly report |
| **Total** | **120** | | | |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1 — Client Surfaces                                       │
│  React SPA Dashboard · GitHub PR Comments · VS Code Extension   │
│  Slack Alerts · Email Digest · Discord Notifications            │
└─────────────────────┬───────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 2 — API Gateway & Auth                                    │
│  Hono.js on Cloudflare Workers · Better Auth (GitHub OAuth)     │
│  Webhook Receiver (HMAC-SHA256) · WebSocket Server (Socket.io)  │
└─────────────────────┬───────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 3 — Multi-Agent Orchestration Engine                     │
│                                                                  │
│  ⚡ Orchestrator Agent (Sonnet 4.5)                              │
│     ├── 🔴 Security Agent (Haiku 4.5 + OWASP ZAP + truffleHog) │
│     ├── 🟡 Bloat Agent (Haiku 4.5 + tree-sitter AST)           │
│     ├── 🔴 Broken Code Agent (Haiku 4.5 + Jest/pytest)         │
│     ├── 🔵 Architecture Agent (Haiku 4.5 + k6 + pg)            │
│     ├── 🟢 AI-Era Agent (Sonnet 4.5)                            │
│     ├── ⚖️  Compliance Agent (Sonnet 4.5 — scheduled)           │
│     ├── 📊 Data/DX Agent (Haiku 4.5 — weekly)                  │
│     └── 💬 Chat Agent (Sonnet 4.5 — always on)                 │
│                                                                  │
│  Message Bus: BullMQ on Redis                                    │
│  Result Store: PostgreSQL (structured JSON per agent)           │
└─────────────────────┬───────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4 — Ephemeral Sandbox Cluster                            │
│  Firecracker microVM · 125ms boot · hermetically sealed         │
│  Docker stack provisioner · Seed DB · Test runner               │
│  OWASP ZAP · k6 load tester · tree-sitter · truffleHog         │
│  One sandbox per commit · destroyed after run                   │
└─────────────────────┬───────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 5 — Data & Storage                                        │
│  PostgreSQL (Supabase) · Redis (Upstash/BullMQ)                 │
│  Object Storage (Cloudflare R2) · Vector DB (pgvector)          │
│  Time Series (TimescaleDB)                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend
| Layer | Technology | Why |
|---|---|---|
| Framework | React 18 + TypeScript + Vite | Concurrent rendering for real-time feed, 10× faster builds |
| Routing | TanStack Router | Type-safe routes |
| Styling | Tailwind CSS v4 + shadcn/ui | Production-quality components, you own them |
| State | Zustand + TanStack Query | UI state + server state separation |
| Real-time | Socket.io client | Live run feed via WebSocket |
| Code display | Monaco Editor + react-diff-view | VS Code quality inline diffs |
| Charts | Recharts | Health score trends, debt category bars |
| Testing | Vitest + RTL + Playwright | Unit + component + E2E |
| Deploy | Vercel | Zero-config, preview per PR |

### Backend
| Layer | Technology | Why |
|---|---|---|
| Runtime | Node.js 22 + TypeScript | Native TS support, same language as frontend |
| API Framework | Hono.js | 3× faster than Express, runs on Workers/Node/Deno |
| Job Queue | BullMQ on Redis | Battle-tested background jobs, priority queues, retries |
| ORM | Drizzle ORM + Supabase | Type-safe, raw SQL visibility, no magic |
| Agent Framework | Anthropic SDK (raw tool_use) | No LangChain. Use the primitive directly. |
| File Storage | Cloudflare R2 | S3-compatible, zero egress fees |
| Email | Resend + React Email | Best DX for transactional email |
| Deploy | Railway.app | 30s Node deploys, built-in Postgres and Redis |

### Sandbox Infrastructure
| Layer | Technology |
|---|---|
| VM Runtime | Fly.io Machines API (sub-second boot) |
| Containerisation | Docker multi-stage builds |
| AST Parsing | tree-sitter (JS/TS/Python/Go/Ruby/Rust/Java) |
| Security Scanning | OWASP ZAP + truffleHog v3 + Trivy |
| Load Testing | Grafana k6 |

---

## Getting Started

### Prerequisites

```bash
node >= 22.0.0
docker >= 24.0.0
git >= 2.40.0
```

You will need accounts at: Anthropic · GitHub (for App registration) · Supabase · Upstash · Cloudflare · Fly.io · Resend

### Installation

```bash
# Clone the repository
git clone https://github.com/codeward-io/codeward.git
cd codeward

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### Environment Variables

Create a `.env.local` file at the root. Every variable is required unless marked optional.

```bash
# ─── ANTHROPIC ────────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...          # Powers all 8 agents

# ─── GITHUB APP ───────────────────────────────────────────────────
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
GITHUB_WEBHOOK_SECRET=your-webhook-secret
GITHUB_CLIENT_ID=Iv1.abc123
GITHUB_CLIENT_SECRET=abc123

# ─── GITLAB (optional) ────────────────────────────────────────────
GITLAB_APP_ID=abc123
GITLAB_APP_SECRET=abc123

# ─── DATABASE ─────────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # Backend only, never expose to client

# ─── REDIS ────────────────────────────────────────────────────────
UPSTASH_REDIS_URL=https://...upstash.io
UPSTASH_REDIS_TOKEN=AX...

# ─── OBJECT STORAGE ───────────────────────────────────────────────
R2_ACCOUNT_ID=abc123
R2_ACCESS_KEY_ID=abc123
R2_SECRET_ACCESS_KEY=abc123
R2_BUCKET_NAME=codeward-runs

# ─── SANDBOX ──────────────────────────────────────────────────────
FLY_API_TOKEN=fo1_...
FLY_APP_NAME=codeward-sandbox

# ─── NOTIFICATIONS ────────────────────────────────────────────────
RESEND_API_KEY=re_...
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=abc123

# ─── AUTH ─────────────────────────────────────────────────────────
BETTER_AUTH_SECRET=                   # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

# ─── OBSERVABILITY ────────────────────────────────────────────────
SENTRY_DSN=https://...@sentry.io/...
AXIOM_API_KEY=xaat-...
AXIOM_DATASET=codeward-logs

# ─── BILLING (production only) ────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...         # Not needed for development
STRIPE_WEBHOOK_SECRET=whsec_...
```

### GitHub App Setup

1. Go to **github.com → Settings → Developer settings → GitHub Apps → New GitHub App**
2. Set the webhook URL to `https://your-domain.com/api/webhooks/github`
3. Set the webhook secret to match `GITHUB_WEBHOOK_SECRET`
4. Required permissions:
   ```
   Repository permissions:
     Contents: Read
     Pull requests: Read & Write
     Checks: Read & Write
     Statuses: Read & Write
   
   Subscribe to events:
     Push
     Pull request
     Check run
     Check suite
   ```
5. Generate and download the private key → set as `GITHUB_APP_PRIVATE_KEY`

### Running Locally

```bash
# Run database migrations
npm run db:migrate

# Seed development database
npm run db:seed

# Start all services (API + frontend + worker)
npm run dev

# Or start services individually
npm run dev:api      # Hono.js API on :3001
npm run dev:worker   # BullMQ job processor
npm run dev:web      # Vite React on :3000
```

To test the full webhook flow locally, use [smee.io](https://smee.io) or ngrok to forward GitHub webhooks to your local server:

```bash
npm install -g smee-client
smee -u https://smee.io/your-channel-id -t http://localhost:3001/api/webhooks/github
```

---

## Sandbox Infrastructure

Each commit analysis runs inside an ephemeral Firecracker microVM that is created on job start and destroyed on job end. No state persists between runs. No sandbox has external network access.

```bash
# Sandbox lifecycle per commit
1. Fly.io Machine created via Machines API (< 125ms boot)
2. Stack detected from lockfiles (package.json / requirements.txt / Gemfile)
3. Pre-built Docker base image pulled from cached registry
4. Repository cloned at commit SHA
5. Seed database loaded with anonymised prod-like data
6. All 8 agent tools execute (OWASP ZAP, k6, tree-sitter, test runner...)
7. Results written to Postgres
8. Artifacts (logs, diffs, reports) uploaded to R2
9. Machine destroyed via API
10. Orchestrator reads results, posts to GitHub
```

**Supported stacks (auto-detected):**

| Language | Package File | Test Runner |
|---|---|---|
| Node.js / TypeScript | `package.json` | Jest / Vitest |
| Python | `requirements.txt` / `pyproject.toml` | pytest |
| Ruby | `Gemfile` | RSpec |
| Go | `go.mod` | `go test` |
| Rust | `Cargo.toml` | `cargo test` |

---

## Multi-Agent Communication

Agents do not call each other directly. They communicate through a shared job queue (BullMQ on Redis) and a structured result store (Postgres). This means agents are independently deployable, individually scalable, and the failure of one agent does not block others.

```typescript
// Orchestrator dispatches a sub-agent job
await jobQueue.add('security-agent', {
  commitSHA: '4f2a8c1',
  repoId: 'payments-service',
  priority: 10,           // Security always high priority
  agentConfig: { ... }
});

// Security Agent picks up its own job and writes results
await db.insert(agentResults).values({
  runId,
  agent: 'security',
  result: {
    findings: [...],
    severity: 'critical',
    blocksGate: true,
    score: 22
  }
});

// Orchestrator aggregates after all agents complete
const results = await db
  .select()
  .from(agentResults)
  .where(eq(agentResults.runId, runId));

const gateDecision = computeWeightedScore(results);
```

---

## API Reference

All endpoints require a Bearer token from GitHub OAuth flow.

```
Base URL: https://api.codeward.io/v1
```

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/repos` | List all connected repositories |
| `POST` | `/repos/:id/runs` | Trigger a manual analysis run |
| `GET` | `/runs/:id` | Get run status and results |
| `GET` | `/runs/:id/report` | Get full annotated debt report |
| `GET` | `/repos/:id/health` | Get health score history (time series) |
| `POST` | `/webhooks/github` | GitHub webhook receiver (HMAC-verified) |
| `POST` | `/chat` | Send message to Chat Agent |
| `GET` | `/agents` | List available agents and their status |
| `POST` | `/runs/:id/override` | Admin override for a blocked merge |

**Example — trigger a run:**
```bash
curl -X POST https://api.codeward.io/v1/repos/payments-service/runs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"commitSHA": "4f2a8c1", "agents": ["security", "bloat"]}'
```

**Example — get a report:**
```bash
curl https://api.codeward.io/v1/runs/run_01HX7K2M/report \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Dashboard

The Codeward React dashboard is available at `https://codeward.io/dashboard` once you connect a repository.

**Screens:**

| Screen | URL | Description |
|---|---|---|
| Overview | `/dashboard` | All repos, health scores, recent activity |
| Repository | `/dashboard/repos/:id` | Per-repo debt breakdown, run history |
| Live Feed | `/dashboard/feed` | Real-time WebSocket stream of running agents |
| Run Report | `/dashboard/runs/:id` | Full annotated findings for a single run |
| Diff Viewer | `/dashboard/runs/:id/diff` | Monaco-powered annotated diff viewer |
| Chat | `/dashboard/chat` | Chat Agent interface |
| Settings | `/dashboard/settings` | Repo config, team members, notifications |

---

## Pricing

| | Free | Pro | Enterprise |
|---|---|---|---|
| Monthly price | $0 | $49 | Custom |
| Runs per month | 50 | 500 | Unlimited |
| Repositories | 1 | 10 | Unlimited |
| Agents available | Security + Bloat | All 8 | All 8 |
| Slack + email alerts | ❌ | ✅ | ✅ |
| Staging approval gates | ❌ | ✅ | ✅ |
| Chat Agent | ❌ | ✅ | ✅ |
| Compliance Agent | ❌ | ✅ | ✅ |
| Self-hosted runner | ❌ | ❌ | ✅ |
| SSO + RBAC | ❌ | ❌ | ✅ |
| SLA | ❌ | ❌ | ✅ |
| Compliance reports | ❌ | ❌ | ✅ |
| KES pricing | ❌ | ❌ | ✅ |

> **Honest cost note:** Average Claude API cost per run is ~$0.08. Free tier is strictly rate-limited to 50 runs/month. If you need more, please upgrade — this keeps the free tier sustainable.

---

## Roadmap

### ✅ Released (Beta)
- [x] GitHub App integration + HMAC webhook receiver
- [x] Security Agent (18 checks) — truffleHog, OWASP ZAP, Trivy
- [x] Bloat Agent (18 checks) — tree-sitter AST, call graph
- [x] Broken Code Agent (18 checks) — test runner, flaky detector
- [x] Fly.io sandbox infrastructure + stack auto-detection
- [x] React dashboard — health scores, live feed, diff viewer
- [x] GitHub PR comments + check run posting
- [x] BullMQ job queue + Postgres result store

### 🚧 In Progress (Q3 2026)
- [ ] Architecture Agent (k6 + EXPLAIN ANALYZE)
- [ ] AI-Era Agent (prompt injection, RAG drift, PII scan)
- [ ] Codeward Chat Agent (Sonnet 4.5 + full tool access)
- [ ] Slack integration (Block Kit approval buttons)
- [ ] Staging approval gates + GitHub merge trigger
- [ ] Stripe billing integration

### 📋 Planned (Q4 2026)
- [ ] Compliance Agent (EU AI Act, GDPR, WCAG 2.2)
- [ ] Data & DX Agent (weekly health report)
- [ ] Self-hosted runner (Enterprise — Docker + mTLS tunnel)
- [ ] GitLab integration
- [ ] VS Code extension (inline debt warnings)
- [ ] Multi-language AST: Python, Go, Java
- [ ] Health certificate + shareable safety badge
- [ ] Cross-repo duplicate detection (pgvector)

### 🔭 Future
- [ ] Bitbucket integration
- [ ] Auto-PR creation for refactor suggestions
- [ ] AI-generated migration guides for major debt items
- [ ] Team velocity correlation (debt score vs. sprint throughput)

---

## Contributing

We welcome contributions. The best place to start is the [good first issue](https://github.com/codeward-io/codeward/labels/good%20first%20issue) label.

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/codeward.git

# Create a feature branch
git checkout -b feat/your-feature-name

# Make your changes, add tests
npm run test

# Lint and type-check
npm run lint
npm run typecheck

# Open a pull request
# Codeward will run on your own PR automatically
```

**Before contributing a new debt check:**
1. Open an issue describing the check, its tool, and its expected output format
2. Add the check definition to `packages/checks/src/definitions/`
3. Write a test fixture (a small repo that should trigger the check)
4. Add it to the relevant agent's tool list in `packages/agents/src/`
5. Update this README under the relevant agent section

Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before opening a PR.

---

## Security

Codeward takes security seriously. If you discover a vulnerability, please **do not open a public GitHub issue**.

**Responsible disclosure:**
- Email: `security@codeward.io`
- PGP key: [keybase.io/codeward](https://keybase.io/codeward)
- Response time: within 48 hours

**Data handling:**
- Source code is cloned into ephemeral sandboxes and destroyed after each run
- We store run results and annotated diffs — never raw source code
- All data in transit is encrypted via TLS 1.3
- Sandbox VMs have no external network access during execution
- See our full [Data Processing Agreement](https://codeward.io/dpa)

---

## License

Copyright (c) 2026 Codeward. **All rights reserved.**

This software is proprietary. Copying, reproduction, distribution, and modification are strictly and severely prohibited. 
See the [LICENSE](LICENSE) file for the full proprietary terms.

The Codeward name, logo, and brand assets may not be used without written permission.

---

<div align="center">

Built with 8 agents · [codeward.io](https://codeward.io) · [@codeward_io](https://twitter.com/codeward_io)

*"The code your team forgot to delete, found and removed."*

</div>