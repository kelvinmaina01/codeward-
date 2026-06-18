# Welcome to Codeward

Codeward deploys **15 specialized AI agents** in parallel the moment you push — security, bloat, broken code, architecture, AI-era debt, compliance, and more — all caught, fixed, and reported before a single line reaches production.

::: info Jump straight in
If you want to start immediately, head to the [Quickstart guide](/guide/getting-started/quickstart). You can connect your first repo and see results in under 5 minutes.
:::

## What is Codeward?

Sign in with your GitHub account via the Codeward dashboard. Codeward uses GitHub OAuth — no separate password needed.

Codeward is an autonomous code guardian that intercepts every git push, runs 100+ debt checks across 15 specialised AI agents in a hermetically sealed sandbox, and reports back to your GitHub PR as proof of work — with real test results, real CVEs found, real refactors made.

Unlike linters or static analysis tools, Codeward **actually runs your code**. It installs your dependencies, seeds a test database, executes your test suite, fires OWASP ZAP, scans your git history with truffleHog, and loads k6 for performance profiling — all inside an ephemeral VM that is destroyed after every run.

## Core concepts

- **[Mode 1 — on connect](/guide/concepts/mode-1)**: When you connect a repo, Codeward runs a full audit of the entire codebase immediately.
- **[Mode 2 — on push](/guide/concepts/mode-2)**: Every git push triggers a sandbox run against the diff. The guard is always on.
- **[15 parallel agents](/agents/overview)**: Specialised agents run simultaneously. Security, Bloat, Broken Code, Architecture, AI-era, and more.
- **[Guardian Agent](/agents/guardian)**: Posts inline PR comments, creates GitHub Issues, formally approves or blocks merges.

## Five-step workflow

1. **Connect your repo**: Install the Codeward GitHub App, select your repos, and choose a trust mode. Webhook installed automatically in under 90 seconds.
2. **Sandbox provisions**: Codeward detects your stack from `package.json` / `requirements.txt`, spins up a microVM with all tools pre-installed, and clones your repo.
3. **Agents run in parallel**: All 15 agents fire simultaneously via `Promise.all()`. They each run independently with their own context window and tool access.
4. **Guardian posts to GitHub**: The Guardian Agent reads all findings, posts inline diff comments on specific lines, creates GitHub Issues for unresolved findings, and submits a formal PR review.
5. **Sandbox destroyed**: The VM is always destroyed after every run, regardless of outcome. Your code never persists in Codeward's infrastructure.

## Next steps

- **[Quickstart](/guide/getting-started/quickstart)**: Connect your first repo and see your first scan results in under 5 minutes.
- **[GitHub App setup](/integrations/github)**: Install the Codeward GitHub App on your organisation or individual repos.
