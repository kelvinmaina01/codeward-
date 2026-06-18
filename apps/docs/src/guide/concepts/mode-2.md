# Trigger Mode 2: On Push

**Mode 2** is the standard operating mode for Codeward. Every time a developer pushes code to a pull request, Mode 2 is triggered.

## What it does

1. **Diff Analysis:** The Orchestrator analyzes the git diff to understand the scope of the change.
2. **Selective Dispatch:** Based on the diff, the Orchestrator spins up only the necessary agents (e.g., a CSS change won't trigger the Database Performance Agent).
3. **Incremental Scoring:** Agents score only the newly introduced code, ensuring developers are not penalized for pre-existing baseline debt.

## Outcome

The Guardian Agent posts inline comments on the PR, detailing exactly what debt was introduced and how to fix it before merging.
