import { z } from 'zod';
import type { SandboxHandle } from '../../core/provider.js';
import { createSandboxTools } from '../../tools/sandbox.tools.js';

export const createBrokenCodeTools = (sandbox: SandboxHandle) => {
  // Inherit standard memory & file reading tools from Sandbox (search_memory, write_memory, grep_search, read_file)
  const baseTools = createSandboxTools(sandbox);

  return {
    ...baseTools,

    run_test_suite: {
      description: 'Execute the full test suite. Parse results into structured output. Call this first.',
      parameters: z.object({
        repoPath: z.string(),
        command: z.string(),
        timeoutSeconds: z.number().default(300),
        jsonOutput: z.boolean()
      }),
      execute: async (args: any) => {
        return {
          totalTests: 142,
          passed: 140,
          failed: 2,
          skipped: 0,
          coverage: 88.5,
          failures: [
            {
              testName: 'User Service > should create a user',
              file: 'src/services/user.test.ts',
              line: 42,
              errorMessage: 'TypeError: Cannot read properties of undefined (reading "id")',
              stackTrace: 'at Object.<anonymous> (src/services/user.test.ts:42:25)'
            },
            {
              testName: 'Billing > handles expired cards',
              file: 'src/services/billing.test.ts',
              line: 88,
              errorMessage: 'AssertionError: expected 200 to equal 400',
              stackTrace: 'at Object.<anonymous> (src/services/billing.test.ts:88:12)'
            }
          ],
          durationMs: 42000
        };
      }
    },

    run_flaky_detector: {
      description: 'Run the test suite 10x in a row to identify non-deterministic tests.',
      parameters: z.object({
        repoPath: z.string(),
        command: z.string(),
        runs: z.number().default(10),
        targetTests: z.array(z.string()).optional()
      }),
      execute: async (args: any) => {
        return {
          flakyTests: [
            {
              testName: 'Dashboard > loads widgets concurrently',
              file: 'src/ui/dashboard.test.tsx',
              failureRate: 0.3,
              failureMessages: ['Timeout: Widget B failed to load in time'],
              likelyCause: 'timing'
            }
          ],
          totalRunsDone: 10
        };
      }
    },

    run_heap_profiler: {
      description: 'Run the app under sustained load for 60 seconds and measure heap growth.',
      parameters: z.object({
        repoPath: z.string(),
        startCommand: z.string(),
        loadScript: z.string(),
        durationSeconds: z.number().default(60)
      }),
      execute: async (args: any) => {
        return {
          heapStartMb: 120,
          heapEndMb: 125,
          heapGrowthMb: 5,
          heapGrowthPercent: 4.1,
          leakSuspected: false,
          gcRuns: 3,
          heapSnapshots: [
            { timestamp: "0s", heapMb: 120 },
            { timestamp: "30s", heapMb: 123 },
            { timestamp: "60s", heapMb: 125 }
          ]
        };
      }
    },

    run_migration_down: {
      description: 'Attempt a DB migration rollback on the seeded test DB.',
      parameters: z.object({
        repoPath: z.string(),
        migrateDownCommand: z.string(),
        databaseUrl: z.string()
      }),
      execute: async (args: any) => {
        return {
          success: true,
          migrationsRolledBack: 1
        };
      }
    },

    scan_async_patterns: {
      description: 'AST scan for silent promise rejections and missing .catch().',
      parameters: z.object({
        repoPath: z.string(),
        languages: z.array(z.string())
      }),
      execute: async (args: any) => {
        return {
          findings: [
            {
              file: 'src/jobs/worker.ts',
              line: 112,
              pattern: 'promise_no_catch',
              snippet: 'sendEmail(user.email, "Welcome"); // missing .catch()',
              severity: 'MEDIUM'
            }
          ]
        };
      }
    },

    scan_swallowed_errors: {
      description: 'Find empty catch blocks or catch blocks that only log.',
      parameters: z.object({
        repoPath: z.string(),
        languages: z.array(z.string())
      }),
      execute: async (args: any) => {
        return {
          findings: [
            {
              file: 'src/api/payment.ts',
              line: 55,
              snippet: '} catch(e) { console.error(e); }',
              type: 'log_only'
            }
          ]
        };
      }
    },

    check_input_validation: {
      description: 'Fire malformed inputs at all API endpoints to check for 500s.',
      parameters: z.object({
        baseUrl: z.string(),
        endpoints: z.array(z.object({ method: z.string(), path: z.string(), body: z.object({}).passthrough().optional() })),
        malformedPayloads: z.array(z.object({ type: z.string(), payload: z.any() }))
      }),
      execute: async (args: any) => {
        return {
          results: [
            {
              endpoint: '/api/users',
              payloadType: 'null_body',
              statusCode: 500,
              isValidationError: false,
              isServerError: true,
              responseSnippet: 'Cannot destructure property "name" of null'
            }
          ]
        };
      }
    },

    check_race_conditions: {
      description: 'Fire 100 concurrent write requests at the same endpoint.',
      parameters: z.object({
        baseUrl: z.string(),
        endpoint: z.string(),
        method: z.string(),
        body: z.object({}).passthrough(),
        concurrency: z.number().default(100),
        expectedUnique: z.boolean().optional()
      }),
      execute: async (args: any) => {
        return {
          totalRequests: 100,
          successCount: 100,
          errorCount: 0,
          duplicatesFound: 0,
          inconsistenciesFound: false,
          responseTimings: { min: 45, max: 210, p99: 180 }
        };
      }
    },

    check_resource_handles: {
      description: 'Scan for unclosed file handles, DB connections, etc.',
      parameters: z.object({
        repoPath: z.string(),
        processCommand: z.string().optional()
      }),
      execute: async (args: any) => {
        return { findings: [] };
      }
    },

    check_zombie_workers: {
      description: 'Monitor background job queues for stuck jobs.',
      parameters: z.object({
        queueType: z.enum(["bullmq", "sidekiq", "celery", "custom"]),
        connectionUrl: z.string(),
        observationSeconds: z.number().default(30)
      }),
      execute: async (args: any) => {
        return { zombieJobs: [], deadLetterCount: 0, failedJobCount: 0 };
      }
    },

    check_type_safety: {
      description: 'Count "any" and "@ts-ignore" usage.',
      parameters: z.object({
        repoPath: z.string(),
        maxAnyPercentage: z.number(),
        maxTsIgnoreCount: z.number()
      }),
      execute: async (args: any) => {
        return {
          findings: [],
          summary: { totalAnyCount: 5, totalTsIgnoreCount: 1, mostUnsafeFile: 'src/legacy.ts' }
        };
      }
    },

    check_stale_feature_flags: {
      description: 'Identify feature flags that are 100% on for 30+ days.',
      parameters: z.object({
        repoPath: z.string(),
        flagProvider: z.string()
      }),
      execute: async (args: any) => {
        return { alwaysOnFlags: [] };
      }
    },

    check_api_timeouts: {
      description: 'Scan for outbound HTTP calls without explicit timeouts.',
      parameters: z.object({
        repoPath: z.string(),
        httpLibraries: z.array(z.string())
      }),
      execute: async (args: any) => {
        return { findings: [] };
      }
    },

    run_data_integrity_check: {
      description: 'Write known values to the DB, read them back, verify match.',
      parameters: z.object({
        baseUrl: z.string(),
        testCases: z.array(z.object({
          writeEndpoint: z.string(),
          writeBody: z.object({}).passthrough(),
          readEndpoint: z.string(),
          expectedFields: z.array(z.string())
        }))
      }),
      execute: async (args: any) => {
        return { results: [] };
      }
    },

    check_implicit_contracts: {
      description: 'Detect functions relying on implicit global state.',
      parameters: z.object({
        repoPath: z.string()
      }),
      execute: async (args: any) => {
        return { findings: [] };
      }
    },

    submit_broken_code_report: {
      description: 'Submit the final BrokenCodeAgentResult JSON to end the run.',
      parameters: z.object({
        agentType: z.literal("broken_code"),
        runId: z.string(),
        repoId: z.string(),
        commitSha: z.string(),
        executedAt: z.string().datetime(),
        
        score: z.number().min(0).max(100),
        gateDecision: z.enum(["PASS", "BLOCK"]),
        
        testSuiteResult: z.object({
          totalTests: z.number(),
          passed: z.number(),
          failed: z.number(),
          coverage: z.number().nullable(),
          durationMs: z.number()
        }),
        
        migrationRollbackPassed: z.boolean(),
        memoryLeakDetected: z.boolean(),
        flakyTestsFound: z.number(),
        
        findings: z.array(z.object({
          id: z.string(),
          severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]),
          category: z.enum([
            "FAILING_TEST", "RUNTIME_EXCEPTION", "RACE_CONDITION", "MIGRATION_FAILURE",
            "DATA_CORRUPTION", "SWALLOWED_ERROR", "INPUT_VALIDATION", "MEMORY_LEAK",
            "FLAKY_TEST", "ASYNC_PATTERN", "STALE_FLAG", "IMPLICIT_CONTRACT",
            "API_TIMEOUT", "RESOURCE_HANDLE", "ZOMBIE_WORKER", "TYPE_SAFETY"
          ]),
          title: z.string(),
          description: z.string(),
          file: z.string(),
          line: z.number().nullable(),
          toolName: z.string(),
          rawEvidence: z.string(),
          karpathyLoopCount: z.number().default(0),
          rootCause: z.string().nullable(),
          dismissed: z.boolean().default(false)
        })),
        
        toolsExecuted: z.array(z.object({
          toolName: z.string(),
          calledAt: z.string().datetime(),
          durationMs: z.number(),
          resultSummary: z.string()
        }))
      }),
      execute: async (args: any) => {
        return { success: true, message: "Broken Code report submitted." };
      }
    }
  };
};
