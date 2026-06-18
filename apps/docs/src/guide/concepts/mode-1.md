# Trigger Mode 1: On Connect

When you connect a new repository to Codeward via the GitHub App, **Mode 1** is triggered. This mode performs a full historical audit of the entire codebase.

## What it does

1. **Full History Scan:** TruffleHog scans all branches and commits for leaked secrets.
2. **Comprehensive Debt Audit:** All 12 analyzer agents scan every file in the repository to establish a baseline score.
3. **Architecture Mapping:** The Architecture Agent maps out the dependency graph and identifies monolith boundaries.

## Outcome

Codeward generates a "Baseline Health Certificate" which lists all existing technical debt. This sets the foundation for Mode 2, where Codeward will only flag *new* debt introduced in future pull requests.
