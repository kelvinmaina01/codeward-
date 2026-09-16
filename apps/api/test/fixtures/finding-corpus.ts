/**
 * Labeled regression corpus for the finding policy engine.
 *
 * Every case is a finding shaped exactly as Codeward's agents actually emit one, paired with
 * the disposition the product requires. This is the ground truth that makes "did that prompt
 * change help or hurt?" an answerable question instead of a matter of taste.
 *
 * Dispositions:
 *   BLOCK    — genuinely severe, strongly evidenced; must stop the merge
 *   SURFACE  — worth a developer's attention, but must NOT block on its own
 *   SUPPRESS — must never reach GitHub (noise, unprovable, or already dismissed)
 */

import type { RawFinding } from '../../src/agents/policy/finding-policy.js';

export type ExpectedDisposition = 'BLOCK' | 'SURFACE' | 'SUPPRESS';

export interface CorpusCase {
  id: string;
  /** What this case is testing, in plain words — shown on failure. */
  rationale: string;
  expect: ExpectedDisposition;
  finding: RawFinding;
}

export const FINDING_CORPUS: CorpusCase[] = [
  // ---------------------------------------------------------------------------
  // Obvious critical vulnerabilities — the recall floor. Missing these is fatal.
  // ---------------------------------------------------------------------------
  {
    id: 'tp-live-aws-key',
    rationale: 'A live AWS key committed to source, found by a deterministic scanner.',
    expect: 'BLOCK',
    finding: {
      severity: 'CRITICAL', category: 'SECRETS', confidence: 'HIGH',
      title: 'Live AWS access key committed to source',
      description: 'A valid AWS access key id and secret are hardcoded in the S3 client constructor and are used by production upload traffic. Anyone with read access to the repository can assume this key.',
      file: 'src/lib/s3-client.ts', line: 14,
      toolName: 'gitleaks',
      rawEvidence: 'gitleaks: aws-access-key-id detected at src/lib/s3-client.ts:14 — AKIA****************, entropy 4.8, verified active against sts:GetCallerIdentity',
      suggestedFix: 'Revoke the key in IAM, move it to an environment variable, and purge it from git history.',
    },
  },
  {
    id: 'tp-sql-injection',
    rationale: 'String-concatenated SQL on a reachable request parameter.',
    expect: 'BLOCK',
    finding: {
      severity: 'CRITICAL', category: 'INJECTION', confidence: 'HIGH',
      title: 'SQL injection in user search endpoint',
      description: 'The q query parameter is concatenated directly into a raw SQL string with no parameterization. GET /api/users?q=1%27%20OR%20%271%27=%271 returns every row in the users table.',
      file: 'src/routes/users.ts', line: 88,
      toolName: 'semgrep',
      rawEvidence: "semgrep rule javascript.lang.security.audit.sqli.node-postgres-sqli: db.query(`SELECT * FROM users WHERE name LIKE '%${req.query.q}%'`) at src/routes/users.ts:88",
      suggestedFix: 'Use a parameterized query: db.query("SELECT * FROM users WHERE name LIKE $1", [`%${q}%`]).',
    },
  },
  {
    id: 'tp-auth-bypass',
    rationale: 'JWT signature verification disabled on the auth middleware.',
    expect: 'BLOCK',
    finding: {
      severity: 'CRITICAL', category: 'AUTH', confidence: 'HIGH',
      title: 'JWT signature verification disabled',
      description: 'The auth middleware calls jwt.decode() instead of jwt.verify(), so any client can forge a token with an arbitrary sub claim and authenticate as any user, including admins.',
      file: 'src/middleware/auth.ts', line: 31,
      toolName: 'check_auth_patterns',
      rawEvidence: 'check_auth_patterns: src/middleware/auth.ts:31 uses jwt.decode(token) with no signature check; no call to jwt.verify anywhere in the request path.',
      suggestedFix: 'Replace jwt.decode(token) with jwt.verify(token, process.env.JWT_SECRET).',
    },
  },

  // ---------------------------------------------------------------------------
  // Real but subtle — the cases a naive precision push would wrongly silence.
  // ---------------------------------------------------------------------------
  {
    id: 'tp-subtle-rls-dropped',
    rationale: 'Migration drops an RLS policy the application still depends on. Subtle, but provable and severe.',
    expect: 'BLOCK',
    finding: {
      severity: 'HIGH', category: 'RLS', confidence: 'HIGH',
      title: 'Migration drops tenant isolation policy still relied on by query layer',
      description: 'Migration 0042 drops the tenant_isolation row-level security policy on the documents table, but src/db/documents.ts still issues unscoped selects that assumed RLS filtered by tenant. After this migration any tenant reads every tenant\'s documents.',
      file: 'drizzle/0042_drop_policy.sql', line: 3,
      toolName: 'check_rls_policies',
      rawEvidence: 'check_rls_policies: DROP POLICY tenant_isolation ON documents; — documents table has 4 unscoped select call-sites (src/db/documents.ts:22,41,77,103) with no explicit tenant_id predicate.',
      suggestedFix: 'Keep the policy, or add an explicit tenant_id predicate to every documents query.',
    },
  },
  {
    id: 'tp-subtle-tenant-leak',
    rationale: 'Missing tenant predicate on a shared table — quiet, high impact, tool-confirmed.',
    expect: 'BLOCK',
    finding: {
      severity: 'HIGH', category: 'MULTITENANT', confidence: 'HIGH',
      title: 'Invoice lookup missing organization scope',
      description: 'getInvoiceById selects by primary key alone with no organizationId predicate, so an authenticated user of org A can read org B invoices by guessing sequential ids.',
      file: 'src/services/billing.ts', line: 204,
      toolName: 'check_multitenant_isolation',
      rawEvidence: 'check_multitenant_isolation: shared table "invoices" accessed at src/services/billing.ts:204 via where(eq(invoices.id, id)) with no organizationId predicate; ids are sequential integers.',
      suggestedFix: 'Add and(eq(invoices.id, id), eq(invoices.organizationId, ctx.orgId)) to the where clause.',
    },
  },

  // ---------------------------------------------------------------------------
  // Severe claim, insufficient support — must reach a human, must not block.
  // ---------------------------------------------------------------------------
  {
    id: 'amb-ssrf-weak-evidence',
    rationale: 'Plausible SSRF but the agent produced no tool output to back it. Worth a comment, not a merge block.',
    expect: 'SURFACE',
    finding: {
      severity: 'HIGH', category: 'SSRF',
      title: 'User-supplied URL passed to server-side fetch',
      description: 'The webhook registration endpoint forwards the callbackUrl field to fetch() on the server without host allowlisting.',
      file: 'src/routes/webhooks.ts',
    },
  },
  {
    id: 'amb-hedged-high-severity',
    rationale: 'High severity with tool evidence but the agent hedged on whether it is real — comment, never a gate.',
    expect: 'SURFACE',
    finding: {
      severity: 'HIGH', category: 'CRYPTO', confidence: 'HIGH',
      title: 'Weak hashing algorithm in password path',
      description: 'The password helper appears to be using SHA-1. It is possible that this path is only used for legacy migration, which could not be confirmed from the available code.',
      file: 'src/lib/password.ts', line: 12,
      toolName: 'semgrep',
      rawEvidence: 'semgrep: node.lang.security.audit.crypto.weak-hash at src/lib/password.ts:12 — createHash("sha1")',
    },
  },

  // ---------------------------------------------------------------------------
  // Suspicious-looking but legitimate — the classic false positive generators.
  // ---------------------------------------------------------------------------
  {
    id: 'fp-secret-in-test-fixture',
    rationale: 'A fake key in a test fixture, already dismissed by agent memory. Re-flagging it is how trust dies.',
    expect: 'SUPPRESS',
    finding: {
      severity: 'CRITICAL', category: 'SECRETS',
      title: 'Hardcoded API key in test fixture',
      description: 'An API key literal appears in the auth test fixture.',
      file: 'test/fixtures/auth.fixture.ts', line: 7,
      toolName: 'trufflehog',
      rawEvidence: 'trufflehog: generic-api-key at test/fixtures/auth.fixture.ts:7 — sk-test-0000000000000000',
      dismissed: true,
      dismissalReason: 'Dummy value inside a test fixture; not a live credential. Dismissed by the team on run #812.',
    },
  },
  {
    id: 'fp-eval-unreachable',
    rationale: 'Pattern match on eval() with no proof the path is reachable, described in explicitly theoretical terms.',
    expect: 'SUPPRESS',
    finding: {
      severity: 'HIGH', category: 'INJECTION',
      title: 'Use of eval in template helper',
      description: 'This call could potentially be dangerous if an attacker were able to control the template string. Unable to confirm whether any caller passes untrusted input.',
      file: 'src/lib/template.ts', line: 55,
    },
  },
  {
    id: 'fp-hallucinated-no-location',
    rationale: 'A confident critical claim with no file at all — the model asserting something it cannot point to.',
    expect: 'SUPPRESS',
    finding: {
      severity: 'CRITICAL', category: 'AUTH', confidence: 'HIGH',
      title: 'Authentication can likely be bypassed somewhere in the middleware chain',
      description: 'The application appears to have a flaw in how sessions are validated.',
    },
  },
  {
    id: 'fp-critical-no-evidence',
    rationale: 'Critical severity asserted with no tool output and no line — severity inflation without support.',
    expect: 'SUPPRESS',
    finding: {
      severity: 'CRITICAL', category: 'BUSINESS_LOGIC',
      title: 'Possible privilege escalation in role assignment',
      description: 'The role assignment logic may be vulnerable to escalation.',
      file: 'src/services/roles.ts',
    },
  },

  // ---------------------------------------------------------------------------
  // Style / best-practice / low-severity noise — never a GitHub interruption.
  // ---------------------------------------------------------------------------
  {
    id: 'noise-naming',
    rationale: 'Variable naming preference. Pure taste.',
    expect: 'SUPPRESS',
    finding: {
      severity: 'LOW', category: 'NAMING',
      title: 'Variable name "d" is not descriptive',
      description: 'Consider renaming d to elapsedDays for readability.',
      file: 'src/utils/date.ts', line: 9,
      toolName: 'run_fallow_complexity',
      rawEvidence: 'fallow: identifier "d" length 1 at src/utils/date.ts:9 — below configured readability threshold',
    },
  },
  {
    id: 'noise-style-high-severity-claim',
    rationale: 'A style issue dressed up as HIGH severity. Category must win over the model severity.',
    expect: 'SUPPRESS',
    finding: {
      severity: 'HIGH', category: 'STYLE', confidence: 'HIGH',
      title: 'Inconsistent quote style across module',
      description: 'This file mixes single and double quotes.',
      file: 'src/routes/index.ts', line: 3,
      toolName: 'eslint',
      rawEvidence: 'eslint quotes: 23 occurrences of inconsistent quote style in src/routes/index.ts',
    },
  },
  {
    id: 'noise-missing-docs',
    rationale: 'Missing JSDoc. Informational at best.',
    expect: 'SUPPRESS',
    finding: {
      severity: 'INFO', category: 'DOCUMENTATION',
      title: 'Exported function lacks JSDoc',
      description: 'formatCurrency is exported without a doc comment.',
      file: 'src/utils/format.ts', line: 4,
      toolName: 'check_documentation_drift',
      rawEvidence: 'check_documentation_drift: exported symbol formatCurrency has no preceding doc comment at src/utils/format.ts:4',
    },
  },
  {
    id: 'noise-dead-code',
    rationale: 'Dead code is real product value on the dashboard, but it is not a PR interruption.',
    expect: 'SUPPRESS',
    finding: {
      severity: 'MEDIUM', category: 'DEAD_CODE',
      title: 'Unused export: legacyFormatDate',
      description: 'legacyFormatDate is exported but has no importers.',
      file: 'src/utils/date.ts', line: 41,
      toolName: 'run_fallow_dead_code',
      rawEvidence: 'fallow dead-code: export legacyFormatDate at src/utils/date.ts:41 has 0 importers across 412 scanned modules',
    },
  },
  // ---------------------------------------------------------------------------
  // Exposure: transitive dependency advisories must be REPORTED but never BLOCK.
  // These are drawn verbatim from run #102, which blocked a pull request on four
  // devDependency CVEs — the exact behaviour that makes engineers uninstall the product.
  // ---------------------------------------------------------------------------
  {
    id: 'advisory-brace-expansion-dos',
    rationale: 'Real HIGH-severity DoS, but in a nested build-time dependency. Report it; never block a merge on it.',
    expect: 'SURFACE',
    finding: {
      severity: 'HIGH', category: 'CVE', confidence: 'HIGH', exposure: 'TRANSITIVE',
      title: 'brace-expansion: DoS via unbounded expansion length',
      description: 'brace-expansion resolves as a nested dependency of the test tooling. No first-party file imports it and it never executes in a production code path.',
      file: 'package-lock.json', line: null,
      toolName: 'run_npm_audit',
      cveId: 'GHSA-mh99-v99m-4gvg',
      rawEvidence: 'npm audit: brace-expansion <=2.0.1 — Uncontrolled Resource Consumption. Path: node_modules/.pnpm/test-runner/node_modules/brace-expansion. dev: true',
      suggestedFix: 'Run npm audit fix, or wait for the parent devDependency to bump its range.',
    },
  },
  {
    id: 'advisory-js-yaml-inferred',
    rationale: 'Same class, but the agent omitted `exposure`. Inference from category + lockfile path must still classify it as an advisory.',
    expect: 'SURFACE',
    finding: {
      severity: 'HIGH', category: 'CVE', confidence: 'HIGH',
      title: 'js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources',
      description: 'js-yaml is pulled in transitively by the build pipeline; the parser is never handed untrusted input at runtime.',
      file: 'pnpm-lock.yaml', line: null,
      toolName: 'run_npm_audit',
      cveId: 'GHSA-2883-xcg3-v3hh',
      rawEvidence: 'npm audit: js-yaml — CPU exhaustion via crafted merge keys. Path: node_modules/.pnpm/js-yaml. dev: true',
    },
  },
  {
    id: 'tp-direct-dependency-rce',
    rationale: 'A CVE in a PRODUCTION dependency with a named importing file. Reachable, so it must still block.',
    expect: 'BLOCK',
    finding: {
      severity: 'CRITICAL', category: 'CVE', confidence: 'HIGH', exposure: 'DIRECT',
      title: 'Remote code execution in production template renderer',
      description: 'The vulnerable render() entry point is called from src/routes/render.ts:44 with request-controlled template input on every page render, so the published exploit works against this deployment as written.',
      file: 'src/routes/render.ts', line: 44,
      toolName: 'run_npm_audit',
      cveId: 'GHSA-aaaa-bbbb-cccc',
      rawEvidence: 'npm audit: template-engine 2.1.0 — RCE via template injection. dependencies (production). Imported at src/routes/render.ts:44.',
      suggestedFix: 'Upgrade template-engine to 2.1.4.',
    },
  },
  {
    id: 'noise-refactor-suggestion',
    rationale: 'Generic best-practice advice with no concrete defect.',
    expect: 'SUPPRESS',
    finding: {
      severity: 'MEDIUM', category: 'BEST_PRACTICE',
      title: 'Function exceeds recommended length',
      description: 'Consider refactoring processOrder into smaller units.',
      file: 'src/services/orders.ts', line: 120,
      toolName: 'run_fallow_complexity',
      rawEvidence: 'fallow: processOrder cyclomatic complexity 14, length 96 lines at src/services/orders.ts:120',
    },
  },
];

/**
 * Accumulation guard: a pile of medium-severity findings must never add up to a block.
 * Kept separate from the corpus because it is a property of the gate, not of one finding.
 */
export const ACCUMULATION_CASE: RawFinding[] = Array.from({ length: 12 }, (_, i) => ({
  severity: 'MEDIUM',
  category: 'CODE_SMELL',
  title: `Moderate maintainability issue #${i + 1}`,
  description: 'A moderate issue detected by static analysis.',
  file: `src/module-${i}.ts`,
  line: 10 + i,
  toolName: 'run_fallow_health',
  rawEvidence: `fallow health: module-${i} maintainability index 61 (threshold 65), 3 contributing factors listed`,
}));
