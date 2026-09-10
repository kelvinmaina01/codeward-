export type FindingCategory =
  | 'SECRETS' | 'CVE' | 'AUTH' | 'INJECTION' | 'CRYPTO'
  | 'SUPPLY_CHAIN' | 'RATE_LIMIT' | 'RLS' | 'SSRF' | 'MULTITENANT'
  | 'MFA' | 'CI_CD' | 'ERROR_LEAKAGE' | 'BUSINESS_LOGIC' | 'NHI'
  | 'DEAD_CODE' | 'UNUSED_DEPS' | 'ARCHITECTURE';

const CATEGORY_TASK_TEMPLATES: Record<FindingCategory, string> = {
  SECRETS: `
1. Confirm this is a REAL secret, not a placeholder/example value or a
   test fixture. Check if it's referenced from .env.example, a mock, or
   a *.test.* / *.spec.* / fixtures/ file — if so, this may be a false
   positive; note that in your summary instead of rotating anything.
2. If it IS a real, live secret:
   a. Treat it as compromised. Do not just delete it from this file —
      the value may already be exposed in git history.
   b. Remove the hardcoded value and replace it with an environment
      variable read (process.env.X or equivalent for this stack).
   c. Add the variable name (NOT the value) to .env.example.
   d. Flag prominently in your summary that this secret must be ROTATED
      at its source (the provider dashboard) and that git history should
      be scrubbed (e.g. via git filter-repo or BFG) — you cannot do this
      part yourself, just make sure the human sees this instruction.
3. Do not commit the real secret value anywhere, including in your
   summary or commit message.`.trim(),

  CVE: `
1. Identify the vulnerable package and version from the finding.
2. Check if a patched version exists (npm view <package> versions, or
   check the advisory for a fixed version range).
3. If a safe upgrade exists and is within the same major version (or a
   major bump with no breaking API usage in this repo — verify by
   checking the package's changelog against how it's actually used
   here), apply it.
4. If the only fix requires a major version bump with breaking changes,
   do NOT silently upgrade — document the tradeoff in your summary and
   let the human decide.
5. Run the test suite after upgrading. A passing suite does not
   guarantee no behavioral change for an untested code path — say so if
   test coverage on the affected package's usage looks thin.`.trim(),

  AUTH: `
1. Read the flagged code in full context — do not fix based on the
   evidence snippet alone, open the actual file and surrounding logic.
2. Identify what's actually wrong: missing auth check, weak session
   handling, overly permissive CORS, insecure JWT validation (e.g.
   accepting "alg: none", missing expiry check, missing signature
   verification).
3. Apply the fix using this codebase's EXISTING auth patterns/middleware
   — search for how auth is handled elsewhere in the repo first, don't
   introduce a new auth mechanism for one route.
4. Add or extend a test that would have caught this specific gap (e.g.
   a request without a valid token hitting this route should now fail).
5. Do not weaken auth elsewhere while fixing this — if the fix requires
   touching shared middleware, call out every other route affected by
   that change in your summary.`.trim(),

  INJECTION: `
1. Confirm untrusted input actually reaches this code path — trace where
   the value flagged in evidence originates (request body/query/params,
   not a hardcoded constant). If it's not reachable by untrusted input,
   note that as a likely false positive instead of "fixing" dead code.
2. If it IS reachable: replace string concatenation/interpolation into
   the query/command with parameterized queries or the ORM's safe query
   builder (check what this repo already uses elsewhere — do not
   introduce a new query pattern for one fix).
3. Do NOT fix by merely escaping or sanitizing input as a substitute for
   parameterization — sanitization-only fixes are a common way this bug
   class quietly returns later. Parameterize.
4. Add a test with a deliberately malicious-shaped input value
   confirming the query executes safely.`.trim(),

  CRYPTO: `
1. Identify the specific deprecated/weak primitive flagged (e.g. MD5,
   SHA1 for security purposes, ECB mode, a hardcoded IV/salt, a
   non-cryptographic RNG used for security-sensitive values).
2. Replace with the modern equivalent appropriate to the actual use
   case (password hashing needs bcrypt/argon2/scrypt, NOT just a
   stronger hash function like SHA256 — general hashing and password
   hashing are different problems, don't conflate them).
3. If this touches stored data (e.g. changing a password hash scheme),
   do NOT break existing stored values — implement this as a migration
   path (verify against old scheme on login, re-hash with new scheme on
   success) rather than a hard cutover, unless the repo has no
   production data yet.
4. Confirm no hardcoded keys/IVs/salts remain — these must be
   generated per-use or per-record, never constant.`.trim(),

  SUPPLY_CHAIN: `
1. Review the specific supply-chain issue (e.g. missing lockfile
   integrity, an overly permissive GitHub Actions workflow permission,
   an unpinned action version using @main/@master instead of a SHA).
2. For GitHub Actions: pin third-party actions to a full commit SHA, not
   a tag (tags can be moved by the action's maintainer). Reduce
   \`permissions:\` in the workflow to the minimum the job actually needs.
3. For lockfile/dependency issues: ensure a lockfile is committed and
   CI uses \`npm ci\` / equivalent (not \`npm install\`) so builds are
   reproducible and can't silently pull a newer, unreviewed dependency.
4. Do not add new CI permissions or dependencies while "fixing" this —
   the goal is reducing surface area, not adding to it.`.trim(),

  RATE_LIMIT: `
1. Identify the specific route/endpoint missing rate limiting.
2. Check if this repo already has a rate-limiting middleware/library in
   use elsewhere — reuse that pattern rather than introducing a new one.
3. If none exists yet, add a minimal, dependency-appropriate limiter
   scoped to this route (and any other routes the same finding pattern
   likely applies to — check for siblings, e.g. other auth/destructive
   routes with the same gap).
4. Choose limits conservative enough to stop abuse but not so tight they
   break legitimate use — state your reasoning for the chosen
   threshold in your summary rather than picking an arbitrary number
   silently.`.trim(),

  RLS: `
1. This finding concerns database Row-Level Security policy gaps.
   Identify which table(s) and which operation(s) (SELECT/INSERT/
   UPDATE/DELETE) lack proper tenant-scoping policies.
2. Write or fix the RLS policy so rows are scoped to the requesting
   tenant/user by whatever column this schema already uses for
   ownership (user_id, org_id, tenant_id — check existing policies on
   other tables in this schema for the established pattern).
3. Add a migration for the policy change — do not edit RLS via a
   one-off script; it must be version-controlled and reproducible.
4. If possible, add a test that attempts a cross-tenant read/write and
   confirms it is rejected at the database level, not just the
   application level.`.trim(),

  SSRF: `
1. Identify where this code makes an outbound request using a
   user-influenced URL/hostname/IP.
2. Add validation: restrict to an explicit allowlist of permitted
   hosts/domains if the use case allows one. If a fixed allowlist isn't
   feasible, at minimum block requests to private/internal IP ranges
   (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, link-local,
   and cloud metadata endpoints like 169.254.169.254).
3. Ensure validation happens AFTER DNS resolution, not just on the
   input string — a hostname can resolve to an internal IP even if the
   string itself looks external (DNS rebinding).
4. Add a test with a payload targeting an internal address, confirm it
   is rejected.`.trim(),

  MULTITENANT: `
1. Identify the specific code path where tenant isolation can be
   bypassed (e.g. a query missing a tenant_id filter, an object
   reference that isn't checked against the requester's tenant before
   use — this is often an IDOR).
2. Add the missing tenant-scoping check using this repo's existing
   pattern for tenant isolation (check how other, correctly-scoped
   queries in this codebase enforce it).
3. Add a test simulating one tenant attempting to access another
   tenant's resource by ID, confirm it's rejected (404 or 403,
   consistent with how the rest of this codebase handles it).`.trim(),

  MFA: `
1. Identify the destructive/sensitive route(s) missing an MFA
   re-verification step.
2. Check if this repo already has an MFA verification mechanism/
   middleware in use elsewhere — reuse it rather than building a new one.
3. Add the check to the flagged route(s), and to any sibling routes
   performing similarly destructive actions that share the same gap.
4. Confirm the fix doesn't lock out users who haven't enrolled in MFA
   yet — check how this repo currently handles that case elsewhere
   before applying the same convention here.`.trim(),

  CI_CD: `
1. Identify the specific pipeline hygiene issue (leaked value in logs,
   overly broad permissions, missing branch protection assumption,
   secrets passed insecurely between jobs).
2. Fix using the CI platform's recommended secret-handling mechanism
   (masked/secret env vars, not plain echo'd values).
3. If the issue is a leak IN PAST LOGS (not just current config), flag
   in your summary that historical CI logs may need to be purged or the
   leaked credential rotated — you likely cannot do this yourself.`.trim(),

  ERROR_LEAKAGE: `
1. Identify where an error response exposes internal detail (stack
   trace, SQL error text, internal file paths, dependency versions) to
   the client.
2. Replace with a generic client-facing error message, while preserving
   the full detail in server-side logs only.
3. Check this repo's existing error-handling middleware/pattern and fix
   it there if the leak is systemic (e.g. a global error handler
   returning \`err.stack\`) rather than patching one route at a time.`.trim(),

  BUSINESS_LOGIC: `
1. This finding requires understanding the INTENDED business rule, not
   just the code — read any related tests, comments, or docs before
   changing behavior.
2. Identify the specific bypass path (e.g. a state transition that
   skips a required approval step, a price/quantity check that can be
   manipulated client-side).
3. Move the authoritative check to the server side if it currently
   trusts client-supplied state.
4. Add a test that attempts the specific bypass described in the
   finding and confirms it now fails.
5. If you are not confident you understand the intended business rule,
   say so explicitly in your summary rather than guessing at a fix.`.trim(),

  NHI: `
1. Identify the long-lived credential/token (Non-Human Identity) and
   where it's used.
2. If it doesn't need to be long-lived, replace with a short-lived
   token / rotate-on-use pattern appropriate to this provider (e.g.
   OAuth refresh flow, STS temporary credentials).
3. If a long-lived token is genuinely required, ensure it's stored as a
   secret (env var / secrets manager), never committed, and scoped to
   the minimum permissions it needs — check whether the current scope
   is broader than what the code actually uses.
4. Flag in your summary whether the existing token should be rotated
   given it may have been exposed.`.trim(),

  DEAD_CODE: `
1. For each listed export, verify it is truly unused:
   - Search the ENTIRE repo (not just this directory) for any import.
   - Check if this package is published/consumed externally (check
     package.json "main"/"exports" fields and any workspace/monorepo
     references) — treat externally-referenced exports as intentional,
     NOT dead code.
   - Check test files too — an export used only in tests may still be
     intentional.
2. Remove only exports you've confirmed are genuinely unused.
3. Do NOT remove anything you're unsure about — flag it in your summary
   instead of guessing.
4. Run the test suite and linter after your changes; do not submit if
   either fails.`.trim(),

  UNUSED_DEPS: `
1. For each flagged dependency, confirm it's truly unused: search
   imports/requires across the whole repo, including config files
   (webpack/vite/babel configs sometimes reference packages without a
   JS import), and check for CLI-only usage in package.json scripts.
2. Remove confirmed-unused dependencies from package.json and update
   the lockfile.
3. Leave anything ambiguous in place and flag it in your summary rather
   than guessing.`.trim(),

  ARCHITECTURE: `
1. Read the finding's description carefully — architecture findings are
   less mechanical than other categories and often describe a pattern
   problem (tight coupling, a god-object, inconsistent layering) rather
   than a single-line bug.
2. Propose the smallest change that addresses the specific instance
   flagged — do not attempt a broad refactor across the codebase in
   response to one finding.
3. If fixing this properly requires touching many files or a larger
   design decision, do NOT do it silently — summarize the tradeoff and
   propose it as a separate, explicit follow-up rather than bundling a
   large refactor into this fix.`.trim(),
};

export const GENERIC_FALLBACK_TEMPLATE = `
1. Read the finding's description and evidence carefully.
2. Investigate the flagged file/location to understand the actual
   issue in context — do not rely on the evidence snippet alone.
3. Apply the smallest, most targeted fix that addresses the specific
   issue described. Do not make unrelated changes.
4. If you're uncertain about the correct fix, say so explicitly in your
   summary rather than guessing.
5. Run the test suite and linter after your changes.`.trim();

export function getCategoryTaskTemplate(category: string): string {
  return CATEGORY_TASK_TEMPLATES[category as FindingCategory] ?? GENERIC_FALLBACK_TEMPLATE;
}
