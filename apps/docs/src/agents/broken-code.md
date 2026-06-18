# Broken Code Agent

**Model:** `claude-3.5-haiku`
**Max Steps:** 25
**Triggers:** Every push.

The Broken Code Agent runs tests, stresses the system, and looks for silent failures. It uses the **Karpathy Loop** to investigate failures before reporting them.

## The Karpathy Loop

::: warning Core Principle
When a test fails, do NOT report it immediately. Loop: **read failure → grep for root cause → read relevant file → determine if real bug or environment issue**. Maximum 3 iterations per failure cluster.
:::

## Constitution (6 Absolute Rules)

1. **Karpathy Loop** — Investigate before reporting. Max 3 iterations per failure cluster.
2. **Evidence or Silence** — Every finding must have `file`, `line`, `toolName`, `rawEvidence`.
3. **Flaky ≠ Failing** — A test failing 3/10 runs is `MEDIUM` (flaky). A test failing 10/10 is `HIGH/CRITICAL`.
4. **Environment Errors Are Not Bugs** — Sandbox DB seed missing data = environment error, NOT a code bug.
5. **Token Budget** — Maximum 25 steps. Summarise tool results.
6. **Structured Output Only** — `submit_broken_code_report` JSON only.

## Scoring Formula

| Issue | Score Impact |
|---|---|
| Failing tests (per test) | -15 points |
| Migration rollback failure | -30 points |
| Memory leak detected | -20 points |
| Race condition found | -15 points |
| Data integrity failure | -25 points |
| Swallowed errors (per) | -5 points |
| Flaky tests (per) | -3 points |
| Type safety issues (per file) | -2 points |

**Gate Decision:** Any CRITICAL finding → `score = 0, BLOCK`. Failing tests > 0 → `BLOCK`. Score < 60 → `BLOCK`.

## 19-Step Execution Playbook

| Step | Tool | What it checks |
|---|---|---|
| 1 | `search_memory` | Load prior dismissals |
| 2 | `run_test_suite` | Full test run |
| 3 | Karpathy Loop | Root cause investigation per failure |
| 4 | `run_migration_down` | Rollback test |
| 5 | `run_data_integrity_check` | Write-then-read consistency |
| 6 | `check_race_conditions` | Concurrency test on write routes |
| 7 | `check_input_validation` | Malformed input test |
| 8 | `scan_async_patterns` | Silent promise rejections |
| 9 | `scan_swallowed_errors` | Empty catch blocks |
| 10 | `check_api_timeouts` | Missing timeout guards |
| 11 | `check_resource_handles` | Unclosed handles |
| 12 | `run_heap_profiler` | Memory leak detection |
| 13 | `check_zombie_workers` | Stuck background jobs |
| 14 | `run_flaky_detector` | 10 runs, non-deterministic tests |
| 15 | `check_type_safety` | `any` / `ts-ignore` count |
| 16 | `check_implicit_contracts` | Global state reliance |
| 17 | `check_stale_feature_flags` | Stale conditional paths |
| 18 | `write_memory` | Persist learnings |
| 19 | `submit_broken_code_report` | **Must be called to end the run** |

## Skills Reference

[View full Broken Code Agent Skills →](/agents/skills/broken-code-agent-skills)
