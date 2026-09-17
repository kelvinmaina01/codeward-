# GitHub Check Runs & PR Lifecycle Standards

## Check Run Registration & Naming
- **Name**: `🛡️ Codeward`
- **When to create**: Immediately upon receiving `pull_request.opened` or `pull_request.synchronize` in the webhook handler (`webhooks.ts`).
- **Target URL**: `${FRONTEND_URL}/runs/${runId}`

## Check States & Formatting Contract

### 1. In Progress (Webhook Dispatch)
- **Status**: `in_progress`
- **Title**: `🛡️ {count} agents dispatched` (dynamically computed from repo/run config)
- **Summary**: `Codeward is reviewing this PR in isolated sandboxes. Usually done in under 6 minutes.`
- **Text Body**: Includes the dynamic bullet list, the full branded Multi-Agent Dispatch Table, and the reassuring developer guidance note.
```markdown
### 🛡️ Codeward

{count} agents dispatched into ephemeral Firecracker sandboxes:
• Security — spinning up sandbox
• Bloat — spinning up sandbox
• Architecture — spinning up sandbox
...

#### 🤖 Multi-Agent Review Team
| Agent | Domain | Focus Area | Status |
| :--- | :--- | :--- | :--- |
| **🛡️ Runtime Security** | OWASP & AppSec | SQLi, broken auth/RLS, secret leaks & vulnerability vectors | 🔄 Analyzing in sandbox |
| **🏛️ Architecture** | System Design | Circular dependencies, architectural drift & module coupling | 🔄 Analyzing in sandbox |
| **📦 Bloat & Dead Code** | Code Health | Zombie exports, bundle overhead & unused packages | 🔄 Analyzing in sandbox |
...

Each runs independently — SAST, dependency checks, architecture and compliance review — then reports to the orchestrator for one consolidated verdict.

> ☕ **Please be patient while our agents do the heavy lifting.**
> Unlike traditional superficial linters, Codeward executes real static & dynamic checks and dry-runs potential fixes in an isolated Firecracker microVM sandbox. Analysis typically takes **~1–2 minutes**.

[Watch it live →](https://codeward.cloud/runs/{runId})
```

### 2. Completed (Clean Case)
- **Status**: `completed`
- **Conclusion**: `success` (renders green check ✅)
- **Title**: `✅ Clean — no issues found`
- **Text Body**:
```markdown
### 🛡️ Codeward

All agents reported back clean.

Completed in {durationSeconds}s. [Full report on the dashboard →](https://codeward.cloud/runs/{runId})
```

### 3. Completed (Findings Detected)
- **Status**: `completed`
- **Conclusion**: `failure` (if `critical > 0`), otherwise `neutral`
- **Title**: `🔍 {count} findings ({critical} critical)`
- **Text Body**:
```markdown
### 🛡️ Codeward

Review complete — here's what the agents found:

| Severity | Count |
| :--- | :--- |
| 🔴 Critical | {criticalCount} |
| 🟠 High | {highCount} |
| 🟡 Medium | {mediumCount} |
| 🔵 Low | {lowCount} |

Completed in {durationSeconds}s. [Full report on the dashboard →](https://codeward.cloud/runs/{runId})
```

## Resilience Rules
1. **Auto-heal `installation_id`**: If a repository's `installation_id` is null in the database, automatically extract `data.installation.id` from incoming GitHub webhooks and persist to Postgres.
2. **Never block webhook acknowledgement**: Check runs and initial PR status comments are queued or invoked without blocking the HTTP 200 return to GitHub.
