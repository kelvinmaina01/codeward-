# Bloat Agent

**Model:** `claude-3.5-haiku` — Fast deterministic analysis.
**Max Steps:** 25
**Triggers:** Every push.

The Bloat Agent is a ruthless codebase minimalist. It uses **Fallow** (a Rust-based AST engine) and tree-sitter as primary tools. The LLM interprets; the tools find.

## Constitution (6 Absolute Rules)

1. **Evidence or Silence** — Every finding MUST have `file`, `line`, `toolName`.
2. **No Subjective Bloat** — "This looks messy" is NOT a finding. `dead export formatCurrency at src/utils.ts:14` IS a finding.
3. **Verify Before Asserting** — Call `check_dynamic_imports` before marking code as dead. Read both files before marking duplicates.
4. **Auto-Refactor Only When Safe** — Only generate `suggestedRefactor` when the test suite can verify the change. If no tests cover it, set `refactorSafe: false`.
5. **Token Budget** — Maximum 20 tool call steps. Fallow handles bulk analysis.
6. **Structured Output Only** — Final output is `BloatAgentResult` JSON.

## 20-Step Execution Playbook

| Step | Tool | What it checks |
|---|---|---|
| 1 | `search_memory` | Load team dismissals |
| 2 | `run_fallow_dead_code` | Dead exports/imports |
| 3 | `check_dynamic_imports` | Verify each dead export (false-positive prevention) |
| 4 | `run_fallow_duplicates` | Clone families |
| 5 | `read_file` on each pair | Verify they're real duplicates |
| 6 | `run_fallow_complexity` | Complex functions |
| 7 | `check_god_files` | Oversized files |
| 8 | `check_dependency_usage` | Unused packages |
| 9 | `analyse_bundle_size` | CSS/asset bloat (frontend only) |
| 10 | `check_yagni_patterns` | Future-code never used |
| 11 | `check_feature_flags` | Stale feature flags |
| 12 | `scan_legacy_polyfills` | IE11 and other obsolete polyfills |
| 13 | `check_documentation_drift` | README vs actual code |
| 14 | `correlate_telemetry` | Features with <1% MAU |
| 15 | `run_fallow_boundaries` | Architecture violations |
| 16 | `run_fallow_health` | Overall score |
| 17 | `measure_cognitive_load` | Comprehension time (top 3 complex) |
| 18 | `run_tree_sitter_ast` | Generate safe refactors |
| 19 | `write_memory` | Persist learnings |
| 20 | `submit_bloat_report` | **Must be called to end the run** |

## The Fallow Engine

Fallow is a Rust-based AST engine that performs bulk dead code, duplicate, complexity, and boundary analysis. It is significantly faster than LLM-based analysis for these tasks. The Bloat Agent uses Fallow for all detection; the LLM only interprets results.

## Skills Reference

[View full Bloat Agent Skills →](/agents/skills/bloat-agent-skills)
