export const mockHealthData = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  score: Math.round(55 + Math.min(22, i * 0.9) + (Math.sin(i * 0.7) * 4)),
}));
mockHealthData[mockHealthData.length - 1].score = 77;

export const mockDebtData = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  lines: -Math.round(i * 48 + (Math.max(0, i - 15) * 12)),
}));
mockDebtData[mockDebtData.length - 1].lines = -1346;

export const mockActivityRows = [
  { sha: '7fde8ba', repo: 'mobile-backend', msg: 'feat: push notification service integration', status: 'RUNNING', statusColor: 'bg-cw-blue text-white', time: 'Jun 5, 07:14' },
  { sha: '17f7fd3', repo: 'frontend-app', msg: 'fix: handle error handler remove from 3 routes', status: 'CRITICAL', statusColor: 'bg-cw-red text-white', time: 'Jun 5, 10:18' },
  { sha: 'e3ff601', repo: 'api-gateway', msg: 'feat: add rate limiting middleware', status: 'PENDING', statusColor: 'bg-cw-bg3 text-cw-txt2', time: 'Jun 5, 21:55' },
  { sha: 'f03b3fe', repo: 'frontend-app', msg: 'chore: update dependencies and remove dead code', status: 'PENDING', statusColor: 'bg-cw-bg3 text-cw-txt2', time: 'Jun 5, 20:09' },
  { sha: 'e40e9f1', repo: 'mobile-backend', msg: 'refactor: consolidate API response formatters', status: 'PENDING', statusColor: 'bg-cw-bg3 text-cw-txt2', time: 'Jun 5, 10:06' },
  { sha: 'a1b6f6', repo: 'auth-service', msg: 'refactor: implement JWT refresh token rotation', status: 'PASSED', statusColor: 'bg-cw-green text-white', time: 'Jun 5, 17:35' },
  { sha: 'd7c2e88', repo: 'api-gateway', msg: 'refactor: extract auth helpers into shared utils', status: 'PASSED', statusColor: 'bg-cw-green text-white', time: 'Jun 5, 17:35' },
  { sha: '2d8e19f', repo: 'data-pipeline', msg: 'wip: refactor pipeline stage handlers', status: 'CRITICAL', statusColor: 'bg-cw-red text-white', time: 'Jun 5, 23:35' },
  { sha: '3402d7f', repo: 'api-gateway', msg: 'fix: handle null pointer in request validator', status: 'PASSED', statusColor: 'bg-cw-green text-white', time: 'Jun 4, 10:35' },
  { sha: 'e007c3', repo: 'data-pipeline', msg: 'fix: memory leak in stream processor', status: 'RUNNING', statusColor: 'bg-cw-blue text-white', time: 'Jun 4, 22:10' },
];

export const mockLiveFeedLogs = [
  { ts: '14:23:01', cls: 'inf', text: 'Webhook received · commit 3fa2c1 · branch: main · 14 files changed' },
  { ts: '14:23:01', cls: 'inf', text: 'Signature verified · HMAC-SHA256 ✓' },
  { ts: '14:23:03', cls: 'inf', text: 'Stack detected: Node 20 + Postgres 16 + Redis 7' },
  { ts: '14:23:03', cls: 'inf', text: 'Provisioning Firecracker microVM · isolated environment' },
  { ts: '14:23:38', cls: 'ok', text: 'Sandbox ready · boot 35s · zero external network access ✓' },
  { ts: '14:23:39', cls: 'inf', text: 'Installing dependencies · 847 packages · node_modules from cache' },
  { ts: '14:23:44', cls: 'ok', text: 'Dependencies installed ✓' },
  { ts: '14:23:45', cls: 'inf', text: 'Loading seed DB · 12,400 anonymised rows · migrations running' },
  { ts: '14:23:52', cls: 'ok', text: 'DB seeded · all migrations passed ✓' },
  { ts: '14:23:53', cls: 'inf', text: 'Orchestrator Agent · dispatching Security, Bloat, and Architecture Agents' },
  { ts: '14:24:01', cls: 'warn', text: '[BLOAT AGENT] · validateEmail() in auth/validators.js duplicates utils/validators.js:42' },
  { ts: '14:24:01', cls: 'ok', text: '  → refactored · import rewritten to use existing helper ✓' },
  { ts: '14:24:03', cls: 'warn', text: '[BLOAT AGENT] · formatDate() appears in 4 files · extracting to utils/dates.js' },
  { ts: '14:24:05', cls: 'ok', text: '  → 3 files updated · 52 duplicate lines removed ✓' },
  { ts: '14:24:08', cls: 'inf', text: '[SECURITY AGENT] · OWASP top 10 · secrets detection · CVE audit' },
  { ts: '14:24:22', cls: 'ok', text: '  → No secrets detected · 847 files + full git log scanned ✓' },
  { ts: '14:24:24', cls: 'ok', text: '  → No critical CVEs · 3 low-severity flagged in report ✓' },
  { ts: '14:24:26', cls: 'inf', text: '[SECURITY AGENT] · Auth check · firing unauthenticated requests at all 34 routes' },
  { ts: '14:24:28', cls: 'ok', text: '  → All routes return 401 without valid token ✓' },
  { ts: '14:24:31', cls: 'inf', text: 'Test runner starting · Jest · 142 tests' },
  { ts: '14:25:12', cls: 'ok', text: '142/142 tests passed · 0 failures ✓' },
  { ts: '14:25:44', cls: 'warn', text: '[ARCHITECTURE AGENT] · N+1 detected · /api/users fires 1 query per row · suggest JOIN' },
  { ts: '14:25:46', cls: 'inf', text: '[ORCHESTRATOR AGENT] · Awaiting conflict resolution...' },
  { ts: '14:25:49', cls: 'ok', text: '[ORCHESTRATOR AGENT] · Decision: PASS. N+1 is non-critical for this branch.' },
  { ts: '14:25:51', cls: 'ok', text: 'Debt score: 91/100 · all gates passed ✓' },
  { ts: '14:25:52', cls: 'ok', text: 'Promoting to staging · ephemeral environment deploying ✓' },
  { ts: '14:25:58', cls: 'ok', text: 'Staging live · staging-3fa2c1.codeward.app ✓' },
  { ts: '14:25:58', cls: 'inf', text: 'Waiting for approval · auto-approve in 2h if no action', cursor: true },
];

export const mockOrchestratorResult = {
  agentType: "orchestrator",
  runId: "run_999",
  gateDecision: "PASS",
  rationale: "All agents reported passing scores. Security scan is clean. Minor architecture findings are not critical blockers.",
  blockReasons: [],
  overallWeightedScore: 91,
  historicalTrend: "improving",
  criticalFindings: []
};
