# GitHub Check Runs & PR Lifecycle Standards

## Check Run Registration & Naming
- **Name**: `🛡️ Codeward`
- **When to create**: Immediately upon receiving `pull_request.opened` or `pull_request.synchronize` in the webhook handler (`webhooks.ts`).
- **Target URL**: `${FRONTEND_URL}/runs/${runId}`

## Check States & Formatting Contract

### 1. In Progress (Webhook Dispatch)
- **Status**: `in_progress`
- **Title**: `🛡️ 5 agents dispatched`
- **Summary**: `Codeward is reviewing this PR in isolated sandboxes. Usually done in under 6 minutes.`
- **Text Body**:
```markdown
### 🛡️ Codeward

5 agents dispatched into ephemeral Firecracker sandboxes:
- **Security** — spinning up sandbox
- **Bloat** — spinning up sandbox
- **Architecture** — spinning up sandbox
- **Compliance** — spinning up sandbox
- **Guardian** — spinning up sandbox

Each runs independently — SAST, dependency checks, architecture and compliance review — then reports to the orchestrator for one consolidated verdict.

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
