# ADR 001: No dedicated production/secrets agent (for now)

**Status**: Accepted — 2026-07-04
**Context**: Raised twice during the autonomy build-out: "there could be an agent for prod, am
not sure if it is there in the code or how it will work." Confirmed by code audit: no such
agent exists in `apps/api/src/agents/definitions/`.

## Decision

Do **not** build a separate production/secrets agent yet. Two reasons, both grounded in what
the code actually does today:

1. **Secrets are already a covered, verified responsibility of the security agent.** Its real
   toolset (`agents/tools/security.tools.ts`) runs trufflehog, `.env`-file scanning,
   long-lived-token (NHI) detection, and CI-log leak scanning against every analyzed repo. A
   second agent would duplicate this surface without adding a capability.

2. **"Production" monitoring requires live infrastructure access this pipeline deliberately
   does not have.** Every agent operates on a cloned repo in an ephemeral sandbox — there is no
   deployed-instance URL, no production database, no APM feed. Every dynamic check in the
   codebase honestly returns `applicable: false` for exactly this reason. An agent whose whole
   premise is live production state would either be dishonest (fabricating checks) or empty.

## What would change this decision

A production agent becomes worth building when customers can connect real runtime signals:
- a live `baseUrl` + credentials for deployed-instance probing (unlocks the ~15 existing
  dynamic checks that currently return `applicable: false` — OWASP ZAP, rate-limit probing,
  RLS-live, backpressure, etc.), and/or
- an APM/observability integration (Sentry/Datadog) for the post-deploy monitoring window the
  Settings UI already sketches.

At that point, prefer **giving the existing security/architecture agents live-instance tools**
over a new agent — the constitution/playbook/memory machinery is per-domain, not per-environment,
and the shared-memory design means a "prod finding" is just a finding with runtime evidence.

## Secrets handling rules that apply today (recorded so they're not re-litigated)

- Secrets findings are severity CRITICAL in the security agent's schema → they hard-BLOCK the
  run gate, are never auto-fix eligible (no fixer policy exists for the security agent, by
  design), and always require a manual merge click (HIGH/CRITICAL are code-gated out of
  auto-merge in `merge.service.ts`).
- Escalation opens a real GitHub issue for unresolved CRITICAL/HIGH secrets findings
  (`escalation.service.ts`) — but the issue body truncates `rawEvidence` to 1000 chars and
  should never include the secret value itself; the security agent's constitution already
  forbids echoing secret material into findings.
