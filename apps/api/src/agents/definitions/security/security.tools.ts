import { z } from 'zod';

/**
 * ----------------------------------------------------------------------------
 * TOOL 1: run_trufflehog
 * Purpose: Scan the entire repo AND git history for secrets, tokens, API keys, certificates.
 * ----------------------------------------------------------------------------
 */
export const runTrufflehogTool = {
  description: 'Scan the entire repo AND git history for secrets, tokens, API keys, certificates. ALWAYS call this first.',
  parameters: z.object({
    repoPath: z.string().describe('Absolute path to cloned repo'),
    scanHistory: z.boolean().describe('true = scan all git commits, false = working tree only'),
    severity: z.enum(['CRITICAL', 'HIGH', 'ALL']).optional().describe('Filter output severity'),
  }),
  execute: async (args: { repoPath: string; scanHistory: boolean; severity?: "CRITICAL" | "HIGH" | "ALL" }) => {
    console.log(`[Tool] run_trufflehog called for ${args.repoPath}`);
    // Mock implementation for scaffold
    return {
      found: false,
      secrets: [] as any[]
    };
  }
};

/**
 * ----------------------------------------------------------------------------
 * TOOL 2: run_trivy
 * Purpose: Scan npm/pip/cargo/gem lockfiles for known CVEs. Also scans Docker images.
 * ----------------------------------------------------------------------------
 */
export const runTrivyTool = {
  description: 'Scan npm/pip/cargo/gem lockfiles for known CVEs. Also scans Docker images if present. Call second after truffleHog.',
  parameters: z.object({
    repoPath: z.string(),
    scanType: z.enum(['filesystem', 'image']),
    imageRef: z.string().optional().describe('Only if scanType = image'),
    severityFilter: z.array(z.string()).describe('e.g. ["CRITICAL", "HIGH"]')
  }),
  execute: async (args: any) => {
    return { vulnerabilities: [] as any[] };
  }
};

/**
 * ----------------------------------------------------------------------------
 * TOOL 3: run_owasp_zap
 * Purpose: Dynamic security scan against the RUNNING app in the sandbox.
 * ----------------------------------------------------------------------------
 */
export const runOwaspZapTool = {
  description: 'Dynamic security scan against the RUNNING app in the sandbox. Checks OWASP Top 10.',
  parameters: z.object({
    targetUrl: z.string().describe('e.g. "http://localhost:3000"'),
    scanMode: z.enum(['passive', 'active']),
    scope: z.array(z.string()).describe('URL patterns to include, e.g. ["/api/*"]')
  }),
  execute: async (args: any) => {
    return { alerts: [] as any[] };
  }
};

/**
 * ----------------------------------------------------------------------------
 * TOOL 4: check_auth_on_routes
 * Purpose: Fire HTTP requests to every API route with NO auth token. Expect 401.
 * ----------------------------------------------------------------------------
 */
export const checkAuthOnRoutesTool = {
  description: 'Fire HTTP requests to every API route with NO auth token. Expect 401. Flag any route that returns 200.',
  parameters: z.object({
    baseUrl: z.string(),
    routes: z.array(z.object({ method: z.string(), path: z.string() })),
    authHeader: z.string().optional().describe('the header name to omit, e.g. "Authorization"')
  }),
  execute: async (args: any) => {
    return { unprotectedRoutes: [] as any[] };
  }
};

/**
 * ----------------------------------------------------------------------------
 * TOOL 5: check_rate_limiting
 * Purpose: Fire 100 rapid requests at auth-sensitive endpoints. Expect 429.
 * ----------------------------------------------------------------------------
 */
export const checkRateLimitingTool = {
  description: 'Fire 100 rapid requests at auth-sensitive endpoints. Expect 429. Flag if not rate-limited.',
  parameters: z.object({
    baseUrl: z.string(),
    endpoints: z.array(z.string()).describe('e.g. ["/api/login"]'),
    requestCount: z.number().default(100),
    intervalMs: z.number().default(10)
  }),
  execute: async (args: any) => {
    return { results: [] as any[] };
  }
};

/**
 * ----------------------------------------------------------------------------
 * TOOL 6: check_rls_policies
 * Purpose: Query Supabase/Postgres information schema to verify Row-Level Security.
 * ----------------------------------------------------------------------------
 */
export const checkRlsPoliciesTool = {
  description: 'Query Supabase/Postgres information schema to verify Row-Level Security is enabled on every user-facing table.',
  parameters: z.object({
    databaseUrl: z.string(),
    schemaName: z.string().default('public')
  }),
  execute: async (args: any) => {
    return { tables: [] as any[] };
  }
};

/**
 * ----------------------------------------------------------------------------
 * TOOL 7: scan_for_sqli_patterns
 * Purpose: Static AST scan for raw string concatenation in SQL queries.
 * ----------------------------------------------------------------------------
 */
export const scanForSqliPatternsTool = {
  description: 'Static AST scan for raw string concatenation in SQL queries. Complements OWASP ZAP.',
  parameters: z.object({
    repoPath: z.string(),
    languages: z.array(z.string())
  }),
  execute: async (args: any) => {
    return { findings: [] as any[] };
  }
};

/**
 * ----------------------------------------------------------------------------
 * TOOL 8: check_sbom_integrity
 * Purpose: Verify Software Bill of Materials.
 * ----------------------------------------------------------------------------
 */
export const checkSbomIntegrityTool = {
  description: 'Verify Software Bill of Materials — ensure no unvetted third-party scripts or GitHub Actions with excessive permissions.',
  parameters: z.object({
    repoPath: z.string(),
    checkWorkflows: z.boolean(),
    checkNpmScripts: z.boolean()
  }),
  execute: async (args: any) => {
    return { findings: [] as any[] };
  }
};

/**
 * ----------------------------------------------------------------------------
 * TOOL 9: probe_ssrf_endpoints
 * Purpose: Test all URL-accepting inputs for SSRF.
 * ----------------------------------------------------------------------------
 */
export const probeSsrfEndpointsTool = {
  description: 'Test all URL-accepting inputs for SSRF by attempting to reach internal cloud metadata endpoints.',
  parameters: z.object({
    baseUrl: z.string(),
    urlInputEndpoints: z.array(z.object({ path: z.string(), paramName: z.string() })),
    payloads: z.array(z.string())
  }),
  execute: async (args: any) => {
    return { vulnerableEndpoints: [] as any[] };
  }
};

/**
 * ----------------------------------------------------------------------------
 * TOOL 10: check_multitenant_isolation
 * Purpose: Verify every query against shared tables includes a mandatory tenant_id filter.
 * ----------------------------------------------------------------------------
 */
export const checkMultitenantIsolationTool = {
  description: 'In B2B apps, verify every query against shared tables includes a mandatory tenant_id or org_id filter.',
  parameters: z.object({
    repoPath: z.string(),
    sharedTables: z.array(z.string()),
    tenantIdColumn: z.string()
  }),
  execute: async (args: any) => {
    return { violations: [] as any[] };
  }
};

/**
 * ----------------------------------------------------------------------------
 * TOOL 11: scan_ci_logs_for_leaks
 * Purpose: Scan CI/CD pipeline logs and configs for leaked secrets.
 * ----------------------------------------------------------------------------
 */
export const scanCiLogsForLeaksTool = {
  description: 'Scan CI/CD pipeline logs and configs for accidentally leaked secrets or poisoned pipeline vulnerabilities.',
  parameters: z.object({
    repoPath: z.string(),
    ciPlatform: z.enum(['github_actions', 'gitlab_ci', 'jenkins', 'auto_detect'])
  }),
  execute: async (args: any) => {
    return { findings: [] as any[] };
  }
};

/**
 * ----------------------------------------------------------------------------
 * TOOL 12: check_mfa_on_destructive_routes
 * Purpose: Attempt to hit admin/delete/payment routes WITHOUT step-up authentication.
 * ----------------------------------------------------------------------------
 */
export const checkMfaOnDestructiveRoutesTool = {
  description: 'Attempt to hit admin/delete/payment routes WITHOUT step-up authentication. Flag if accessible.',
  parameters: z.object({
    baseUrl: z.string(),
    sensitiveRoutes: z.array(z.object({ method: z.string(), path: z.string(), category: z.string() })),
    sessionToken: z.string()
  }),
  execute: async (args: any) => {
    return { vulnerableRoutes: [] as any[] };
  }
};

/**
 * ----------------------------------------------------------------------------
 * TOOL 13: check_crypto_patterns
 * Purpose: AST scan for deprecated cryptographic algorithms and hardcoded IVs/salts.
 * ----------------------------------------------------------------------------
 */
export const checkCryptoPatternsTool = {
  description: 'AST scan for deprecated cryptographic algorithms and hardcoded IVs/salts.',
  parameters: z.object({
    repoPath: z.string(),
    patterns: z.array(z.string())
  }),
  execute: async (args: any) => {
    return { findings: [] as any[] };
  }
};

/**
 * ----------------------------------------------------------------------------
 * TOOL 14: test_error_information_leakage
 * Purpose: Fuzz endpoints to trigger 500 errors to check for stack traces.
 * ----------------------------------------------------------------------------
 */
export const testErrorInformationLeakageTool = {
  description: 'Fuzz endpoints to trigger 500 errors. Check responses for stack traces, env vars, or system paths (CWE-209).',
  parameters: z.object({
    baseUrl: z.string(),
    endpoints: z.array(z.string()),
    payloads: z.array(z.string())
  }),
  execute: async (args: any) => {
    return { leakingEndpoints: [] as any[] };
  }
};

/**
 * ----------------------------------------------------------------------------
 * TOOL 15: check_business_logic_bypass
 * Purpose: Attempt to access "success" pages without completing prerequisites.
 * ----------------------------------------------------------------------------
 */
export const checkBusinessLogicBypassTool = {
  description: 'Attempt to access "success" or post-payment pages directly without completing prerequisite steps.',
  parameters: z.object({
    baseUrl: z.string(),
    protectedPages: z.array(z.object({ path: z.string(), prerequisitePath: z.string(), description: z.string() }))
  }),
  execute: async (args: any) => {
    return { bypassablePages: [] as any[] };
  }
};

/**
 * ----------------------------------------------------------------------------
 * TOOL 16: scan_nhi_tokens
 * Purpose: Scan K8s configs, cloud configs, and CI environment for long-lived service tokens.
 * ----------------------------------------------------------------------------
 */
export const scanNhiTokensTool = {
  description: 'Scan K8s configs, cloud configs, and CI environment for long-lived service tokens and unrotated PATs.',
  parameters: z.object({
    repoPath: z.string(),
    checkKubernetes: z.boolean(),
    checkCloudConfigs: z.boolean(),
    checkGitHubActions: z.boolean()
  }),
  execute: async (args: any) => {
    return { findings: [] as any[] };
  }
};

/**
 * ----------------------------------------------------------------------------
 * TOOL 17: grep_search
 * Purpose: General-purpose grep with regex.
 * ----------------------------------------------------------------------------
 */
export const grepSearchTool = {
  description: 'General-purpose grep with regex. Use to verify specific patterns before asserting a finding.',
  parameters: z.object({
    repoPath: z.string(),
    pattern: z.string(),
    fileGlob: z.string().optional(),
    maxResults: z.number().optional()
  }),
  execute: async (args: any) => {
    return { matches: [] as any[] };
  }
};

/**
 * ----------------------------------------------------------------------------
 * TOOL 18: read_file
 * Purpose: Read a specific file for context.
 * ----------------------------------------------------------------------------
 */
export const readFileTool = {
  description: 'Read a specific file for context. Use to understand why a finding exists before assigning severity.',
  parameters: z.object({
    filePath: z.string(),
    startLine: z.number().optional(),
    endLine: z.number().optional()
  }),
  execute: async (args: any) => {
    return { content: '', totalLines: 0 };
  }
};

/**
 * ----------------------------------------------------------------------------
 * TOOL 19: search_memory
 * Purpose: Check if the team has previously reviewed and dismissed a finding.
 * ----------------------------------------------------------------------------
 */
export const searchMemoryTool = {
  description: 'Check if the team has previously reviewed and dismissed a similar finding.',
  parameters: z.object({
    repoId: z.string(),
    findingType: z.string(),
    filePath: z.string().optional()
  }),
  execute: async (args: any) => {
    return { memories: [] as any[] };
  }
};

/**
 * ----------------------------------------------------------------------------
 * TOOL 20: write_memory
 * Purpose: Write a memory after completing the run.
 * ----------------------------------------------------------------------------
 */
export const writeMemoryTool = {
  description: 'Write a memory after completing the run — for the team\'s future reference and for agent learning.',
  parameters: z.object({
    repoId: z.string(),
    agentType: z.enum(['security']),
    memoryType: z.enum(['finding_pattern', 'false_positive', 'team_decision']),
    summary: z.string(),
    confidence: z.number()
  }),
  execute: async (args: any) => {
    return { success: true };
  }
};
