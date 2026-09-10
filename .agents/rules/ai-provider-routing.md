# AI Provider Routing & Cascading Fallback Rules

## Core Principles

When working with multi-provider AI model execution (e.g. `NativeOpenAIProvider`, `model.provider.ts`), adhere to the following 7 golden rules:

### 1. Error Classification (Retry vs. Cascade vs. Fail-Fast)
- **Retryable on same provider**:
  - Transient 502, 503, 504, network timeouts/aborts.
  - Action: Exponential backoff with jitter before giving up on that candidate.
- **Cascade-worthy**:
  - 401 (invalid/expired key), 402 (budget/quota exhausted), 403 (unauthorized/forbidden), exhausted 429 rate limits, persistent 5xx, or provider-specific "model not found".
  - Action: Advance immediately to the next candidate in the ordered cascade.
- **Fatal/Config (Fail-Fast)**:
  - 400 Bad Request, 422 Unprocessable Entity (e.g., malformed JSON schema in tool definitions, unsupported parameters).
  - Action: Fail fast! Throw `FatalPayloadError` immediately without cascading, preventing wasteful latency walking multiple providers with an identically broken payload.

### 2. Backoff with Jitter on 429 Rate Limits
- Never immediately jump to a fallback model on the first 429 hit.
- Inspect `Retry-After` header. If absent or reasonable, back off with random jitter (`baseDelay + Math.random() * 1000`) and retry up to 2 times on the same provider before giving up and cascading.

### 3. Wall-Clock Timeout Budget
- Enforce a total cascade timeout budget (`AI_CASCADE_TIMEOUT_MS`, default 90s) across all serialized provider candidates.
- Each individual HTTP request must be bounded by the smaller of `60s` or `remainingCascadeBudget`.

### 4. Observable Serving Telemetry
- Every successful AI response must include `servedBy` metadata (`provider`, `model`, `isFallback`, `attemptCount`, `latencyMs`).
- Prominently log when a request was served by a fallback candidate (`⚠️ [FALLBACK from <primary>]`) so that quality degradation is instantly observable and traceable.

### 5. Per-Provider Schema & Parameter Sanitization
- Never assume uniform OpenAI-compatibility.
- For reasoning models (GLM, DeepSeek-Reasoner, OpenAI o1/o3): Ensure unsupported `temperature` or strict schema flags are sanitized or omitted before sending.

### 6. Zero Key Leakage in Logs
- All logged error messages and exceptions must pass through `sanitizeErrorLog()`.
- Redact all `Bearer ...` tokens, `sk-...` strings, and authorization headers.

### 7. Loud Boot-Time Configuration Validation
- Call `NativeOpenAIProvider.validateConfiguration()` at process boot (`src/index.ts`, `src/worker.ts`).
- If zero AI providers are configured in the environment, log a loud diagnostic error to prevent silent failures during runtime.
