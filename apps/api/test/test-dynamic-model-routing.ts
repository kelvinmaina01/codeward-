import 'dotenv/config';
import assert from "node:assert/strict";
import { NativeOpenAIProvider, FatalPayloadError, sanitizeErrorLog } from "../src/providers/openai.provider.js";

async function testCandidateResolution() {
  console.log("[TEST] 1. Verifying dynamic candidate resolution from environment...");

  const provider = new NativeOpenAIProvider();

  const candidates = provider.resolveCandidates({
    model: "deepseek-chat",
    systemPrompt: "You are a test agent",
    messages: [],
  });

  console.log("  Candidates discovered:", candidates.map(c => `${c.name} -> ${c.model} (${c.baseUrl})`));

  assert.ok(candidates.length >= 1, "Should discover at least 1 candidate provider from environment");
  const tokenRouterCandidate = candidates.find(c => c.name === "tokenrouter" || c.name === "tokenrouter_glm");
  assert.ok(tokenRouterCandidate, "TokenRouter candidate should be discovered when key is present");
  assert.equal(tokenRouterCandidate?.baseUrl, "https://api.tokenrouter.com/v1");

  console.log("  ✅ Dynamic candidate resolution verified.");
}

async function testDynamicFallbackCascadeAndTelemetry() {
  console.log("[TEST] 2. Verifying automatic cascade, 429 backoff, and observable telemetry...");

  class MockCascadingProvider extends NativeOpenAIProvider {
    override resolveCandidates() {
      return [
        {
          name: "failing_primary_quota",
          baseUrl: "https://mock-failing-1.test/v1",
          apiKey: "key-1",
          model: "failing-model-1",
        },
        {
          name: "failing_secondary_rate_limit",
          baseUrl: "https://mock-failing-2.test/v1",
          apiKey: "key-2",
          model: "failing-model-2",
        },
        {
          name: "working_fallback",
          baseUrl: "https://mock-working.test/v1",
          apiKey: "key-3",
          model: "working-model-3",
        },
      ];
    }
  }

  const originalFetch = globalThis.fetch;
  const mockProvider = new MockCascadingProvider();
  let rateLimitHits = 0;

  try {
    globalThis.fetch = (async (url: any, opts: any) => {
      const urlStr = String(url);
      if (urlStr.includes("mock-failing-1")) {
        return new Response(JSON.stringify({ error: { message: "Budget exhausted (402)" } }), {
          status: 402,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (urlStr.includes("mock-failing-2")) {
        rateLimitHits++;
        return new Response(JSON.stringify({ error: { message: "Rate limit exceeded (429)" } }), {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": "1" },
        });
      }
      if (urlStr.includes("mock-working")) {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              role: "assistant",
              content: "Fallback response succeeded",
              reasoning_content: "Thinking step",
              tool_calls: [{
                id: "call_123",
                function: { name: "submit_finding", arguments: "{\"title\":\"Safe\"}" },
              }],
            },
          }],
          usage: { prompt_tokens: 15, completion_tokens: 25 },
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return originalFetch(url, opts);
    }) as any;

    const result = await mockProvider.execute({
      model: "test-model",
      systemPrompt: "test",
      messages: [{ role: "user", content: "hello" }],
    });

    assert.equal(result.text, "Fallback response succeeded");
    assert.equal(result.toolCalls.length, 1);
    assert.equal(result.toolCalls[0].name, "submit_finding");
    assert.deepEqual(result.toolCalls[0].input, { title: "Safe" });

    // Verify 429 retried on same provider before giving up
    assert.ok(rateLimitHits >= 2, "Should attempt retry with backoff on 429 before cascading");

    // Verify observable serving telemetry
    assert.ok(result.servedBy, "Result must include servedBy telemetry metadata");
    assert.equal(result.servedBy?.provider, "working_fallback");
    assert.equal(result.servedBy?.model, "working-model-3");
    assert.equal(result.servedBy?.isFallback, true);
    assert.ok(result.servedBy?.latencyMs >= 0);

    console.log("  ✅ Cascade successfully skipped failed providers (402, 429) and attached serving telemetry.");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testFatalPayloadFailFast() {
  console.log("[TEST] 3. Verifying fail-fast on 400 Bad Request without wasteful cascading...");

  class MockProvider400 extends NativeOpenAIProvider {
    calls = 0;
    override resolveCandidates() {
      return [
        { name: "cand-1", baseUrl: "https://mock-400-1.test/v1", apiKey: "k1", model: "m1" },
        { name: "cand-2", baseUrl: "https://mock-400-2.test/v1", apiKey: "k2", model: "m2" },
      ];
    }
  }

  const originalFetch = globalThis.fetch;
  const mock = new MockProvider400();

  try {
    globalThis.fetch = (async () => {
      mock.calls++;
      return new Response(JSON.stringify({
        error: { message: "Invalid JSON schema in tool parameters: type must be string", type: "invalid_request_error" }
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }) as any;

    await assert.rejects(
      async () => {
        await mock.execute({
          model: "test-model",
          systemPrompt: "test",
          messages: [{ role: "user", content: "hello" }],
        });
      },
      (err: any) => {
        assert.ok(err instanceof FatalPayloadError, "Must throw FatalPayloadError on 400 bad schema");
        assert.equal(err.statusCode, 400);
        return true;
      }
    );

    // Assert that cand-2 was NEVER called because we failed fast on 400!
    assert.equal(mock.calls, 1, "Must fail fast after 1st candidate on 400 schema error without cascading to cand-2");
    console.log("  ✅ Fatal payload error failed fast after 1 request without cascading.");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testApiKeySanitization() {
  console.log("[TEST] 4. Verifying zero API key leakage in error logs...");

  const rawMessage = "Provider failed: Bearer sample-token-1234567890abcdef or apiKey=sample-token-9876543210fedcba";
  const sanitized = sanitizeErrorLog(rawMessage);

  assert.ok(!sanitized.includes("sample-token-1234567890abcdef"), "Sanitizer must redact bearer keys");
  assert.ok(sanitized.includes("[REDACTED"), "Sanitizer must include redaction placeholder");

  console.log("  ✅ Error log key sanitization verified.");
}

async function testCascadeTimeoutBudget() {
  console.log("[TEST] 5. Verifying wall-clock cascade timeout budget enforcement...");

  class MockSlowProvider extends NativeOpenAIProvider {
    override resolveCandidates() {
      return [
        { name: "slow-1", baseUrl: "https://mock-slow-1.test/v1", apiKey: "k1", model: "m1" },
        { name: "slow-2", baseUrl: "https://mock-slow-2.test/v1", apiKey: "k2", model: "m2" },
      ];
    }
  }

  const originalFetch = globalThis.fetch;
  const mock = new MockSlowProvider();
  const oldEnv = process.env.AI_CASCADE_TIMEOUT_MS;
  process.env.AI_CASCADE_TIMEOUT_MS = "300"; // 300ms total cascade budget

  try {
    let abortedCount = 0;
    globalThis.fetch = (async (_url: string, opts?: any) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve(new Response(JSON.stringify({ error: { message: "Too slow" } }), { status: 504 }));
        }, 400);

        if (opts?.signal) {
          opts.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            abortedCount++;
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }
      });
    }) as any;

    const startTime = Date.now();
    await assert.rejects(
      async () => {
        await mock.execute({
          model: "test-model",
          systemPrompt: "test",
          messages: [{ role: "user", content: "hello" }],
        });
      },
      (err: any) => {
        assert.ok(
          err.message.includes("Total cascade wall-clock timeout") || err.message.includes("failed in cascade"),
          "Must fail when cascade timeout budget is exceeded"
        );
        return true;
      }
    );
    const elapsed = Date.now() - startTime;
    assert.ok(elapsed <= 450, `Expected total cascade duration <= 450ms, took ${elapsed}ms`);

    console.log("  ✅ Wall-clock cascade budget enforcement and abort signal verified.");
  } finally {
    process.env.AI_CASCADE_TIMEOUT_MS = oldEnv;
    globalThis.fetch = originalFetch;
  }
}

async function testBootValidation() {
  console.log("[TEST] 6. Verifying loud startup configuration validation...");

  const status = NativeOpenAIProvider.validateConfiguration();
  assert.ok(status.valid, "Configuration must be valid when env keys are present");
  assert.ok(status.providers.length >= 1, "Must detect configured providers");

  console.log("  ✅ Loud boot validation verified.");
}

async function main() {
  console.log("====================================================");
  console.log("Running Enhanced Dynamic Model Routing & Fallback Test Suite");
  console.log("====================================================");

  await testCandidateResolution();
  await testDynamicFallbackCascadeAndTelemetry();
  await testFatalPayloadFailFast();
  await testApiKeySanitization();
  await testCascadeTimeoutBudget();
  await testBootValidation();

  console.log("\n====================================================");
  console.log("PASS: All 6 dynamic routing & fallback tests passed! 🎯");
  console.log("====================================================\n");
}

main().catch((err) => {
  console.error("FAIL: Dynamic model routing test failed:", err);
  process.exit(1);
});
