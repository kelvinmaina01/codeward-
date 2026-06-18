# Agents Overview

Codeward deploys **15 specialized AI agents** in parallel. There are 12 Analyzer Agents that perform the actual checks, and 3 Core System Agents that orchestrate, communicate, and report.

## The 3 Core System Agents

- **[Orchestrator](/agents/orchestrator)**: Runs in 3 phases (Ingestion, Dispatch, Decision). Acts as the Principal Engineer tiebreaker. (claude-3.5-haiku)
- **[Guardian Agent](/agents/guardian)**: Reports facts, posts inline comments, and blocks/approves PRs. The face of Codeward. (claude-3.5-sonnet)
- **[Chat Agent](/agents/chat)**: Conversational interface for developers. Can read all agent results and spawn new runs. (claude-3.5-sonnet)

## The 12 Analyzer Agents

- **[Security Agent](/agents/security)**: 20-step playbook. Runs TruffleHog, Trivy, ZAP, and more. (claude-3.5-haiku)
- **[Bloat Agent](/agents/bloat)**: Uses Fallow AST engine to find dead code, duplicate clones, and complexity. (claude-3.5-haiku)
- **[Broken Code Agent](/agents/broken-code)**: Uses the Karpathy loop to investigate test failures and silent errors. (claude-3.5-haiku)
- **[Architecture Agent](/agents/architecture)**: Instruments the running app, runs k6 load tests, and EXPLAIN ANALYZE. (claude-3.5-haiku)
- **[AI-Era Agent](/agents/ai-era)**: Adversarial injection, prompt extraction, and vector freshness. (claude-3.5-sonnet)
- **[Compliance Agent](/agents/compliance)**: Runs daily. GDPR, EU AI Act, WCAG. Flags legal risks. (claude-3.5-sonnet)
- **[Data & DX Agent](/agents/data-dx)**: Runs weekly. Pipeline quality, developer experience, CI flakiness. (claude-3.5-haiku)
- **[Performance Agent](/agents/performance)**: Memory leaks, O(N²) loops, and slow queries. (claude-3.5-haiku)
- **[Testing Agent](/agents/testing)**: Coverage gaps, weak assertions, and boundary testing. (claude-3.5-haiku)
- **[Dependencies Agent](/agents/dependencies)**: Outdated packages, conflicts, and license violations. (claude-3.5-haiku)
- **[Documentation Agent](/agents/documentation)**: Undocumented APIs, stale comments, and missing explanations. (claude-3.5-haiku)
- **[Style Agent](/agents/style)**: Naming conventions, structural patterns, and team consistency. (claude-3.5-haiku)

## Memory System

Every agent uses the **Agent Memory System**:
- `search_memory(repoId)` to load team dismissals at the start.
- `write_memory(repoId, summary)` to persist learnings at the end.
- Teams can dismiss findings and agents will not re-flag them.
