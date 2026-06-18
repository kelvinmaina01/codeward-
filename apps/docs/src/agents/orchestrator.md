# Orchestrator Agent

**Model:** `claude-3.5-haiku` (all 3 phases)
**Triggers:** Every push, Mode 1 on connect.

The Orchestrator is the Principal Engineer of the Codeward pipeline. It reads the commit diff, decides which agents to dispatch, collects their results, and makes the final gate decision. It runs in **3 sequential phases**, each capped at 5 steps.

## The 8-Rule Constitution

1. **You are the tiebreaker** — If Security says BLOCK and Architecture says PASS, reason about the conflict and make a judgment call — with written rationale.
2. **Critical = Block, No Exceptions** — If ANY sub-agent returns a Critical non-dismissed finding, output `gateDecision: "BLOCK"`.
3. **You read the diff, not just the scores** — A 3-line change to a payment handler needs different agent dispatch than a CSS refactor.
4. **Written rationale always** — Every gate decision must have a rationale string explaining WHY.
5. **Parallelism is the default** — Security, Bloat, Broken Code, and Architecture agents run in parallel by default.
6. **Dispatch proportionally** — A commit touching only `README.md` should NOT spin up a Security Agent with full OWASP scanning.
7. **Memory informs, never decides** — Agent memory is input to reasoning. A team can dismiss a finding incorrectly. Flag conflicts.
8. **Structured output only** — `OrchestratorResult` JSON only.

## The 3 Phases

### Phase 1 — Ingestion (`orchestrator_phase1`, 5 steps max)

```
Step 1: read_repo_config(repoPath, repoId)
Step 2: analyse_commit_diff(diff, changedFiles, config)
Step 3: post_github_check_run(status="in_progress")
```

Reads the configuration, analyzes what changed, and starts the GitHub check run. Output: **risk profile + parallelization plan**.

### Phase 2 — Dispatch (`orchestrator_phase2`, 5 steps max)

```
Step 1: Read risk profile from Phase 1
Step 2: Call spawn_agent() for each recommended analyzer agent
```

Spawns all recommended analyzer agents in parallel via `Promise.all()`. A CSS-only commit may skip Security; a payment handler change gets everything.

### Phase 3 — Decision (`orchestrator_phase3`, 5 steps max)

```
Step 1: aggregate_results(agentResults)
Step 2: Apply reasoning framework
Step 3: store_orchestrator_result(result)
Step 4: post_github_check_run(status="completed", conclusion)
Step 5: submit_orchestrator_decision
```

## Decision Reasoning Framework

```
Step 1: Hard Rules Check
  → IF any finding severity = "CRITICAL" AND dismissed = false → BLOCK
  → IF broken_code.testSuiteResult.failed > 0 → BLOCK
  → IF broken_code.migrationRollbackPassed = false → BLOCK

Step 2: Score Threshold Check
  → Compute weightedScore from all agents
  → IF weightedScore < repoConfig.customThresholds.securityMinScore → BLOCK

Step 3: Conflict Resolution
  → IF security says BLOCK but all others say PASS → Inspect carefully
  → IF broken_code says PASS but architecture says BLOCK → Usually WARN

Step 4: Context-Aware Judgment
  → Vibe rewrite (no new tests) + HIGH bloat → WARN in rationale
  → High-stakes domain (auth/payments) + security < 90 → Elevate threshold
  → Commit on main + CRITICAL + autoRollback=true → Trigger rollback
```

## Skills Reference

[View full Orchestrator Agent Skills →](/agents/skills/orchestrator-agent-skills)
