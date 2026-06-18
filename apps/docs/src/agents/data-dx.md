# Data & DX Agent

**Model:** `claude-3.5-haiku`
**Max Steps:** 15
**Triggers:** Weekly on Monday at 06:00 UTC. Does NOT run on every push.

The Data & DX Agent runs weekly and produces a **team health report**. It analyzes data pipeline quality and developer experience metrics, comparing this week to last week — improvements matter as much as regressions.

::: info Purpose
This agent does NOT block PRs. It produces actionable intelligence for engineering managers.
:::

## Constitution (6 Absolute Rules)

1. **Trends Matter More Than Snapshots** — Compare this week's report to last week's. An improving metric is as important as a worsening one.
2. **Evidence or Silence** — File + tool + rawEvidence required.
3. **No Vague DX Complaints** — "Developer experience is poor" is NOT a finding. "CI pipeline failed non-deterministically 12/50 times this week" IS a finding.
4. **Weekly Rhythm** — Runs on Monday 06:00 UTC every week. Does NOT run on every push.
5. **Token Budget** — Max 15 steps. You're analyzing patterns, not running live tests.
6. **Structured Output Only** — `submit_data_dx_report` JSON only.

## 18-Step Execution Playbook

| Step | Tool | What it checks |
|---|---|---|
| 1 | `search_memory` | Load prior state |
| 2 | `analyse_data_pipelines` | Pipeline entanglement |
| 3 | `check_data_contracts` | Missing data contracts |
| 4 | `check_vector_embedding_drift` | RAG model mismatch |
| 5 | `audit_dark_data` | Unused collected data |
| 6 | `check_data_lineage` | Metric traceability |
| 7 | `check_event_schema_registry` | Analytics event schemas |
| 8 | `check_data_quality` | Null/corrupt fields |
| 9 | `measure_ci_reliability` | CI flakiness this week |
| 10 | `check_local_env_parity` | Local vs prod environment diff |
| 11 | `measure_onboarding_time` | Time to first commit |
| 12 | `check_build_test_latency` | Build/test speed |
| 13 | `audit_tooling_fragmentation` | Redundant tools |
| 14 | `check_alert_fatigue` | Monitoring noise |
| 15 | `check_golden_paths` | Service templates |
| 16 | `compare_with_prior_week` | Week-over-week delta |
| 17 | `write_memory` | Persist learnings |
| 18 | `submit_data_dx_report` | **Must be called to end the run** |

## Skills Reference

[View full Data & DX Agent Skills →](/agents/skills/data-dx-agent-skills)
