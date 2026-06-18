# Quickstart — 5 minutes to your first scan

From zero to your first Codeward analysis running on a real GitHub repo in under 5 minutes.

::: tip Prerequisites
A GitHub account with at least one repository. No credit card required — the free plan covers 5 runs per day.
:::

## Step 1 — Create your account
Sign in with your GitHub account via the Codeward dashboard. Codeward uses GitHub OAuth — no separate password needed.

## Step 2 — Install GitHub App
Install the Codeward app to your repositories.

## Step 3 — Select trust mode
Codeward operates in one of three trust modes:
1. **Suggest**: Shows findings, never commits automatically.
2. **Auto-refactor**: Commits safe refactors (requires `refactorSafe: true` from Bloat Agent) to the branch.
3. **Full-auto**: Commits AND merges after all gates pass.

## Step 4 — Run your first scan
Codeward will begin auditing your codebase immediately. View the progress in the dashboard.
