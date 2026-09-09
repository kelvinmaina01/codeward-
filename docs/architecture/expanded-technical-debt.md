# Expanded Technical Debt Framework (2026 Edition)

This document expands on the original technical debt categories, adding 10 high-impact items to each, specifically designed for modern, AI-augmented, and cloud-native development environments.

---

## 🔴 Security Debt
*Agent hunts these on every single push. Critical — hard blocks merge.*

### Original Items
1. **Exposed API keys & secrets**: Keys in frontend JS, .env committed, tokens in git history.
2. **Missing auth on API routes**: Agent fires requests to every endpoint with no auth token. Expects 401.
3. **SQL injection vectors**: OWASP ZAP dynamic scan + AST static check on every query builder.
4. **Database RLS missing**: Supabase/Postgres row-level security checked per table.
5. **XSS & CSRF vulnerabilities**: Agent injects standard XSS payloads into all user input fields.
6. **Known CVEs in dependencies**: npm audit / pip-audit / cargo audit on every push.
7. **Missing rate limiting**: 100 rapid requests fired at /login, /signup, /api/*. Expects 429.
8. **Prompt injection (2026+)**: User input passed to LLMs without sanitisation.

### 🆕 10 New Security Items
9. **Insecure Non-Human Identities (NHI)**: Agent scans for long-lived service tokens, hardcoded PATs, and unrotated machine-to-machine keys in K8s/Cloud configs.
10. **Software Supply Chain Integrity**: Agent verifies SBOM (Software Bill of Materials) against actual binaries and flags unvetted third-party scripts or GitHub Actions with excessive permissions.
11. **Cryptographic Root Cause Failures**: AST scan for deprecated algorithms (MD5, SHA-1) and hardcoded IVs/salts. Flags missing salt in hashing routines.
12. **SSRF in Microservices**: Agent probes internal metadata endpoints (e.g., 169.254.169.254) via all URL-accepting inputs to prevent internal network pivoting.
13. **Missing MFA for Administrative Actions**: Agent attempts to hit "destructive" or "sensitive" routes (e.g., DELETE /user, /admin/config) without a secondary step-up auth challenge.
14. **Insecure CI/CD Pipeline Logs**: Scans runner logs for accidentally leaked secrets and audits CI/CD plugins for potential "poisoned pipeline" vulnerabilities.
15. **Multitenant Data Leaks**: In B2B apps, the agent verifies every DB query in shared tables includes a mandatory `tenant_id` filter to prevent cross-tenant exposure.
16. **Logging & Alerting Gaps**: Agent triggers "suspicious" patterns (e.g., 5 rapid login failures) and checks if an automated alert is generated in the monitoring system.
17. **Exceptional Condition Information Leaks**: Fuzzes endpoints to trigger 500 errors and checks for stack traces, environment variables, or system paths in the response (CWE-209).
18. **Business Logic Flow Bypass**: Agent attempts to reach "success" or "download" pages directly without completing prerequisite steps (e.g., payment or verification).

---

## 🟡 Bloat Debt
*High — accumulates into health score. The vibe coding signature.*

### Original Items
1. **Duplicate functions**: Semantic AST matching finds functions with same behaviour.
2. **Dead code**: Call graph traced. Functions, variables, and imports with zero references flagged.
3. **God files (1000+ lines)**: Single files handling multiple responsibilities.
4. **Copy-paste blocks**: Blocks over 5 lines appearing 2+ times. Extracted automatically.
5. **Redundant dependencies**: Packages installed but never imported.
6. **Oversized functions**: Over 80 lines or cyclomatic complexity above 10.
7. **Vibe rewrite pattern**: Over 60% of a file changed with zero new tests added.
8. **Commented-out code blocks**: Large blocks of commented code left in production.

### 🆕 10 New Bloat Items
9. **Feature Bloat (Low Usage)**: Agent correlates telemetry data with code paths. Flags features with <1% monthly active usage for potential deprecation.
10. **Cognitive Load Bloat**: Measures "Time to Comprehend" via LLM analysis. Flags over-engineered abstractions that take >5 mins for a senior dev to parse.
11. **CSS & Asset Bloat**: Scans for unused Tailwind classes, legacy CSS, and oversized images/fonts that degrade LCP (Largest Contentful Paint) scores.
12. **Over-Configurability**: Flags settings, flags, or environment variables that haven't changed in 6 months, suggesting hardcoding to reduce test permutations.
13. **"Just-in-Case" Logic (YAGNI)**: Identifies code branches added for "future" requirements that have not materialized, keeping the codebase lean.
14. **Microservice Over-segmentation**: Measures network overhead vs. logic size. Suggests merging "nanoservices" back into modules to reduce "distributed monolith" complexity.
15. **Shadow Dependencies**: Detects multiple versions of the same library (e.g., Lodash 3 and 4) bundled in the frontend, causing unnecessary bundle size.
16. **Verbose Logging Spam**: Monitors log volume in production. Flags "DEBUG" or "INFO" spam that increases storage costs without providing diagnostic value.
17. **Legacy Polyfill Debt**: Checks current user-agent requirements. Flags polyfills for browsers (like IE11) no longer supported by the business support matrix.
18. **Documentation Rot**: Compares README/Doc content with actual code signatures and behavior. Flags discrepancies that lead to onboarding confusion.

---

## 🔴 Broken Code Debt
*Critical — blocks merge. Silent killers in production.*

### Original Items
1. **Failing tests**: Full existing test suite runs first. Any single failure = hard block.
2. **Runtime exceptions**: App starts and runs in sandbox. Null dereferences caught live.
3. **Race conditions**: 100 concurrent requests fired at every write endpoint.
4. **Broken migrations**: Every migration run on seeded test DB. Schema diff verified.
5. **Silent data corruption**: Agent writes known values then reads them back.
6. **Swallowed errors**: AST scan for empty catch blocks or catch(e){} with no rethrow.
7. **Missing input validation**: Every API route tested with malformed or oversized inputs.
8. **Memory leaks**: App run under load for 60 seconds. Heap growth measured.

### 🆕 10 New Broken Code Items
9. **Flaky Test Debt**: Agent runs the test suite 10x in a row. Any non-deterministic failure is flagged as a high-priority "silent killer" of CI/CD trust.
10. **Silent Promise Rejections**: AST scan for `await` calls without `try/catch` or `.catch()`. Flags potential unhandled runtime crashes in async flows.
11. **Stale Feature Flags**: Identifies feature flags that have been 100% "on" for 30+ days. Automatically suggests removal of the conditional logic.
12. **Implicit Contract Reliance**: Detects functions that rely on specific global state, side effects, or timing not reflected in their signatures or arguments.
13. **Swallowed API Timeouts**: Flags outbound HTTP/gRPC calls without an explicit timeout. Prevents worker threads from hanging indefinitely on external failures.
14. **Memory Bloat (Non-Leak)**: Analyzes heap snapshots for large objects held in global scope with no TTL or eviction policy (e.g., unbounded caches).
15. **Broken Rollback Paths**: Agent attempts a "down" migration on every PR. Any failure to revert the schema blocks the merge to ensure safety.
16. **Type-Safety Gaps**: Counts `any` and `ts-ignore` usage. Flags files where type safety coverage falls below the project's required threshold.
17. **Resource Exhaustion (Handles)**: Scans for unclosed file handles, database connections, or network sockets in long-running background processes.
18. **Zombie Workers**: Monitors background job health. Flags processes that restart repeatedly or "spin" without making measurable progress on tasks.

---

## 🔵 Architecture Debt
*Medium — health trend. Fails at scale.*

### Original Items
1. **N+1 query problems**: Query count instrumented per HTTP request.
2. **Missing database indexes**: EXPLAIN ANALYZE run on every query.
3. **Unbounded result sets**: Endpoints tested with 10,000 row datasets.
4. **Circular dependencies**: Full module import graph traced.
5. **No caching strategy**: Identical DB queries fired within the same request flagged.
6. **Tight coupling**: Business logic detected in route handlers or UI components.
7. **Synchronous blocking calls**: I/O operations without async/await detected.
8. **Missing retry logic**: External API calls with no retry wrapper or backoff.

### 🆕 10 New Architecture Items
9. **Distributed Monolith Pattern**: Measures deployment coupling. Flags services that must be deployed together to function, defeating microservice independence.
10. **Missing Distributed Tracing**: Agent injects a request and verifies a consistent Trace-ID across all microservice hops. Flags gaps in observability.
11. **Synchronous Dependency Chains**: Identifies A->B->C call chains. Flags missing circuit breakers that would prevent a failure in 'C' from cascading to 'A'.
12. **Database as Integration Point**: Detects multiple services writing to the same database table. Flags as a violation of bounded contexts and service isolation.
13. **Data Archival Debt**: Monitors table growth and query performance. Suggests archival strategies for data older than the legal/business retention policy.
14. **Hardcoded Environment Logic**: Flags `if (env === 'prod')` blocks scattered in code. Suggests moving logic to environment-specific configuration files.
15. **Lack of Write Idempotency**: Fires identical requests at "write" endpoints. Flags any that create duplicate records (e.g., charging a card twice).
16. **Manual Deployment Steps**: Scans READMEs and Wikis for "don't forget" instructions. Flags any step not encoded in the automated CI/CD pipeline.
17. **Cold Start Latency**: Measures startup time in a cold sandbox. Flags serverless functions or heavy apps with >5s initialization time.
18. **Missing Backpressure Handling**: Tests the system under 2x expected load. Flags if it crashes instead of gracefully shedding load or returning 503s.

---

## 🟢 AI-era Debt
*Emerging — 2026 through 2030. Weight grows every year.*

### Original Items
1. **Prompt injection vulnerability**: Known override payloads tested on every LLM route.
2. **Unbounded LLM token spend**: No max_tokens set on API calls.
3. **Unvalidated AI output**: LLM responses parsed without schema validation.
4. **Deprecated model version lock**: Hardcoded model IDs (e.g., gpt-4-0613).
5. **PII leaking into AI pipelines**: User data detected in logs or passed raw to LLMs.
6. **No AI output rate limiting**: LLM endpoints with no request throttle.
7. **Hallucination trust pattern**: Code uses LLM output directly in DB writes without review.
8. **Training data exposure**: Logging patterns that expose user inputs to training.

### 🆕 10 New AI-era Items
9. **System Prompt Leakage**: Agent attempts "repeat back" or "ignore previous instructions" attacks to extract hidden system prompts from LLM endpoints.
10. **Non-Deterministic UI Drift**: Compares UI screenshots across multiple renders. Flags layout shifts or broken UX caused by unstable AI-generated content.
11. **Vector DB Stale Indices**: Compares RAG source data with current DB embeddings. Flags outdated, deleted, or orphaned data in the vector index.
12. **AI Refactoring Logic Shift**: Compares the semantic behavior of AI-refactored code against original tests. Flags subtle logic regressions missed by humans.
13. **Lack of AI Attribution**: Audits git history for AI-generated commits. Flags code blocks without "Generated-by" metadata for copyright and audit compliance.
14. **Prompt Version Mismatch**: Validates LLM output against expected schemas. Flags breaking changes or "model drift" from upstream model upgrades.
15. **RAG Context Bloat**: Measures token count vs. relevance. Flags "expensive" prompts that pass excessive irrelevant data to the LLM, increasing cost and latency.
16. **Missing Human-in-the-Loop**: Flags AI-driven "destructive" actions (e.g., DELETE user, process large refund) that lack a mandatory manual approval gate.
17. **Model Bias Accumulation**: Analyzes AI-driven sorting or filtering logic for systemic bias against specific data attributes or user groups.
18. **Evasive AI Testing**: Detects tests written by AI that "pass" by mocking the entire system or asserting on constants, providing "fake" 100% coverage.

---

## ⚖️ Compliance & Privacy Debt
*High — Legal and financial risk. The "Regulator's Nightmare".*

1. **EU AI Act Non-Compliance**: Missing risk classifications or transparency logs for "high-risk" AI systems as mandated by the 2026 full applicability.
2. **Cross-Border Data Sovereignty**: Data stored in regions that violate updated local residency laws (e.g., US state-specific laws or tightened GDPR post-2025).
3. **Non-Human Identity (NHI) Compliance**: Unmanaged service accounts and machine-to-machine keys that fail new "identity-first" security audits.
4. **Right-to-be-Forgotten (RTBF) Gaps**: Inability to fully purge user data from backups, logs, and downstream AI training sets upon request.
5. **Consent Versioning Debt**: Using data collected under old consent terms for new AI/analytics purposes without re-obtaining explicit permission.
6. **Missing Accessibility (A11y) Compliance**: Failing to meet WCAG 2.2/3.0 standards, creating legal exposure and excluding users with disabilities.
7. **Shadow AI Usage**: Employees using unvetted LLMs or AI tools with sensitive company data, creating a compliance "black hole."
8. **Inadequate Audit Trails**: Missing immutable, cryptographically signed logs for sensitive business logic or PII access events.
9. **Data Minimization Violations**: Retaining PII longer than the business necessity "just in case," violating core privacy-by-design principles.
10. **Algorithmic Impact Assessment (AIA) Debt**: Deploying automated decision-making systems without documented bias, fairness, and safety audits.

---

## 🛠️ Developer Experience (DX) Debt
*Medium — Impact on velocity and retention. The "Burnout Engine".*

1. **Flaky CI/CD Pipelines**: Deployment pipelines that fail non-deterministically due to infrastructure instability, causing "red-build fatigue."
2. **Local Environment Parity Gap**: Significant differences between local dev setups and production (e.g., missing local S3/DB mocks) leading to "works on my machine" bugs.
3. **Onboarding Lead Time**: It takes >2 weeks for a new hire to make their first production commit due to complex, undocumented environment setups.
4. **Documentation Rot**: Stale API specifications and READMEs that force developers to rely on "tribal knowledge" and Slack archaeology.
5. **Tooling Fragmentation**: Using multiple redundant tools for the same job (e.g., 3 task runners, 2 CI providers) across different teams.
6. **High Build/Test Latency**: Development-loop builds or local test runs taking >5 minutes, frequently breaking developer "flow" state.
7. **Missing Self-Service Infrastructure**: Developers waiting on SRE/DevOps for basic resource provisioning like databases or S3 buckets.
8. **Alert Fatigue**: On-call engineers receiving a high volume of non-actionable or "noisy" alerts that mask real production issues.
9. **Absence of "Golden Paths"**: No standardized templates for new services, leading to inconsistent and unmaintainable micro-architectures.
10. **Searchability Debt**: Inability to quickly find code, documentation, or past incident post-mortems across siloed internal tools.

---

## 📊 Data & Analytics Debt
*Medium — Impacts decision quality. The "Garbage In, Garbage Out" Debt.*

1. **Data Pipeline Entanglement**: "Spaghetti" pipelines where a minor change in a source schema breaks multiple downstream consumers silently.
2. **Missing Data Contracts**: No formal schema or quality agreements between data producers and consumers, leading to frequent breaking changes.
3. **Vector DB Embedding Drift**: RAG systems using outdated embeddings that no longer align with the latest LLM's latent space.
4. **Dark Data Accumulation**: Gigabytes of data collected and stored but never utilized, increasing costs and search noise.
5. **Lack of Data Lineage**: Inability to trace a specific metric or data point back to its raw source for audit or debugging purposes.6. **Silent Data Quality Degradation**: Null values, "zero" defaults, or type mismatches cre
(Content truncated due to size limit. Use line ranges to read remaining content)