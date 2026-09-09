# The 12 Parallel Analyzers

Here is the complete roster of your 12 Parallel Analyzers and exactly what they do in the new orchestrated pipeline:

## The Core Analyzers
* **Architecture Agent:** Analyzes structural patterns, module boundaries, layered design, and domain coupling. It ensures the codebase isn't turning into a "Big Ball of Mud."
* **Security Agent:** Scans for active vulnerabilities, injection vectors, unsafe input handling, and hardcoded secrets.
* **Bloat Agent:** Identifies dead code, unused dependencies, duplicated logic, and overwhelmingly large files that need refactoring.
* **Performance Agent:** Spots slow database queries (N+1 problems), memory leaks, unoptimized loops, and missing caching layers.
* **Testing Agent:** Checks for test coverage gaps, validates the quality of assertions (preventing empty tests), and ensures edge cases are handled.
* **Documentation Agent:** Ensures public APIs, complex algorithms, and environment variables have adequate JSDoc/TSDoc and README instructions.
* **Dependencies Agent:** Validates new packages, flags vulnerable or outdated major versions, and warns against adding overwhelmingly large libraries when lighter ones exist.
* **Style Agent:** Enforces consistent naming conventions (camelCase vs snake_case), error handling patterns, async consistency, and magic number elimination.

## The Specialized Legacy Analyzers (Migrated)
* **AI-Era Agent:** Designed specifically for LLM-augmented codebases. It fires adversarial prompt injection payloads, checks RAG pipeline drift, validates output schemas, and enforces token-spend controls.
* **Broken Code Agent:** Executes the "Karpathy Loop." It actually runs the test suite, distinguishes between flaky tests and real bugs, rolls back migrations, and hunts for silent promise rejections.
* **Compliance Agent:** Your automated GDPR and EU AI Act auditor. It runs on a schedule to check data retention policies, audit trail integrity, cross-border data residency, and algorithmic impact classifications.
* **Data & DX Agent:** Focuses on Developer Experience and data health. It measures CI reliability, build latency, data pipeline entanglement, and alert fatigue to produce actionable engineering management reports.
