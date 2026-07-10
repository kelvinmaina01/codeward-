import { useState } from 'react';
import {
  ArrowLeft, GitCommit, CheckCircle2, XCircle, Clock, Loader2,
  ChevronRight, ChevronDown, ShieldCheck, Zap, Bug, Layers,
  FileText, Bot, Sparkles, GitPullRequest, AlertTriangle,
  ExternalLink, Lock, Minus, RefreshCw, Info, X, Wrench,
  BarChart2, AlertCircle, Github
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MockFinding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: string;
  title: string;
  description: string;
  file: string | null;
  line: number | null;
  toolName: string;
  fixStatus: 'suggested' | 'pr_opened' | 'dismissed';
  suggestedFix: string | null;
}

interface MockAgentReport {
  agentId: string;
  displayName: string;
  status: 'completed' | 'failed' | 'skipped' | 'running' | 'queued';
  score: number | null;
  gate: 'PASS' | 'WARN' | 'BLOCK' | null;
  findings: MockFinding[];
  toolsRun: { name: string; duration: number; result: string }[];
  autoFixPR: { number: number; url: string; fixedCount: number; guardianDecision: 'APPROVE' | 'REQUEST_CHANGES' } | null;
  skippedReason?: string;
  durationMs: number | null;
}

interface MockRunReport {
  runId: number;
  commitSha: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'agent_failed';
  overallScore: number | null;
  gateDecision: 'PASS' | 'WARN' | 'BLOCK' | null;
  isIncremental: boolean;
  changedFiles: string[];
  createdAt: string;
  completedAt: string | null;
  agents: MockAgentReport[];
  escalatedIssues: { number: number; title: string; url: string }[];
}

interface AgentResult {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: 'completed' | 'failed' | 'skipped' | 'running' | 'queued';
  score: number | null;
  gate: 'PASS' | 'WARN' | 'BLOCK' | null;
  findings: number;
  durationMs: number | null;
  autoFixPR: { number: number; url: string } | null;
  skippedReason?: string;
}

interface CommitRun {
  id: number;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'agent_failed';
  score: number | null;
  isIncremental: boolean;
  changedFileCount: number | null;
  agentsRun: number;
  agentsSkipped: number;
  gateDecision: 'PASS' | 'WARN' | 'BLOCK' | null;
  agents: AgentResult[];
  createdAt: string;
  completedAt: string | null;
}

interface Commit {
  sha: string;
  message: string;
  authorName: string;
  authorAvatar: string | null;
  date: string;
  htmlUrl: string | null;
  branch: string;
  run: CommitRun | null;
}

interface Props {
  repoId?: number;
  repoFullName?: string;
  onBack: () => void;
}

// ─── Mock run reports (full per-agent breakdown for the side pull) ─────────────

const MOCK_RUN_REPORTS: Record<number, MockRunReport> = {
  42: {
    runId: 42, commitSha: 'a1b2c3d4e5f6', status: 'running', overallScore: null, gateDecision: null,
    isIncremental: true, changedFiles: ['src/ws/feed.ts', 'src/routes/index.ts', 'src/types/events.ts', 'package.json'],
    createdAt: new Date(Date.now() - 90 * 1000).toISOString(), completedAt: null,
    escalatedIssues: [],
    agents: [
      {
        agentId: 'security', displayName: 'Security Agent', status: 'completed', score: 88, gate: 'WARN', durationMs: 14200, autoFixPR: null,
        toolsRun: [
          { name: 'scan_secrets', duration: 1200, result: 'No hardcoded secrets found' },
          { name: 'check_auth_patterns', duration: 3400, result: '1 potential issue: WebSocket missing auth token validation' },
          { name: 'scan_injection', duration: 2100, result: 'No injection vulnerabilities found' },
          { name: 'check_cors', duration: 1800, result: 'CORS headers correctly configured' },
        ],
        findings: [
          { severity: 'MEDIUM', category: 'Authentication', title: 'WebSocket endpoint missing token validation', description: 'The /ws/feed endpoint accepts connections without validating the Bearer token. Any unauthenticated client can subscribe to agent events.', file: 'src/ws/feed.ts', line: 23, toolName: 'check_auth_patterns', fixStatus: 'suggested', suggestedFix: 'Add token validation middleware before upgrading the HTTP connection to WebSocket. Verify req.headers.authorization before calling ws.handleUpgrade().' },
          { severity: 'LOW', category: 'Information Disclosure', title: 'Raw error objects sent to WebSocket clients', description: 'Error stack traces are broadcast to all connected clients on agent failure events, potentially leaking internal paths.', file: 'src/ws/feed.ts', line: 87, toolName: 'check_auth_patterns', fixStatus: 'suggested', suggestedFix: 'Sanitize error payloads before broadcasting: send only { type, message } without the stack property.' },
        ],
      },
      { agentId: 'bloat', displayName: 'Bloat Agent', status: 'running', score: null, gate: null, durationMs: null, autoFixPR: null, toolsRun: [], findings: [] },
      { agentId: 'broken_code', displayName: 'Broken Code Agent', status: 'queued', score: null, gate: null, durationMs: null, autoFixPR: null, toolsRun: [], findings: [] },
      { agentId: 'architecture', displayName: 'Architecture Agent', status: 'skipped', score: null, gate: null, durationMs: null, autoFixPR: null, toolsRun: [], findings: [], skippedReason: 'No architecture files changed' },
      { agentId: 'compliance', displayName: 'Compliance Agent', status: 'skipped', score: null, gate: null, durationMs: null, autoFixPR: null, toolsRun: [], findings: [], skippedReason: 'Scope: 4 files (no config/infra)' },
      { agentId: 'data_dx', displayName: 'Data & DX Agent', status: 'skipped', score: null, gate: null, durationMs: null, autoFixPR: null, toolsRun: [], findings: [], skippedReason: 'No DB schema changes detected' },
      { agentId: 'ai_era', displayName: 'AI Era Agent', status: 'skipped', score: null, gate: null, durationMs: null, autoFixPR: null, toolsRun: [], findings: [], skippedReason: 'Scope: backend only, no AI patterns' },
    ],
  },
  41: {
    runId: 41, commitSha: 'f9e8d7c6b5a4', status: 'completed', overallScore: 94, gateDecision: 'PASS',
    isIncremental: true, changedFiles: ['src/routes/users.ts', 'src/db/queries.ts'],
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000 - 2 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 4 * 60 * 60 * 1000 + 8 * 60 * 1000).toISOString(),
    escalatedIssues: [],
    agents: [
      {
        agentId: 'security', displayName: 'Security Agent', status: 'completed', score: 96, gate: 'PASS', durationMs: 12300, autoFixPR: null,
        toolsRun: [
          { name: 'scan_secrets', duration: 980, result: 'No hardcoded secrets found' },
          { name: 'check_sql_injection', duration: 4200, result: 'Parameterized queries used correctly — clean' },
          { name: 'check_auth_patterns', duration: 2100, result: 'Auth middleware applied to all routes — passed' },
        ],
        findings: [],
      },
      {
        agentId: 'bloat', displayName: 'Bloat Agent', status: 'completed', score: 100, gate: 'PASS', durationMs: 9800, autoFixPR: null,
        toolsRun: [
          { name: 'find_dead_code', duration: 3200, result: 'No dead code found in changed files' },
          { name: 'check_unused_imports', duration: 1800, result: 'All imports used — clean' },
        ],
        findings: [],
      },
      {
        agentId: 'data_dx', displayName: 'Data & DX Agent', status: 'completed', score: 85, gate: 'PASS', durationMs: 18400, autoFixPR: null,
        toolsRun: [
          { name: 'check_n_plus_1', duration: 8200, result: '1 potential N+1 pattern resolved — good fix confirmed' },
          { name: 'check_index_usage', duration: 4100, result: 'inArray query will use existing composite index on (userId, createdAt)' },
          { name: 'check_query_complexity', duration: 3600, result: 'Batch query complexity within acceptable bounds' },
        ],
        findings: [
          { severity: 'INFO', category: 'Performance', title: 'Consider adding a covering index for this query pattern', description: 'The new batch user fetch queries (id, name, email, createdAt). Adding a covering index could eliminate the heap fetch.', file: 'src/db/queries.ts', line: 44, toolName: 'check_index_usage', fixStatus: 'suggested', suggestedFix: 'CREATE INDEX CONCURRENTLY idx_users_batch ON users(id) INCLUDE (name, email, created_at);' },
        ],
      },
      { agentId: 'architecture', displayName: 'Architecture Agent', status: 'skipped', score: null, gate: null, durationMs: null, autoFixPR: null, toolsRun: [], findings: [], skippedReason: 'No architecture files changed' },
      { agentId: 'compliance', displayName: 'Compliance Agent', status: 'skipped', score: null, gate: null, durationMs: null, autoFixPR: null, toolsRun: [], findings: [], skippedReason: 'Scope: 2 files (no config/infra)' },
      { agentId: 'broken_code', displayName: 'Broken Code Agent', status: 'skipped', score: null, gate: null, durationMs: null, autoFixPR: null, toolsRun: [], findings: [], skippedReason: 'No high-risk patterns detected' },
      { agentId: 'ai_era', displayName: 'AI Era Agent', status: 'skipped', score: null, gate: null, durationMs: null, autoFixPR: null, toolsRun: [], findings: [], skippedReason: 'Scope: DB query fix only' },
    ],
  },
  40: {
    runId: 40, commitSha: '3c4d5e6f7a8b', status: 'completed', overallScore: 61, gateDecision: 'BLOCK',
    isIncremental: true, changedFiles: ['src/payments/stripe.ts', 'src/webhooks/stripe.ts', 'src/routes/billing.ts', 'package.json', 'package-lock.json', 'src/types/stripe.ts', 'src/config/stripe.ts', 'src/tests/billing.test.ts'],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 3 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 14 * 60 * 1000).toISOString(),
    escalatedIssues: [
      { number: 31, title: 'CRITICAL: Stripe webhook secret exposed in source code', url: 'https://github.com/acme-corp/my-api/issues/31' },
      { number: 32, title: 'HIGH: Missing idempotency key on charge creation endpoint', url: 'https://github.com/acme-corp/my-api/issues/32' },
    ],
    agents: [
      {
        agentId: 'security', displayName: 'Security Agent', status: 'completed', score: 42, gate: 'BLOCK', durationMs: 22400, autoFixPR: null,
        toolsRun: [
          { name: 'scan_secrets', duration: 2100, result: 'CRITICAL: Stripe webhook secret hardcoded in stripe.ts' },
          { name: 'check_payment_security', duration: 6800, result: '2 HIGH issues found: missing idempotency + unverified webhook signatures in test env' },
          { name: 'check_auth_patterns', duration: 3200, result: 'Billing routes are auth-protected — passed' },
          { name: 'scan_injection', duration: 2400, result: 'No injection vulnerabilities found' },
        ],
        findings: [
          { severity: 'CRITICAL', category: 'Secrets Management', title: 'Stripe webhook secret hardcoded in source', description: 'The Stripe webhook signing secret (whsec_...) is hardcoded directly in src/config/stripe.ts. This secret allows anyone with repo access to forge Stripe events.', file: 'src/config/stripe.ts', line: 12, toolName: 'scan_secrets', fixStatus: 'suggested', suggestedFix: 'Move to STRIPE_WEBHOOK_SECRET environment variable. Rotate the secret in the Stripe dashboard immediately.' },
          { severity: 'HIGH', category: 'Payment Security', title: 'Missing idempotency key on charge creation', description: 'POST /billing/charge does not pass an idempotency key to Stripe. Network retries can cause double-charges.', file: 'src/routes/billing.ts', line: 58, toolName: 'check_payment_security', fixStatus: 'suggested', suggestedFix: 'Add idempotencyKey: `charge-${userId}-${Date.now()}` to stripe.paymentIntents.create() options.' },
          { severity: 'HIGH', category: 'Webhook Security', title: 'Webhook signature verification skipped in test environment', description: 'A NODE_ENV === "test" guard disables stripe.webhooks.constructEvent() signature check. This env detection can be spoofed in staging.', file: 'src/webhooks/stripe.ts', line: 34, toolName: 'check_payment_security', fixStatus: 'suggested', suggestedFix: 'Remove the NODE_ENV guard. Always verify webhook signatures regardless of environment.' },
        ],
      },
      {
        agentId: 'compliance', displayName: 'Compliance Agent', status: 'completed', score: 70, gate: 'WARN', durationMs: 14100, autoFixPR: null,
        toolsRun: [
          { name: 'check_pci_dss', duration: 5600, result: 'WARN: Card data logged in error handler — PCI DSS 3.4 violation risk' },
          { name: 'check_gdpr', duration: 3200, result: 'No GDPR violations found' },
        ],
        findings: [
          { severity: 'MEDIUM', category: 'PCI-DSS', title: 'Potential card data in error logs', description: 'The billing error handler logs the full request body which may contain card-related metadata. PCI-DSS 3.4 prohibits storing sensitive auth data.', file: 'src/routes/billing.ts', line: 89, toolName: 'check_pci_dss', fixStatus: 'suggested', suggestedFix: 'Sanitize error log: omit req.body before logging or use a deny-list for payment-related fields.' },
          { severity: 'LOW', category: 'Compliance', title: 'Stripe API version not pinned', description: 'stripe.apiVersion is not set. Stripe may change behavior on new API releases.', file: 'src/config/stripe.ts', line: 5, toolName: 'check_pci_dss', fixStatus: 'suggested', suggestedFix: 'Set apiVersion: "2024-06-20" in the Stripe constructor.' },
        ],
      },
      {
        agentId: 'bloat', displayName: 'Bloat Agent', status: 'completed', score: 88, gate: 'PASS', durationMs: 11200,
        autoFixPR: { number: 23, url: 'https://github.com/acme-corp/my-api/pull/23', fixedCount: 1, guardianDecision: 'APPROVE' },
        toolsRun: [
          { name: 'find_dead_code', duration: 4100, result: '1 unused function found: formatLegacyCharge() in stripe.ts' },
          { name: 'check_unused_imports', duration: 2200, result: '2 unused imports in billing.ts' },
        ],
        findings: [
          { severity: 'LOW', category: 'Dead Code', title: 'Unused function formatLegacyCharge()', description: 'formatLegacyCharge() in stripe.ts is never called. It references the deprecated Stripe Charges API.', file: 'src/payments/stripe.ts', line: 112, toolName: 'find_dead_code', fixStatus: 'pr_opened', suggestedFix: null },
        ],
      },
      {
        agentId: 'broken_code', displayName: 'Broken Code Agent', status: 'completed', score: 75, gate: 'PASS', durationMs: 16800, autoFixPR: null,
        toolsRun: [
          { name: 'check_type_safety', duration: 5400, result: '1 potential runtime error: unguarded .data access on Stripe response' },
          { name: 'check_error_handling', duration: 3800, result: 'Most error paths handled — 1 unhandled rejection' },
        ],
        findings: [
          { severity: 'MEDIUM', category: 'Runtime Error', title: 'Unguarded property access on Stripe response', description: 'stripe.paymentIntents.retrieve().data is accessed without null check. A cancelled payment intent returns null data, causing a TypeError.', file: 'src/routes/billing.ts', line: 73, toolName: 'check_type_safety', fixStatus: 'suggested', suggestedFix: 'Add null guard: if (!intent.data) throw new Error("Payment intent not found");' },
        ],
      },
      {
        agentId: 'data_dx', displayName: 'Data & DX Agent', status: 'completed', score: 80, gate: 'PASS', durationMs: 13300, autoFixPR: null,
        toolsRun: [
          { name: 'check_n_plus_1', duration: 4200, result: 'No N+1 patterns in payment routes' },
          { name: 'check_transactions', duration: 5100, result: 'Charge + audit log write not wrapped in a transaction — data consistency risk' },
        ],
        findings: [],
      },
      { agentId: 'architecture', displayName: 'Architecture Agent', status: 'skipped', score: null, gate: null, durationMs: null, autoFixPR: null, toolsRun: [], findings: [], skippedReason: 'No structural changes' },
      { agentId: 'ai_era', displayName: 'AI Era Agent', status: 'skipped', score: null, gate: null, durationMs: null, autoFixPR: null, toolsRun: [], findings: [], skippedReason: 'No AI patterns in scope' },
    ],
  },
  39: {
    runId: 39, commitSha: '9b8a7f6e5d4c', status: 'completed', overallScore: 89, gateDecision: 'PASS',
    isIncremental: true, changedFiles: ['src/middleware/auth.ts', 'src/middleware/rateLimit.ts', 'src/routes/users.ts', 'src/routes/repos.ts', 'src/types/auth.ts'],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 2 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 11 * 60 * 1000).toISOString(),
    escalatedIssues: [],
    agents: [
      { agentId: 'security', displayName: 'Security Agent', status: 'completed', score: 92, gate: 'PASS', durationMs: 13100, autoFixPR: null, toolsRun: [{ name: 'scan_secrets', duration: 980, result: 'Clean' }, { name: 'check_auth_patterns', duration: 4200, result: 'Shared auth middleware correctly validates JWT on all protected routes' }], findings: [] },
      { agentId: 'bloat', displayName: 'Bloat Agent', status: 'completed', score: 78, gate: 'WARN', durationMs: 10400, autoFixPR: { number: 21, url: 'https://github.com/acme-corp/my-api/pull/21', fixedCount: 4, guardianDecision: 'APPROVE' }, toolsRun: [{ name: 'find_dead_code', duration: 3200, result: '4 duplicate auth helper functions removed across routes' }, { name: 'check_unused_imports', duration: 1800, result: '3 unused imports cleaned up' }], findings: [{ severity: 'LOW', category: 'Dead Code', title: '4 duplicate auth helper functions across route files', description: 'verifyToken(), getUser(), requireAdmin(), and checkScope() were copy-pasted across 3 route files before this refactor. The shared middleware correctly consolidates them.', file: 'src/routes/users.ts', line: 8, toolName: 'find_dead_code', fixStatus: 'pr_opened', suggestedFix: null }, { severity: 'LOW', category: 'Dead Code', title: 'Legacy isAuthenticated() shim', description: 'isAuthenticated() wrapping the new auth middleware — the shim is no longer needed.', file: 'src/middleware/auth.ts', line: 89, toolName: 'find_dead_code', fixStatus: 'pr_opened', suggestedFix: null }, { severity: 'LOW', category: 'Dead Code', title: 'Unused AuthContext import', description: 'AuthContext was imported but not used after middleware extraction.', file: 'src/routes/repos.ts', line: 3, toolName: 'check_unused_imports', fixStatus: 'pr_opened', suggestedFix: null }, { severity: 'LOW', category: 'Dead Code', title: 'Unused UserDTO import', description: 'UserDTO interface no longer referenced in users.ts after middleware move.', file: 'src/routes/users.ts', line: 5, toolName: 'check_unused_imports', fixStatus: 'pr_opened', suggestedFix: null }] },
      { agentId: 'broken_code', displayName: 'Broken Code Agent', status: 'completed', score: 91, gate: 'PASS', durationMs: 12700, autoFixPR: null, toolsRun: [{ name: 'check_type_safety', duration: 4100, result: 'All auth middleware types correctly propagated to req.user — clean' }], findings: [] },
      { agentId: 'architecture', displayName: 'Architecture Agent', status: 'completed', score: 88, gate: 'PASS', durationMs: 19600, autoFixPR: null, toolsRun: [{ name: 'check_coupling', duration: 7200, result: 'Middleware extraction reduces coupling — improvement noted' }, { name: 'check_circular_deps', duration: 4800, result: 'No circular dependencies introduced' }], findings: [{ severity: 'INFO', category: 'Architecture', title: 'Auth middleware not registered in barrel index', description: 'src/middleware/auth.ts is not re-exported from src/middleware/index.ts. Future imports will bypass the barrel and create inconsistent import paths.', file: 'src/middleware/auth.ts', line: 1, toolName: 'check_coupling', fixStatus: 'suggested', suggestedFix: "Add export { authMiddleware } from './auth'; to src/middleware/index.ts" }] },
      { agentId: 'compliance', displayName: 'Compliance Agent', status: 'skipped', score: null, gate: null, durationMs: null, autoFixPR: null, toolsRun: [], findings: [], skippedReason: 'No config changes' },
      { agentId: 'data_dx', displayName: 'Data & DX Agent', status: 'skipped', score: null, gate: null, durationMs: null, autoFixPR: null, toolsRun: [], findings: [], skippedReason: 'No DB changes' },
      { agentId: 'ai_era', displayName: 'AI Era Agent', status: 'skipped', score: null, gate: null, durationMs: null, autoFixPR: null, toolsRun: [], findings: [], skippedReason: 'No AI patterns' },
    ],
  },
};

// ─── Mock data (commit timeline) ──────────────────────────────────────────────

const AGENT_ICONS: Record<string, React.ReactNode> = {
  security:      <ShieldCheck size={12} />,
  bloat:         <Zap size={12} />,
  broken_code:   <Bug size={12} />,
  architecture:  <Layers size={12} />,
  compliance:    <FileText size={12} />,
  data_dx:       <Bot size={12} />,
  ai_era:        <Sparkles size={12} />,
  guardian:      <ShieldCheck size={12} />,
};

const MOCK_COMMITS: Commit[] = [
  { sha: 'a1b2c3d4e5f6', message: 'feat: add real-time WebSocket notifications for agent events\n\nAdds a new /ws/feed endpoint and broadcasts agent_active, agent_completed,\nand agent_failed events as structured JSON.', authorName: 'Kelvin Maina', authorAvatar: null, date: new Date(Date.now() - 2 * 60 * 1000).toISOString(), htmlUrl: 'https://github.com/acme-corp/my-api/commit/a1b2c3d4e5f6', branch: 'main', run: { id: 42, status: 'running', score: null, isIncremental: true, changedFileCount: 4, agentsRun: 3, agentsSkipped: 4, gateDecision: null, createdAt: new Date(Date.now() - 90 * 1000).toISOString(), completedAt: null, agents: [{ id: 'security', name: 'Security', icon: AGENT_ICONS.security, status: 'completed', score: 88, gate: 'WARN', findings: 2, durationMs: 14200, autoFixPR: null }, { id: 'bloat', name: 'Bloat', icon: AGENT_ICONS.bloat, status: 'running', score: null, gate: null, findings: 0, durationMs: null, autoFixPR: null }, { id: 'broken_code', name: 'Broken Code', icon: AGENT_ICONS.broken_code, status: 'queued', score: null, gate: null, findings: 0, durationMs: null, autoFixPR: null }, { id: 'architecture', name: 'Architecture', icon: AGENT_ICONS.architecture, status: 'skipped', score: null, gate: null, findings: 0, durationMs: null, autoFixPR: null, skippedReason: 'No architecture files changed' }, { id: 'compliance', name: 'Compliance', icon: AGENT_ICONS.compliance, status: 'skipped', score: null, gate: null, findings: 0, durationMs: null, autoFixPR: null, skippedReason: 'Scope: 4 files (no config/infra)' }, { id: 'data_dx', name: 'Data & DX', icon: AGENT_ICONS.data_dx, status: 'skipped', score: null, gate: null, findings: 0, durationMs: null, autoFixPR: null, skippedReason: 'No DB schema changes detected' }, { id: 'ai_era', name: 'AI Era', icon: AGENT_ICONS.ai_era, status: 'skipped', score: null, gate: null, findings: 0, durationMs: null, autoFixPR: null, skippedReason: 'Scope: backend only, no AI patterns' }] } },
  { sha: 'f9e8d7c6b5a4', message: 'fix: resolve N+1 query in user dashboard endpoint\n\nReplaces individual user.find() calls with a single batch query using\ndrizzle\'s inArray operator. Reduces dashboard load from ~200ms to ~8ms.', authorName: 'Kelvin Maina', authorAvatar: null, date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), htmlUrl: 'https://github.com/acme-corp/my-api/commit/f9e8d7c6b5a4', branch: 'main', run: { id: 41, status: 'completed', score: 94, isIncremental: true, changedFileCount: 2, agentsRun: 3, agentsSkipped: 4, gateDecision: 'PASS', createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000 - 2 * 60 * 1000).toISOString(), completedAt: new Date(Date.now() - 4 * 60 * 60 * 1000 + 8 * 60 * 1000).toISOString(), agents: [{ id: 'security', name: 'Security', icon: AGENT_ICONS.security, status: 'completed', score: 96, gate: 'PASS', findings: 0, durationMs: 12300, autoFixPR: null }, { id: 'bloat', name: 'Bloat', icon: AGENT_ICONS.bloat, status: 'completed', score: 100, gate: 'PASS', findings: 0, durationMs: 9800, autoFixPR: null }, { id: 'data_dx', name: 'Data & DX', icon: AGENT_ICONS.data_dx, status: 'completed', score: 85, gate: 'PASS', findings: 1, durationMs: 18400, autoFixPR: null }, { id: 'architecture', name: 'Architecture', icon: AGENT_ICONS.architecture, status: 'skipped', score: null, gate: null, findings: 0, durationMs: null, autoFixPR: null, skippedReason: 'No architecture files changed' }, { id: 'compliance', name: 'Compliance', icon: AGENT_ICONS.compliance, status: 'skipped', score: null, gate: null, findings: 0, durationMs: null, autoFixPR: null, skippedReason: 'Scope: 2 files (no config/infra)' }, { id: 'broken_code', name: 'Broken Code', icon: AGENT_ICONS.broken_code, status: 'skipped', score: null, gate: null, findings: 0, durationMs: null, autoFixPR: null, skippedReason: 'No high-risk patterns detected' }, { id: 'ai_era', name: 'AI Era', icon: AGENT_ICONS.ai_era, status: 'skipped', score: null, gate: null, findings: 0, durationMs: null, autoFixPR: null, skippedReason: 'Scope: DB query fix only' }] } },
  { sha: '3c4d5e6f7a8b', message: 'chore: bump stripe SDK to v14 and update webhook handlers', authorName: 'Sarah Chen', authorAvatar: null, date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), htmlUrl: 'https://github.com/acme-corp/my-api/commit/3c4d5e6f7a8b', branch: 'main', run: { id: 40, status: 'completed', score: 61, isIncremental: true, changedFileCount: 8, agentsRun: 5, agentsSkipped: 2, gateDecision: 'BLOCK', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 3 * 60 * 1000).toISOString(), completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 14 * 60 * 1000).toISOString(), agents: [{ id: 'security', name: 'Security', icon: AGENT_ICONS.security, status: 'completed', score: 42, gate: 'BLOCK', findings: 3, durationMs: 22400, autoFixPR: null }, { id: 'compliance', name: 'Compliance', icon: AGENT_ICONS.compliance, status: 'completed', score: 70, gate: 'WARN', findings: 2, durationMs: 14100, autoFixPR: null }, { id: 'bloat', name: 'Bloat', icon: AGENT_ICONS.bloat, status: 'completed', score: 88, gate: 'PASS', findings: 1, durationMs: 11200, autoFixPR: { number: 23, url: 'https://github.com/acme-corp/my-api/pull/23' } }, { id: 'broken_code', name: 'Broken Code', icon: AGENT_ICONS.broken_code, status: 'completed', score: 75, gate: 'PASS', findings: 1, durationMs: 16800, autoFixPR: null }, { id: 'data_dx', name: 'Data & DX', icon: AGENT_ICONS.data_dx, status: 'completed', score: 80, gate: 'PASS', findings: 0, durationMs: 13300, autoFixPR: null }, { id: 'architecture', name: 'Architecture', icon: AGENT_ICONS.architecture, status: 'skipped', score: null, gate: null, findings: 0, durationMs: null, autoFixPR: null, skippedReason: 'No structural changes' }, { id: 'ai_era', name: 'AI Era', icon: AGENT_ICONS.ai_era, status: 'skipped', score: null, gate: null, findings: 0, durationMs: null, autoFixPR: null, skippedReason: 'No AI patterns in scope' }] } },
  { sha: '9b8a7f6e5d4c', message: 'refactor: extract auth middleware into a shared utility module', authorName: 'Kelvin Maina', authorAvatar: null, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), htmlUrl: 'https://github.com/acme-corp/my-api/commit/9b8a7f6e5d4c', branch: 'main', run: { id: 39, status: 'completed', score: 89, isIncremental: true, changedFileCount: 5, agentsRun: 4, agentsSkipped: 3, gateDecision: 'PASS', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 2 * 60 * 1000).toISOString(), completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 11 * 60 * 1000).toISOString(), agents: [{ id: 'security', name: 'Security', icon: AGENT_ICONS.security, status: 'completed', score: 92, gate: 'PASS', findings: 0, durationMs: 13100, autoFixPR: null }, { id: 'bloat', name: 'Bloat', icon: AGENT_ICONS.bloat, status: 'completed', score: 78, gate: 'WARN', findings: 4, durationMs: 10400, autoFixPR: { number: 21, url: 'https://github.com/acme-corp/my-api/pull/21' } }, { id: 'broken_code', name: 'Broken Code', icon: AGENT_ICONS.broken_code, status: 'completed', score: 91, gate: 'PASS', findings: 0, durationMs: 12700, autoFixPR: null }, { id: 'architecture', name: 'Architecture', icon: AGENT_ICONS.architecture, status: 'completed', score: 88, gate: 'PASS', findings: 1, durationMs: 19600, autoFixPR: null }, { id: 'compliance', name: 'Compliance', icon: AGENT_ICONS.compliance, status: 'skipped', score: null, gate: null, findings: 0, durationMs: null, autoFixPR: null, skippedReason: 'No config changes' }, { id: 'data_dx', name: 'Data & DX', icon: AGENT_ICONS.data_dx, status: 'skipped', score: null, gate: null, findings: 0, durationMs: null, autoFixPR: null, skippedReason: 'No DB changes' }, { id: 'ai_era', name: 'AI Era', icon: AGENT_ICONS.ai_era, status: 'skipped', score: null, gate: null, findings: 0, durationMs: null, autoFixPR: null, skippedReason: 'No AI patterns' }] } },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
function shortSha(sha: string) { return sha.slice(0, 7); }
function firstLine(msg: string) { return msg.split('\n')[0]; }
function durationLabel(ms: number) { return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`; }

const GATE_STYLES: Record<string, string> = {
  PASS:  'bg-cw-green/10 text-cw-green border-cw-green/30',
  WARN:  'bg-cw-amber/10 text-cw-amber border-cw-amber/30',
  BLOCK: 'bg-cw-red/10  text-cw-red   border-cw-red/30',
};

const SEV_STYLE: Record<string, string> = {
  CRITICAL: 'bg-cw-red text-white',
  HIGH:     'bg-cw-red/80 text-white',
  MEDIUM:   'bg-cw-amber text-cw-bg',
  LOW:      'bg-cw-blue/70 text-white',
  INFO:     'bg-cw-bg3 text-cw-txt2',
};

const AGENT_STATUS_ICON = {
  completed: <CheckCircle2 size={12} className="text-cw-green" />,
  failed:    <XCircle     size={12} className="text-cw-red" />,
  skipped:   <Minus       size={12} className="text-cw-txt3" />,
  running:   <Loader2     size={12} className="text-cw-blue animate-spin" />,
  queued:    <Clock       size={12} className="text-cw-txt3" />,
};

// ─── Mock Side Panel ──────────────────────────────────────────────────────────

function MockRunDetailPanel({ runId, onClose }: { runId: number; onClose: () => void }) {
  const report = MOCK_RUN_REPORTS[runId];
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  if (!report) return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-cw-bdr flex items-center justify-between bg-cw-bg shrink-0">
        <span className="text-[15px] font-semibold text-cw-txt">Run Report</span>
        <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors border-none bg-transparent cursor-pointer"><X size={16} /></button>
      </div>
      <div className="flex-1 flex items-center justify-center text-[13px] text-cw-txt3">Run #{runId} — report loading when real endpoint wires up</div>
    </div>
  );

  const allFindings = report.agents.flatMap(a => a.findings);
  const runningAgents = report.agents.filter(a => a.status === 'running' || a.status === 'queued');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-cw-bdr bg-cw-bg shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-cw-bg3 border border-cw-bdr flex items-center justify-center">
            {report.status === 'running'
              ? <Loader2 size={13} className="text-cw-blue animate-spin" />
              : report.gateDecision === 'BLOCK' ? <AlertCircle size={13} className="text-cw-red" />
              : <BarChart2 size={13} className="text-cw-green" />}
          </div>
          <div>
            <span className="text-[14px] font-semibold text-cw-txt">Run #{report.runId}</span>
            <div className="text-[10px] text-cw-txt2 font-mono leading-none mt-0.5">{shortSha(report.commitSha)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {report.gateDecision && (
            <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${GATE_STYLES[report.gateDecision]}`}>{report.gateDecision}</span>
          )}
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors border-none bg-transparent cursor-pointer"><X size={15} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Score strip */}
        <div className="bg-cw-bg border-b border-cw-bdr px-5 py-4 grid grid-cols-4 gap-3">
          <div>
            <div className="text-[9px] font-bold text-cw-txt3 uppercase tracking-wide mb-1">Score</div>
            <div className={`text-[22px] font-bold ${report.overallScore == null ? 'text-cw-txt3' : report.overallScore >= 80 ? 'text-cw-green' : report.overallScore >= 60 ? 'text-cw-amber' : 'text-cw-red'}`}>
              {report.overallScore != null ? `${report.overallScore}/100` : '—'}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-bold text-cw-txt3 uppercase tracking-wide mb-1">Agents</div>
            <div className="text-[22px] font-bold text-cw-txt">{report.agents.filter(a => a.status !== 'skipped').length}</div>
          </div>
          <div>
            <div className="text-[9px] font-bold text-cw-txt3 uppercase tracking-wide mb-1">Findings</div>
            <div className="text-[22px] font-bold text-cw-txt">{allFindings.length}</div>
          </div>
          <div>
            <div className="text-[9px] font-bold text-cw-txt3 uppercase tracking-wide mb-1">Scope</div>
            <div className="text-[11px] text-cw-txt mt-1 font-medium">
              {report.isIncremental ? `${report.changedFiles.length} files` : 'Full repo'}
            </div>
          </div>
        </div>

        {/* In-progress notice */}
        {runningAgents.length > 0 && (
          <div className="mx-4 mt-4 p-3 bg-cw-blue/5 border border-cw-blue/20 rounded-lg flex items-center gap-2 text-[11px] text-cw-blue">
            <Loader2 size={12} className="animate-spin shrink-0" />
            <span>{runningAgents.map(a => a.displayName).join(', ')} still running — results will update</span>
          </div>
        )}

        {/* Escalated issues */}
        {report.escalatedIssues.length > 0 && (
          <div className="mx-4 mt-4 p-4 bg-cw-red/5 border border-cw-red/20 rounded-xl flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[11px] font-bold text-cw-red uppercase tracking-wide">
              <AlertTriangle size={13} /> Escalated to <Github size={13} /> GitHub ({report.escalatedIssues.length})
            </div>
            {report.escalatedIssues.map(issue => (
              <a key={issue.number} href={issue.url} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-[12px] text-cw-txt2 no-underline hover:text-cw-txt">
                <span className="font-mono text-cw-red">#{issue.number}</span>
                <span>{issue.title}</span>
                <ExternalLink size={10} className="ml-auto shrink-0 text-cw-txt3" />
              </a>
            ))}
          </div>
        )}

        {/* Changed files scope */}
        {report.changedFiles.length > 0 && (
          <div className="mx-4 mt-4 bg-cw-bg2 border border-cw-bdr rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 text-[10px] font-bold text-cw-txt3 uppercase tracking-wide border-b border-cw-bdr">
              {report.isIncremental ? 'Files in scope (incremental)' : 'Full repo scan'}
            </div>
            <div className="px-4 py-2 flex flex-wrap gap-1.5">
              {report.changedFiles.map(f => (
                <span key={f} className="text-[10px] font-mono bg-cw-bg3 border border-cw-bdr px-2 py-0.5 rounded text-cw-blue">{f}</span>
              ))}
            </div>
          </div>
        )}

        {/* Per-agent breakdown */}
        <div className="px-4 py-4 flex flex-col gap-3">
          {report.agents.map(agent => {
            const isExpanded = expandedAgent === agent.agentId;
            const hasContent = agent.findings.length > 0 || agent.toolsRun.length > 0;
            return (
              <div key={agent.agentId} className={`bg-cw-bg2 border rounded-xl overflow-hidden ${agent.gate === 'BLOCK' ? 'border-cw-red/30' : agent.gate === 'WARN' ? 'border-cw-amber/30' : 'border-cw-bdr'}`}>
                <button
                  onClick={() => hasContent && setExpandedAgent(isExpanded ? null : agent.agentId)}
                  className={`w-full flex items-center justify-between px-4 py-3 bg-transparent border-none transition-colors ${hasContent ? 'cursor-pointer hover:bg-cw-bg3/40' : 'cursor-default'} ${agent.status === 'skipped' ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    {hasContent ? (isExpanded ? <ChevronDown size={13} className="text-cw-txt3" /> : <ChevronRight size={13} className="text-cw-txt3" />) : <div className="w-[13px]" />}
                    <span className="text-[13px] font-bold text-cw-txt">{agent.displayName}</span>
                    {agent.gate && <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border uppercase ${GATE_STYLES[agent.gate]}`}>{agent.gate}</span>}
                    {agent.status === 'running' && <span className="flex items-center gap-1 text-[9px] font-bold text-cw-blue"><Loader2 size={8} className="animate-spin" /> Running</span>}
                    {agent.status === 'queued' && <span className="text-[9px] font-bold text-cw-txt3">Queued</span>}
                    {agent.status === 'skipped' && <span className="text-[10px] text-cw-txt3 italic">{agent.skippedReason}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-cw-txt2">
                    {agent.score != null && <span>Score: <span className="font-semibold text-cw-txt">{agent.score}/100</span></span>}
                    {agent.findings.length > 0 && <span className="text-cw-txt3">{agent.findings.length} finding{agent.findings.length > 1 ? 's' : ''}</span>}
                    {agent.durationMs && <span className="text-cw-txt3">{durationLabel(agent.durationMs)}</span>}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-cw-bdr">
                    {/* Auto-fix PR banner */}
                    {agent.autoFixPR && (
                      <a href={agent.autoFixPR.url} target="_blank" rel="noreferrer"
                        className={`flex items-center gap-2 px-4 py-2.5 border-b border-cw-bdr text-[11px] no-underline transition-colors ${agent.autoFixPR.guardianDecision === 'APPROVE' ? 'bg-cw-green/5 text-cw-green hover:bg-cw-green/10' : 'bg-cw-amber/5 text-cw-amber hover:bg-cw-amber/10'}`}>
                        <Github size={13} />
                        <span className="font-medium">Auto-fix PR #{agent.autoFixPR.number} — {agent.autoFixPR.fixedCount} fix{agent.autoFixPR.fixedCount > 1 ? 'es' : ''} — Guardian: {agent.autoFixPR.guardianDecision}</span>
                        <ExternalLink size={10} className="ml-auto shrink-0" />
                      </a>
                    )}

                    {/* Tools run */}
                    {agent.toolsRun.length > 0 && (
                      <div className="px-4 py-3 border-b border-cw-bdr flex flex-col gap-1.5">
                        <div className="text-[9px] font-bold text-cw-txt3 uppercase tracking-wide mb-1">Checks run</div>
                        {agent.toolsRun.map((t, i) => {
                          const isClean = /^(no|0|clean|passed)/i.test(t.result) || /\bclean\b/i.test(t.result);
                          const isWarn = /\b(warn|found|critical|high|issue)/i.test(t.result) && !isClean;
                          return (
                            <div key={i} className={`text-[10px] font-mono flex items-start gap-2 p-2 rounded border ${isClean ? 'bg-cw-green/5 border-cw-green/20 text-cw-green' : isWarn ? 'bg-cw-amber/5 border-cw-amber/20 text-cw-amber' : 'bg-cw-bg3 border-cw-bdr text-cw-txt2'}`}>
                              <span className="font-bold shrink-0">{t.name}</span>
                              <span className="opacity-60 shrink-0">({t.duration}ms)</span>
                              <span className="flex-1">{t.result}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Findings */}
                    {agent.findings.length > 0 && (
                      <div className="divide-y divide-cw-bg3">
                        {agent.findings.map((f, i) => (
                          <div key={i} className="px-4 py-3 flex flex-col gap-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${SEV_STYLE[f.severity] ?? 'bg-cw-bg3 text-cw-txt2'}`}>{f.severity}</span>
                                {f.category && <span className="text-[10px] text-cw-txt3 uppercase tracking-wide">{f.category}</span>}
                                <span className="text-[13px] font-medium text-cw-txt">{f.title}</span>
                              </div>
                              <span className={`shrink-0 px-2 py-0.5 text-[9px] font-bold rounded uppercase ${f.fixStatus === 'pr_opened' ? 'bg-cw-green/10 text-cw-green border border-cw-green/20' : f.fixStatus === 'dismissed' ? 'bg-cw-bg3 text-cw-txt3' : 'bg-cw-blue/10 text-cw-blue border border-cw-blue/20'}`}>
                                {f.fixStatus === 'pr_opened' ? 'PR Opened' : f.fixStatus === 'dismissed' ? 'Dismissed' : 'Suggested'}
                              </span>
                            </div>
                            <div className="text-[12px] text-cw-txt2">{f.description}</div>
                            {f.file && <div className="text-[10px] font-mono text-cw-blue">{f.file}{f.line ? `:${f.line}` : ''} <span className="text-cw-txt3 ml-2 non-mono">{f.toolName}</span></div>}
                            {f.suggestedFix && (
                              <div className="mt-1 flex items-start gap-2 text-[11px] bg-cw-amber/5 border border-cw-amber/20 rounded px-2.5 py-2">
                                <Wrench size={12} className="text-cw-amber shrink-0 mt-0.5" />
                                <div><span className="text-cw-amber font-bold">Fix: </span><span className="text-cw-txt">{f.suggestedFix}</span></div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Agent row inside expanded commit on timeline ─────────────────────────────

function AgentRow({ agent }: { agent: AgentResult }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 text-[11px] border-b border-cw-bg3 last:border-0 ${agent.status === 'skipped' ? 'opacity-50' : ''}`}>
      <div className="w-4 flex items-center justify-center shrink-0">{AGENT_STATUS_ICON[agent.status]}</div>
      <div className="flex items-center gap-1.5 w-[120px] shrink-0 text-cw-txt font-medium">
        <span className="text-cw-txt3">{agent.icon}</span>{agent.name}
      </div>
      {agent.status === 'skipped' ? (
        <span className="text-cw-txt3 italic text-[10px] flex-1">{agent.skippedReason ?? 'Skipped by orchestrator'}</span>
      ) : (
        <div className="flex items-center gap-3 flex-1">
          {agent.gate && <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase ${GATE_STYLES[agent.gate]}`}>{agent.gate}</span>}
          {agent.score != null && <span className="text-cw-txt2">Score: <span className="font-semibold text-cw-txt">{agent.score}/100</span></span>}
          {agent.findings > 0 && <span className="text-cw-txt3">{agent.findings} finding{agent.findings > 1 ? 's' : ''}</span>}
          {agent.durationMs != null && <span className="text-cw-txt3 ml-auto">{durationLabel(agent.durationMs)}</span>}
          {agent.autoFixPR && (
            <a href={agent.autoFixPR.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
              className="ml-2 flex items-center gap-1 text-cw-blue hover:text-cw-txt transition-colors no-underline text-[10px]">
              <GitPullRequest size={11} /> PR #{agent.autoFixPR.number} <ExternalLink size={9} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Single commit row ────────────────────────────────────────────────────────

function CommitRow({ commit, isLast, onOpenReport }: { commit: Commit; isLast: boolean; onOpenReport: (runId: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const run = commit.run;
  const scoreColor = run?.score == null ? 'text-cw-txt3' : run.score >= 80 ? 'text-cw-green' : run.score >= 60 ? 'text-cw-amber' : 'text-cw-red';

  return (
    <div className="relative flex gap-0">
      <div className="flex flex-col items-center w-10 shrink-0 pt-4">
        <div className={`w-3 h-3 rounded-full border-2 border-cw-bg shrink-0 z-10 ${!run ? 'bg-cw-bg3 border-cw-bdr' : run.status === 'running' ? 'bg-cw-blue animate-pulse' : run.status === 'queued' ? 'bg-cw-txt3' : run.gateDecision === 'PASS' ? 'bg-cw-green' : run.gateDecision === 'WARN' ? 'bg-cw-amber' : run.gateDecision === 'BLOCK' ? 'bg-cw-red' : 'bg-cw-txt3'}`} />
        {!isLast && <div className="w-[2px] flex-1 bg-cw-bdr mt-1" />}
      </div>

      <div className="flex-1 pb-4 min-w-0" style={{ marginTop: '8px' }}>
        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl overflow-hidden hover:border-cw-txt3/40 transition-colors">
          <div className="flex items-start gap-3 px-4 py-3.5 cursor-pointer" onClick={() => run && setExpanded(e => !e)}>
            <div className="mt-0.5 text-cw-txt3 shrink-0 w-4">
              {run ? (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <span className="text-[13px] font-semibold text-cw-txt leading-snug">{firstLine(commit.message)}</span>
                {run?.gateDecision && <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase ${GATE_STYLES[run.gateDecision]}`}>{run.gateDecision}</span>}
                {run?.status === 'running' && <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded bg-cw-blue/10 border border-cw-blue/30 text-cw-blue text-[9px] font-bold uppercase"><Loader2 size={8} className="animate-spin" /> Running</span>}
              </div>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[11px] text-cw-txt3">
                <a href={commit.htmlUrl ?? '#'} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="font-mono text-cw-blue hover:underline flex items-center gap-1"><GitCommit size={10} />{shortSha(commit.sha)}</a>
                <span>{commit.authorName}</span>
                <span>{timeAgo(commit.date)}</span>
                <span className="flex items-center gap-1"><Lock size={10} /> {commit.branch}</span>
                {run?.isIncremental && run.changedFileCount != null && <span className="px-1.5 py-0.5 rounded bg-cw-bg3 border border-cw-bdr text-[9px] font-medium">Incremental · {run.changedFileCount} file{run.changedFileCount !== 1 ? 's' : ''}</span>}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-2">
              {run?.score != null && <span className={`text-[18px] font-bold tabular-nums ${scoreColor}`}>{run.score}<span className="text-[11px] font-normal text-cw-txt3">/100</span></span>}
              {run?.status === 'completed' && (
                <button onClick={e => { e.stopPropagation(); onOpenReport(run.id); }}
                  className="px-3 py-1.5 text-[11px] font-semibold text-cw-blue border border-cw-blue/30 bg-cw-blue/5 rounded-lg hover:bg-cw-blue/10 transition-colors flex items-center gap-1.5 whitespace-nowrap">
                  Full report <ChevronRight size={11} />
                </button>
              )}
            </div>
          </div>

          {expanded && run && (
            <div className="border-t border-cw-bdr">
              <div className="px-4 py-2.5 bg-cw-bg flex items-center gap-4 text-[11px] border-b border-cw-bdr">
                <Bot size={12} className="text-cw-purple shrink-0" />
                <span className="text-cw-txt3">Orchestrator decision</span>
                <span className="text-cw-txt2"><span className="font-semibold text-cw-txt">{run.agentsRun}</span> agents ran · <span className="text-cw-txt3">{run.agentsSkipped} skipped</span>{run.changedFileCount != null && ` · ${run.changedFileCount} files in scope`}</span>
                {run.completedAt && <span className="ml-auto text-cw-txt3">Completed {timeAgo(run.completedAt)}</span>}
              </div>
              <div className="divide-y divide-cw-bg3">
                {run.agents.map(agent => <AgentRow key={agent.id} agent={agent} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function CommitHistory({ repoFullName = 'acme-corp / my-api', onBack }: Props) {
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);

  return (
    <div className="flex h-full overflow-hidden bg-cw-bg">
      {/* ── LEFT: Timeline ── */}
      <div className={`flex flex-col min-w-0 ${selectedRunId ? 'w-[55%]' : 'flex-1'} transition-all duration-300`}>
        <div className="px-6 py-4 border-b border-cw-bdr bg-cw-bg shrink-0 flex items-center gap-4">
          <button onClick={onBack} className="w-8 h-8 rounded-full border border-cw-bdr bg-cw-bg2 flex items-center justify-center text-cw-txt3 hover:text-cw-txt hover:bg-cw-bg3 transition-colors shrink-0"><ArrowLeft size={16} /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[18px] font-bold text-cw-txt leading-none">Commit History</h1>
            <div className="text-[12px] text-cw-txt2 mt-1 font-mono">{repoFullName}</div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-cw-txt3 bg-cw-bg2 border border-cw-bdr px-3 py-1.5 rounded-lg">
            <Info size={12} /> Mock data — real endpoint ready
          </div>
          <button className="w-8 h-8 rounded-md border border-cw-bdr bg-cw-bg2 flex items-center justify-center text-cw-txt3 hover:text-cw-txt hover:bg-cw-bg3 transition-colors"><RefreshCw size={14} /></button>
        </div>

        <div className="px-6 py-3 border-b border-cw-bdr bg-cw-bg flex items-center gap-5 text-[10px] text-cw-txt3 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-cw-green" /> PASS gate</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-cw-amber" /> WARN gate</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-cw-red" /> BLOCK gate</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-cw-blue animate-pulse" /> Running now</div>
          <div className="ml-auto flex items-center gap-1.5"><AlertTriangle size={10} className="text-cw-amber" /> Skipped = orchestrator chose not to run for this scope</div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="max-w-3xl mx-auto">
            {MOCK_COMMITS.map((commit, i) => (
              <CommitRow
                key={commit.sha}
                commit={commit}
                isLast={i === MOCK_COMMITS.length - 1}
                onOpenReport={runId => setSelectedRunId(prev => prev === runId ? null : runId)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Mock Run Detail side-pull ── */}
      {selectedRunId != null ? (
        <div className="w-[45%] shrink-0 border-l border-cw-bdr bg-cw-bg2 flex flex-col h-full overflow-hidden shadow-2xl animate-in slide-in-from-right duration-300">
          <MockRunDetailPanel runId={selectedRunId} onClose={() => setSelectedRunId(null)} />
        </div>
      ) : (
        <div className="hidden lg:flex flex-col items-center justify-center w-[30%] shrink-0 border-l border-cw-bdr text-cw-txt3 gap-3 bg-cw-bg">
          <GitCommit size={32} className="opacity-30" />
          <p className="text-[13px]">Click <strong className="text-cw-txt">Full report</strong> on any completed run</p>
          <p className="text-[11px] text-cw-txt3">The full agent breakdown will slide in here</p>
        </div>
      )}
    </div>
  );
}
