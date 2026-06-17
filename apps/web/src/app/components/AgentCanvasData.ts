export interface AgentLog {
  t: string;
  type: 'info' | 'tool' | 'pass' | 'fail' | 'warn';
  msg: string;
}

export interface AgentFinding {
  sev: 'critical' | 'high' | 'medium' | 'info';
  title: string;
  desc: string;
}

export interface SandboxOp {
  icon: string;
  active: boolean;
  done: boolean;
  name: string;
  status: string;
}

export interface AgentSummary {
  criticals: number;
  highs: number;
  mediums: number;
  fixed: number;
  linesRemoved: number;
  duration: string;
}

export interface AgentData {
  id: string;
  name: string;
  icon: string;
  model: string;
  status: 'passed' | 'blocked' | 'running' | 'idle';
  score: number | null;
  label: string;
  statusText: string;
  progress: number;
  color: string;
  metrics: { t: string; c: string }[];
  logs: AgentLog[];
  config: Record<string, string>;
  findings: AgentFinding[];
  sandbox: SandboxOp[];
  summary: AgentSummary;
}

export const agentCanvasData: AgentData[] = [
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    icon: 'CpuIcon',
    model: 'sonnet-4-6',
    status: 'passed',
    score: null,
    label: 'CEO Agent',
    statusText: 'Gate decision: BLOCK — 1 critical',
    progress: 100,
    color: '#8B5CF6',
    metrics: [{ t: 'Gate: BLOCK', c: 'red' }, { t: '5 agents run', c: 'purple' }, { t: '4m 18s', c: '' }],
    logs: [
      { t: '00:00', type: 'info', msg: 'Webhook received · commit abc1234 · PR #103' },
      { t: '00:01', type: 'tool', msg: 'read_repo_config() → strictMode: true, highStakes: [payments, auth]' },
      { t: '00:02', type: 'tool', msg: 'analyse_commit_diff() → riskProfile: HIGH · touches: [payments, api]' },
      { t: '00:02', type: 'info', msg: 'Dispatching 5 agents in parallel' },
      { t: '00:03', type: 'tool', msg: 'spawn_agent(security, HIGH priority)' },
      { t: '00:03', type: 'tool', msg: 'spawn_agent(bloat, normal priority)' },
      { t: '00:03', type: 'tool', msg: 'spawn_agent(broken_code, HIGH priority)' },
      { t: '00:03', type: 'tool', msg: 'spawn_agent(architecture, normal priority)' },
      { t: '04:15', type: 'tool', msg: 'await_agent_results() → all 5 agents completed' },
      { t: '04:16', type: 'tool', msg: 'aggregate_results() → weightedScore: 72 · 1 CRITICAL' },
      { t: '04:17', type: 'fail', msg: 'Hard rule triggered: CRITICAL finding → gateDecision = BLOCK' },
      { t: '04:18', type: 'tool', msg: 'post_github_check_run(status=completed, conclusion=failure)' },
      { t: '04:18', type: 'pass', msg: 'Orchestrator run complete · rationale written' },
    ],
    config: { model: 'claude-sonnet-4-6', trigger: 'webhook/push', mode: 'parallel-dispatch', timeout: '600s', strictMode: 'true', highStakes: 'payments,auth', agentsDispatched: '5', parallelPhases: '1' },
    findings: [],
    sandbox: [],
    summary: { criticals: 1, highs: 2, mediums: 4, fixed: 2, linesRemoved: 38, duration: '4m 18s' }
  },
  {
    id: 'security',
    name: 'Security Agent',
    icon: 'Shield01Icon',
    model: 'haiku-4-5',
    status: 'blocked',
    score: 45,
    label: '18 checks',
    statusText: '1 critical: Stripe key line 14',
    progress: 100,
    color: '#dc2626',
    metrics: [{ t: '1 critical', c: 'red' }, { t: '2 high', c: 'amber' }, { t: 'Score: 45', c: 'red' }],
    logs: [
      { t: '00:03', type: 'info', msg: 'Security Agent started · repoPath: /tmp/sandbox/abc1234' },
      { t: '00:03', type: 'tool', msg: 'search_memory(repoId) → 0 prior dismissals' },
      { t: '00:04', type: 'tool', msg: 'run_trufflehog(repoPath, scanHistory=true)' },
      { t: '00:18', type: 'fail', msg: 'CRITICAL: Verified active Stripe key · src/webhooks/stripe.ts:14' },
      { t: '00:18', type: 'info', msg: 'truffleHog: sk-live-xxxx · verified=true (Stripe API 200)' },
      { t: '00:19', type: 'tool', msg: 'run_trivy(filesystem) → scanning 67 dependencies' },
      { t: '00:34', type: 'warn', msg: 'HIGH: CVE-2024-4367 · pdfjs-dist@3.4.120 · fix: upgrade to 3.11.174' },
      { t: '00:35', type: 'tool', msg: 'check_auth_on_routes(baseUrl) → probing 14 endpoints' },
      { t: '00:52', type: 'warn', msg: 'HIGH: /api/admin/users returns 200 with no auth token' },
      { t: '01:04', type: 'tool', msg: 'check_rate_limiting([/api/login, /api/signup]) → 100 requests' },
      { t: '01:12', type: 'info', msg: 'Rate limit OK: 429 fired after 5 requests on /api/login' },
      { t: '01:13', type: 'tool', msg: 'check_crypto_patterns(repoPath) → scanning AST' },
      { t: '01:20', type: 'pass', msg: 'No deprecated crypto algorithms found' },
      { t: '01:21', type: 'tool', msg: 'scan_nhi_tokens(repoPath) → checking K8s, CI configs' },
      { t: '01:30', type: 'pass', msg: 'NHI scan: no unrotated long-lived tokens' },
      { t: '01:31', type: 'tool', msg: 'write_memory(repoId, summary)' },
      { t: '01:32', type: 'fail', msg: 'gateDecision=BLOCK · score=45 · 1 critical, 2 high' },
    ],
    config: { model: 'claude-haiku-4-5', maxSteps: '20', tools: 'trufflehog,trivy,owasp-zap,auth-probe', timeout: '300s', outputSchema: 'SecurityAgentResult', constitution: 'evidence-or-silence' },
    findings: [
      { sev: 'critical', title: 'Active Stripe secret key', desc: 'src/webhooks/stripe.ts:14 · verified active by truffleHog · must rotate immediately' },
      { sev: 'high', title: 'CVE-2024-4367 in pdfjs-dist', desc: 'pdfjs-dist@3.4.120 · arbitrary JS execution · fix: upgrade to 3.11.174' },
      { sev: 'high', title: 'Unprotected admin endpoint', desc: '/api/admin/users returns 200 with no auth header · expects 401' },
      { sev: 'info', title: 'Rate limiting: OK', desc: '/api/login returns 429 after 5 requests · correctly configured' },
    ],
    sandbox: [
      { icon: 'Lock01Icon', active: true, done: true, name: 'truffleHog v3', status: 'Scanned 847 files + 234 commits' },
      { icon: 'Shield01Icon', active: false, done: true, name: 'Trivy CVE scan', status: '67 deps · 1 CVE found' },
      { icon: 'Bug02Icon', active: false, done: true, name: 'OWASP ZAP', status: '14 routes probed · 1 unprotected' },
      { icon: 'Key01Icon', active: false, done: true, name: 'NHI token scan', status: 'No unrotated tokens' },
    ],
    summary: { criticals: 1, highs: 2, mediums: 0, fixed: 0, linesRemoved: 0, duration: '1m 32s' }
  },
  {
    id: 'bloat',
    name: 'Bloat Agent',
    icon: 'Delete01Icon',
    model: 'haiku-4-5',
    status: 'passed',
    score: 88,
    label: 'Fallow + AST',
    statusText: '2 duplicates removed · −38 lines',
    progress: 100,
    color: '#d97706',
    metrics: [{ t: '2 dupes removed', c: 'green' }, { t: '−38 lines', c: 'purple' }, { t: 'Score: 88', c: '' }],
    logs: [
      { t: '00:03', type: 'info', msg: 'Bloat Agent started · using Fallow (Rust) + tree-sitter' },
      { t: '00:04', type: 'tool', msg: 'search_memory(repoId, "bloat") → 1 prior dismissal loaded' },
      { t: '00:04', type: 'tool', msg: 'run_fallow_dead_code(repoPath, entryPoints=[src/index.ts])' },
      { t: '00:05', type: 'warn', msg: 'Dead export: formatCurrency · src/utils/format.ts:14 · 0 references' },
      { t: '00:05', type: 'tool', msg: 'check_dynamic_imports(repoPath, "formatCurrency")' },
      { t: '00:06', type: 'pass', msg: 'No dynamic imports found · confirmed dead · safe to remove' },
      { t: '00:06', type: 'tool', msg: 'run_fallow_duplicates(repoPath, mode=mild)' },
      { t: '00:07', type: 'warn', msg: 'Clone family: validateWebhookSignature() ≈ verifySignature() · 87% similarity' },
      { t: '00:07', type: 'tool', msg: 'read_file(src/webhooks/stripe.ts:45, src/utils/crypto.js:28)' },
      { t: '00:08', type: 'warn', msg: 'Confirmed: semantically identical · 23 lines removable' },
      { t: '00:08', type: 'tool', msg: 'run_fallow_complexity(repoPath) → threshold: cyclomatic>10' },
      { t: '00:09', type: 'pass', msg: 'No functions exceed complexity threshold' },
      { t: '00:09', type: 'tool', msg: 'check_dependency_usage(repoPath) → scanning package.json' },
      { t: '00:10', type: 'warn', msg: 'Unused: lodash@4.17.21 · never imported · 71kb bundle savings' },
      { t: '00:11', type: 'tool', msg: 'run_fallow_health(repoPath) → overall score: 88/100 (grade B)' },
      { t: '00:11', type: 'tool', msg: 'Auto-fix: applying refactors · running test suite to verify' },
      { t: '00:18', type: 'pass', msg: 'Tests pass after refactor: 142/142 · committing to branch' },
      { t: '00:19', type: 'pass', msg: 'gateDecision=PASS · score=88 · 2 auto-fixes applied' },
    ],
    config: { model: 'claude-haiku-4-5', tools: 'fallow-cli,tree-sitter,bundle-analyser', astLanguages: 'ts,js,py', maxSteps: '20', autoFix: 'true', fallowMode: 'mild' },
    findings: [
      { sev: 'medium', title: 'Dead export: formatCurrency', desc: 'src/utils/format.ts:14 · 0 references · no dynamic imports · auto-removed' },
      { sev: 'medium', title: 'Duplicate: validateWebhookSignature()', desc: '87% similar to verifySignature() at utils/crypto.js:28 · 23 lines merged · auto-fixed' },
      { sev: 'medium', title: 'Unused dependency: lodash', desc: 'package.json · never imported · 71kb bundle savings · manual removal suggested' },
      { sev: 'info', title: 'Fallow health score: 88/100 (B)', desc: 'Dead code: 91 · Duplication: 87 · Complexity: 96' },
    ],
    sandbox: [
      { icon: 'File01Icon', active: false, done: true, name: 'Fallow dead code', status: '1 dead export found' },
      { icon: 'Copy01Icon', active: false, done: true, name: 'Fallow duplicates', status: '1 clone family · 87% match' },
      { icon: 'ChartBarLineIcon', active: false, done: true, name: 'Fallow complexity', status: 'All functions within threshold' },
      { icon: 'PackageIcon', active: false, done: true, name: 'Dependency audit', status: '1 unused: lodash · 71kb' },
    ],
    summary: { criticals: 0, highs: 0, mediums: 3, fixed: 2, linesRemoved: 38, duration: '0m 19s' }
  },
  {
    id: 'broken_code',
    name: 'Broken Code Agent',
    icon: 'Bug02Icon',
    model: 'haiku-4-5',
    status: 'passed',
    score: 100,
    label: 'Karpathy loop',
    statusText: '142/142 tests passing · 84% cov',
    progress: 100,
    color: '#16a34a',
    metrics: [{ t: '142/142 tests', c: 'green' }, { t: '84% cov', c: 'green' }, { t: 'Score: 100', c: 'green' }],
    logs: [
      { t: '00:03', type: 'info', msg: 'Broken Code Agent started · Karpathy loop enabled (max 3 retries)' },
      { t: '00:03', type: 'tool', msg: 'run_test_suite(npm test, timeout=300s)' },
      { t: '01:45', type: 'pass', msg: 'Test suite: 142/142 passed · 84% coverage · 48s runtime' },
      { t: '01:46', type: 'tool', msg: 'run_migration_down(drizzle migrate:down)' },
      { t: '01:52', type: 'pass', msg: 'Migration rollback: success · schema reverted cleanly' },
      { t: '01:53', type: 'tool', msg: 'scan_async_patterns(repoPath) → checking await/catch coverage' },
      { t: '01:58', type: 'warn', msg: 'MEDIUM: 3 await calls without try/catch · src/api/payments.ts:88,102,117' },
      { t: '01:58', type: 'tool', msg: 'scan_swallowed_errors(repoPath)' },
      { t: '02:04', type: 'pass', msg: 'No empty catch blocks found' },
      { t: '02:05', type: 'tool', msg: 'check_api_timeouts(repoPath, [axios, fetch])' },
      { t: '02:10', type: 'warn', msg: 'MEDIUM: fetch() at src/api/webhook.ts:34 has no timeout configured' },
      { t: '02:11', type: 'tool', msg: 'run_heap_profiler(60s sustained load)' },
      { t: '03:15', type: 'pass', msg: 'Heap: start 42MB → end 44MB (+2MB) · no leak detected' },
      { t: '03:16', type: 'tool', msg: 'run_flaky_detector(10 runs) · targeting async tests' },
      { t: '04:02', type: 'pass', msg: '10/10 runs consistent · no flaky tests detected' },
      { t: '04:03', type: 'pass', msg: 'gateDecision=PASS · score=100 · no critical findings' },
    ],
    config: { model: 'claude-haiku-4-5', karpathyMaxRetries: '3', tools: 'jest,heap-profiler,async-ast-scan', testCommand: 'npm test', migrationCmd: 'drizzle-kit migrate:down', flakyRuns: '10' },
    findings: [
      { sev: 'medium', title: '3 await calls missing try/catch', desc: 'src/api/payments.ts:88,102,117 · unhandled rejections risk' },
      { sev: 'medium', title: 'fetch() without timeout', desc: 'src/api/webhook.ts:34 · worker hang risk on external failure' },
      { sev: 'info', title: 'Test suite: 142/142 passed', desc: '48s runtime · 84% coverage · 10 flaky runs: 0 failures' },
      { sev: 'info', title: 'Migration rollback: clean', desc: 'Down migration succeeded · schema reverts safely' },
    ],
    sandbox: [
      { icon: 'Testing01Icon', active: false, done: true, name: 'Test suite (Jest)', status: '142/142 · 84% coverage' },
      { icon: 'Database01Icon', active: false, done: true, name: 'Migration rollback', status: 'Reverted cleanly' },
      { icon: 'Activity01Icon', active: false, done: true, name: 'Heap profiler', status: '+2MB over 60s · no leak' },
      { icon: 'Refresh01Icon', active: false, done: true, name: 'Flaky detector (10×)', status: '0/10 non-deterministic' },
    ],
    summary: { criticals: 0, highs: 0, mediums: 2, fixed: 0, linesRemoved: 0, duration: '4m 03s' }
  },
  {
    id: 'architecture',
    name: 'Architecture Agent',
    icon: 'Structure01Icon',
    model: 'haiku-4-5',
    status: 'passed',
    score: 91,
    label: 'k6 + EXPLAIN',
    statusText: '1 N+1 found · p99 284ms',
    progress: 100,
    color: '#2563eb',
    metrics: [{ t: '1 N+1', c: 'amber' }, { t: 'p99: 284ms', c: 'green' }, { t: 'Score: 91', c: '' }],
    logs: [
      { t: '00:03', type: 'info', msg: 'Architecture Agent started · k6 load test + EXPLAIN ANALYZE' },
      { t: '00:04', type: 'tool', msg: 'trace_import_graph(repoPath) → building module dependency graph' },
      { t: '00:07', type: 'pass', msg: 'Import graph: no circular dependencies (84 modules)' },
      { t: '00:08', type: 'tool', msg: 'instrument_query_counter(baseUrl) → attaching middleware' },
      { t: '00:12', type: 'warn', msg: 'N+1 detected: GET /api/users fires 14 queries (threshold: 5)' },
      { t: '00:12', type: 'tool', msg: 'run_explain_analyze(databaseUrl, [SELECT * FROM profiles WHERE...])' },
      { t: '00:14', type: 'warn', msg: 'SeqScan on profiles table (1,247 rows) · missing index on user_id' },
      { t: '00:15', type: 'tool', msg: 'check_unbounded_results(baseUrl) → seeding 10k rows' },
      { t: '00:28', type: 'pass', msg: 'GET /api/users: pagination present · returns max 50 rows' },
      { t: '00:29', type: 'tool', msg: 'measure_cold_start(repoPath) → cold boot timing' },
      { t: '00:36', type: 'pass', msg: 'Cold start: 1.2s · well under 5s serverless threshold' },
      { t: '00:37', type: 'tool', msg: 'run_k6_load_test(baseUrl, 1×=50vus, 2×=100vus, 30s each)' },
      { t: '01:40', type: 'pass', msg: '1× load: p99=148ms · error rate 0% · stable' },
      { t: '01:41', type: 'pass', msg: '2× load: p99=284ms · error rate 0.02% · graceful 503 at 140vus' },
      { t: '01:42', type: 'pass', msg: 'gateDecision=PASS · score=91 · 1 medium finding' },
    ],
    config: { model: 'claude-haiku-4-5', tools: 'k6,pg-explain,import-tracer,query-counter', n1Threshold: '5', p99ThresholdMs: '500', loadTestVus: '50,100', coldStartThresholdMs: '5000' },
    findings: [
      { sev: 'medium', title: 'N+1: GET /api/users (14 queries)', desc: '1 user list + 13 profile lookups · fix: JOIN or eager-load profiles' },
      { sev: 'medium', title: 'Missing index: profiles.user_id', desc: 'EXPLAIN ANALYZE: SeqScan on 1,247 rows · CREATE INDEX idx_profiles_user_id' },
      { sev: 'info', title: 'Load test: p99 284ms @ 2× traffic', desc: '100 VUs · error rate 0.02% · graceful 503 shed at 140 VUs' },
      { sev: 'info', title: 'Cold start: 1.2s', desc: 'Well under 5s serverless threshold' },
    ],
    sandbox: [
      { icon: 'Database01Icon', active: false, done: true, name: 'Query counter', status: 'N+1 on /api/users · 14 queries' },
      { icon: 'ZoomInIcon', active: false, done: true, name: 'EXPLAIN ANALYZE', status: 'SeqScan · missing index found' },
      { icon: 'FlashIcon', active: false, done: true, name: 'k6 load test', status: 'p99 284ms · 2× traffic · stable' },
      { icon: 'Clock01Icon', active: false, done: true, name: 'Cold start timer', status: '1.2s · under threshold' },
    ],
    summary: { criticals: 0, highs: 0, mediums: 2, fixed: 0, linesRemoved: 0, duration: '1m 42s' }
  },
  {
    id: 'ai_era',
    name: 'AI-Era Agent',
    icon: 'BrainIcon',
    model: 'sonnet-4-6',
    status: 'passed',
    score: 94,
    label: '18 AI checks',
    statusText: 'No injection · RAG fresh',
    progress: 100,
    color: '#16a34a',
    metrics: [{ t: 'No injection', c: 'green' }, { t: 'RAG fresh', c: 'green' }, { t: 'Score: 94', c: 'green' }],
    logs: [
      { t: '00:03', type: 'info', msg: 'AI-Era Agent started · adversarial-first mode' },
      { t: '00:04', type: 'tool', msg: 'check_model_version_lock(repoPath) → scanning for hardcoded model IDs' },
      { t: '00:06', type: 'pass', msg: 'No hardcoded model IDs found · using env var: MODEL_ID' },
      { t: '00:07', type: 'tool', msg: 'check_token_spend_controls(repoPath) → checking max_tokens' },
      { t: '00:09', type: 'pass', msg: 'All 3 LLM call sites have max_tokens set (1000, 4096, 2000)' },
      { t: '00:10', type: 'tool', msg: 'validate_llm_output_schemas(repoPath) → AST scan' },
      { t: '00:13', type: 'pass', msg: 'All LLM responses parsed through Zod schema · no raw trust' },
      { t: '00:14', type: 'tool', msg: 'inject_prompt_payloads(baseUrl, /api/chat) → 7 payloads' },
      { t: '00:28', type: 'pass', msg: 'Injection payload 1/7: no override behavior observed' },
      { t: '00:42', type: 'pass', msg: 'Injection payload 7/7: all 7 payloads rejected correctly' },
      { t: '00:43', type: 'tool', msg: 'check_system_prompt_leakage(baseUrl) → 4 extraction attempts' },
      { t: '00:51', type: 'pass', msg: 'System prompt extraction: all 4 attempts returned generic response' },
      { t: '00:52', type: 'tool', msg: 'check_vector_index_freshness(pgvector) → comparing source vs embeddings' },
      { t: '00:58', type: 'pass', msg: 'Vector index: 2,847 embeddings · 0 orphaned · 0 missing · age 2h' },
      { t: '00:59', type: 'pass', msg: 'gateDecision=PASS · score=94 · no critical findings' },
    ],
    config: { model: 'claude-sonnet-4-6', adversarialPayloads: '7', tools: 'prompt-injector,vector-checker,pii-scanner', ragProvider: 'pgvector', maxSteps: '18' },
    findings: [
      { sev: 'info', title: 'Prompt injection: all 7 payloads rejected', desc: '/api/chat correctly ignores all override attempts' },
      { sev: 'info', title: 'System prompt: no leakage', desc: '4 extraction attempts returned generic responses' },
      { sev: 'info', title: 'Vector index: fresh', desc: '2,847 embeddings · 0 orphaned · last updated 2h ago' },
      { sev: 'info', title: 'LLM output schemas: validated', desc: 'All 3 call sites parse through Zod · no raw trust' },
    ],
    sandbox: [
      { icon: 'InjectionIcon', active: false, done: true, name: 'Prompt injector', status: '7/7 payloads rejected' },
      { icon: 'BrainIcon', active: false, done: true, name: 'System prompt probe', status: 'No leakage detected' },
      { icon: 'VectorIcon', active: false, done: true, name: 'Vector freshness', status: '2,847 embeddings current' },
      { icon: 'ViewOffIcon', active: false, done: true, name: 'PII scanner', status: 'No PII in LLM context' },
    ],
    summary: { criticals: 0, highs: 0, mediums: 0, fixed: 0, linesRemoved: 0, duration: '0m 59s' }
  },
  {
    id: 'guardian',
    name: 'Guardian Agent',
    icon: 'GitPullRequestIcon',
    model: 'sonnet-4-6',
    status: 'running',
    score: null,
    label: 'GitHub-facing',
    statusText: 'Posting inline comments…',
    progress: 65,
    color: '#ec4899',
    metrics: [{ t: '4 comments', c: 'purple' }, { t: '2 issues', c: 'amber' }, { t: 'Posting…', c: '' }],
    logs: [
      { t: '04:18', type: 'info', msg: 'Guardian Agent triggered · pipeline complete · reading results' },
      { t: '04:18', type: 'tool', msg: 'get_pull_request(repoId, 103) → reading diff, title, reviewers' },
      { t: '04:19', type: 'tool', msg: 'search_memory(repoId, "guardian") → 0 prior dismissals' },
      { t: '04:19', type: 'tool', msg: 'list_issues(repoId) → checking for existing open issues' },
      { t: '04:20', type: 'info', msg: '0 duplicate issues found · safe to create new' },
      { t: '04:20', type: 'tool', msg: 'post_initial_status_comment(updated) → replacing "running" with results' },
      { t: '04:21', type: 'tool', msg: 'add_pr_review_comment(stripe.ts:14) → CRITICAL: Active secret key' },
      { t: '04:21', type: 'pass', msg: 'Inline comment posted on diff line 14 · thread open' },
      { t: '04:22', type: 'tool', msg: 'add_pr_review_comment(payments.ts:88) → MEDIUM: await no try/catch' },
      { t: '04:22', type: 'tool', msg: 'add_pr_review_comment(webhook.ts:34) → MEDIUM: fetch no timeout' },
      { t: '04:23', type: 'tool', msg: 'create_issue(CRITICAL: Rotate Stripe key) → assigning to kelvinmaina01' },
      { t: '04:23', type: 'pass', msg: 'Issue #104 created · labels: codeward:security, priority:critical' },
      { t: '04:24', type: 'tool', msg: 'create_issue(HIGH: Missing index profiles.user_id) → assigning' },
      { t: '04:24', type: 'pass', msg: 'Issue #105 created · labels: codeward:architecture, priority:high' },
      { t: '04:25', type: 'info', msg: 'Composing formal PR review · event=REQUEST_CHANGES' },
    ],
    config: { model: 'claude-sonnet-4-6', trustMode: 'full_sandbox', autoIssues: 'true', formalReview: 'true', inlineComments: 'true', replyToComments: 'true' },
    findings: [
      { sev: 'critical', title: 'Inline comment: stripe.ts:14', desc: 'Active Stripe key · posted on exact diff line · thread open' },
      { sev: 'medium', title: 'Inline comment: payments.ts:88', desc: 'await without try/catch · 3 instances flagged' },
      { sev: 'info', title: 'Issue #104 created', desc: 'CRITICAL: Rotate Stripe key · assigned to kelvinmaina01' },
      { sev: 'info', title: 'Issue #105 created', desc: 'HIGH: Missing index · assigned to kelvinmaina01' },
    ],
    sandbox: [
      { icon: 'Message01Icon', active: true, done: false, name: 'Inline comments', status: '4 of 5 posted · working…' },
      { icon: 'PlusSignCircleIcon', active: false, done: true, name: 'Issue creation', status: '2 issues created (#104, #105)' },
      { icon: 'GitPullRequestIcon', active: false, done: false, name: 'Formal PR review', status: 'Composing…' },
      { icon: 'LabelIcon', active: false, done: true, name: 'Auto-labelling', status: '4 labels applied' },
    ],
    summary: { criticals: 1, highs: 1, mediums: 2, fixed: 2, linesRemoved: 38, duration: 'running' }
  },
  {
    id: 'compliance',
    name: 'Compliance Agent',
    icon: 'BalanceIcon',
    model: 'sonnet-4-6',
    status: 'idle',
    score: null,
    label: 'Daily 00:00 UTC',
    statusText: 'Scheduled · next run in 6h',
    progress: 0,
    color: '#8B5CF6',
    metrics: [{ t: 'Daily schedule', c: 'purple' }, { t: 'Next: 6h', c: '' }, { t: 'Last: clean', c: 'green' }],
    logs: [
      { t: '--', type: 'info', msg: 'Compliance Agent · scheduled trigger only' },
      { t: '--', type: 'info', msg: 'Not triggered on this push · no auth/data/logging changes detected' },
      { t: '--', type: 'info', msg: 'Last run: 2026-06-16 00:00 UTC · result: CLEAN · score 96/100' },
      { t: '--', type: 'info', msg: 'Next scheduled run: 2026-06-17 00:00 UTC (in 6h 14m)' },
      { t: '--', type: 'info', msg: 'Findings from last run: 0 critical, 0 high, 1 medium (consent version)' },
    ],
    config: { model: 'claude-sonnet-4-6', trigger: 'daily-cron 0 0 * * *', alsoPushTrigger: 'auth,data,logging,ai', tools: 'wcag-axe,rtbf-check,consent-version,audit-log', schedule: 'daily' },
    findings: [
      { sev: 'info', title: 'Last run: 96/100 · clean', desc: '2026-06-16 00:00 UTC · 0 critical · 0 high' },
      { sev: 'medium', title: 'Consent version (prior run)', desc: 'Old consent terms used for new analytics purposes · tracked in Issue #98' },
    ],
    sandbox: [],
    summary: { criticals: 0, highs: 0, mediums: 1, fixed: 0, linesRemoved: 0, duration: 'scheduled' }
  },
  {
    id: 'chat',
    name: 'Chat Agent',
    icon: 'Message01Icon',
    model: 'sonnet-4-6',
    status: 'idle',
    score: null,
    label: 'Always-on sidebar',
    statusText: 'Ready · spawn any agent',
    progress: 0,
    color: '#ec4899',
    metrics: [{ t: 'Always on', c: 'purple' }, { t: 'Sidebar', c: '' }, { t: 'Interactive', c: 'green' }],
    logs: [
      { t: '--', type: 'info', msg: 'Chat Agent · always-on · waiting for developer queries' },
      { t: '--', type: 'info', msg: 'Connected to run #247 results · ready to explain findings' },
      { t: '--', type: 'info', msg: 'Tools: query_run_history, spawn_agent, read_any_repo, explain_debt_item' },
      { t: '--', type: 'info', msg: 'Last query: "Why is my PR blocked?" → answered from Security Agent results' },
    ],
    config: { model: 'claude-sonnet-4-6', trigger: 'always-on', streaming: 'true', tools: 'query_history,spawn_agent,read_repo,explain_finding,dismiss_finding', maxHistory: '50' },
    findings: [],
    sandbox: [],
    summary: { criticals: 0, highs: 0, mediums: 0, fixed: 0, linesRemoved: 0, duration: 'always-on' }
  }
];
