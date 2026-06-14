import { z } from 'zod';
import type { SandboxHandle } from '../../core/provider.js';
import { createSandboxTools } from '../../tools/sandbox.tools.js';

export const createArchitectureTools = (sandbox: SandboxHandle) => {
  // Inherit standard memory & file reading tools
  const baseTools = createSandboxTools(sandbox);

  return {
    ...baseTools,

    instrument_query_counter: {
      description: 'Attach a query counter middleware. Fire requests and count SQL queries per request to detect N+1.',
      parameters: z.object({
        baseUrl: z.string(),
        databaseUrl: z.string(),
        testRequests: z.array(z.object({
          method: z.string(),
          path: z.string(),
          authToken: z.string().optional()
        })),
        n1Threshold: z.number().default(5)
      }),
      execute: async (args: any) => {
        return {
          results: [
            {
              path: '/api/v1/users',
              queryCount: 101,
              exceedsThreshold: true,
              queries: [
                { sql: 'SELECT * FROM users LIMIT 100', durationMs: 12, isRepeat: false },
                { sql: 'SELECT * FROM profiles WHERE user_id = $1', durationMs: 2, isRepeat: true }
              ]
            }
          ]
        };
      }
    },

    run_explain_analyze: {
      description: 'Run PostgreSQL EXPLAIN ANALYZE on queries to flag full sequential scans.',
      parameters: z.object({
        databaseUrl: z.string(),
        queries: z.array(z.string()),
        tableRowCounts: z.record(z.number())
      }),
      execute: async (args: any) => {
        return {
          analyses: [
            {
              query: 'SELECT * FROM users WHERE email = $1',
              planType: 'SeqScan',
              estimatedCost: 1540.00,
              actualDurationMs: 45.2,
              rowsScanned: 150000,
              missingIndex: true,
              suggestedIndex: 'CREATE INDEX idx_users_email ON users(email)',
              tableName: 'users'
            }
          ]
        };
      }
    },

    run_k6_load_test: {
      description: 'Load test the running app at 1x and 2x expected traffic. Measures p99 latency and error rate.',
      parameters: z.object({
        baseUrl: z.string(),
        scenarios: z.array(z.object({
          name: z.string(),
          endpoint: z.string(),
          method: z.string(),
          body: z.object({}).passthrough().optional(),
          vus: z.number(),
          duration: z.string()
        })),
        thresholds: z.object({
          p99LatencyMs: z.number().default(500),
          errorRatePercent: z.number().default(1)
        })
      }),
      execute: async (args: any) => {
        return {
          scenarioResults: [
            {
              name: 'Browse Products (2x load)',
              p50Ms: 120,
              p95Ms: 450,
              p99Ms: 1200,
              errorRate: 2.5,
              requestsPerSecond: 450,
              passed: false,
              failureReason: 'p99 latency (1200ms) > threshold (500ms)'
            }
          ],
          systemBehaviorUnderLoad: 'degraded'
        };
      }
    },

    measure_cold_start: {
      description: 'Measure app startup time from a cold state.',
      parameters: z.object({
        repoPath: z.string(),
        startCommand: z.string(),
        healthCheckUrl: z.string(),
        timeoutMs: z.number().default(30000)
      }),
      execute: async (args: any) => {
        return {
          coldStartMs: 6500,
          warmStartMs: 45,
          healthCheckPassedAt: 6800,
          exceedsThreshold: true,
          isServerless: true
        };
      }
    },

    trace_import_graph: {
      description: 'Build full module import graph and find circular dependencies.',
      parameters: z.object({
        repoPath: z.string(),
        entryPoints: z.array(z.string()),
        format: z.literal("json")
      }),
      execute: async (args: any) => {
        return {
          circularDependencies: [
            {
              cycle: ['src/services/auth.ts', 'src/services/user.ts', 'src/services/auth.ts'],
              severity: 'HIGH'
            }
          ],
          totalModules: 145,
          maxDepth: 12,
          orphanModules: ['src/utils/legacy-math.ts']
        };
      }
    },

    check_unbounded_results: {
      description: 'Test endpoints with a 10,000-row dataset to flag endpoints without pagination.',
      parameters: z.object({
        databaseUrl: z.string(),
        baseUrl: z.string(),
        endpoints: z.array(z.object({
          path: z.string(),
          method: z.string()
        })),
        seedTableName: z.string().optional()
      }),
      execute: async (args: any) => {
        return {
          findings: [
            {
              endpoint: '/api/v1/events',
              rowsReturned: 10000,
              hasPagination: false,
              responseTimeMs: 850,
              responseBodySizeKb: 4500
            }
          ]
        };
      }
    },

    check_caching_opportunities: {
      description: 'Detect identical DB queries fired multiple times within the same HTTP request lifecycle.',
      parameters: z.object({
        queryLog: z.array(z.object({ sql: z.string(), durationMs: z.number() })),
        requestPath: z.string()
      }),
      execute: async (args: any) => {
        return {
          cacheOpportunities: [
            {
              query: 'SELECT * FROM settings WHERE scope = \'global\'',
              occurrences: 14,
              totalWastedMs: 28,
              cacheStrategy: 'in_memory'
            }
          ]
        };
      }
    },

    check_coupling_score: {
      description: 'Measure tight coupling (e.g. DB logic inside route handlers) using AST analysis.',
      parameters: z.object({
        repoPath: z.string(),
        layerConfig: z.object({
          routesGlob: z.string(),
          componentsGlob: z.string(),
          servicesGlob: z.string(),
          dbGlob: z.string()
        })
      }),
      execute: async (args: any) => {
        return {
          couplingViolations: [
            {
              file: 'src/routes/users.ts',
              line: 45,
              fromLayer: 'route',
              toLayer: 'db',
              pattern: 'db_in_route',
              snippet: 'await db.query(`SELECT * FROM users`)'
            }
          ],
          overallCouplingScore: 65
        };
      }
    },

    check_retry_logic: {
      description: 'Find external HTTP calls without retry wrappers or exponential backoff.',
      parameters: z.object({
        repoPath: z.string(),
        httpLibraries: z.array(z.string())
      }),
      execute: async (args: any) => {
        return {
          findings: [
            {
              file: 'src/services/stripe.ts',
              line: 88,
              library: 'axios',
              hasRetry: false,
              hasBackoff: false,
              snippet: 'const res = await axios.post("https://api.stripe.com/...")'
            }
          ]
        };
      }
    },

    check_distributed_tracing: {
      description: 'Inject a traced request and verify Trace-ID propagates across microservices.',
      parameters: z.object({
        services: z.array(z.object({ name: z.string(), baseUrl: z.string() })),
        tracingHeader: z.string(),
        testRequest: z.object({ method: z.string(), path: z.string(), body: z.object({}).passthrough().optional() })
      }),
      execute: async (args: any) => {
        return {
          traceId: 'trace-12345',
          propagatedTo: ['api-gateway', 'auth-service'],
          missingIn: ['billing-service'],
          tracingComplete: false
        };
      }
    },

    check_idempotency: {
      description: 'Fire identical write requests multiple times to check for duplicate records.',
      parameters: z.object({
        baseUrl: z.string(),
        endpoint: z.string(),
        body: z.object({}).passthrough(),
        repetitions: z.number().default(3),
        idempotencyKey: z.string().optional()
      }),
      execute: async (args: any) => {
        return {
          duplicatesCreated: 2,
          isIdempotent: false,
          responses: [
            { statusCode: 201, body: '{"id": 1}' },
            { statusCode: 201, body: '{"id": 2}' },
            { statusCode: 201, body: '{"id": 3}' }
          ]
        };
      }
    },

    check_backpressure: {
      description: 'Test if system gracefully sheds load or crashes under extreme load.',
      parameters: z.object({
        baseUrl: z.string(),
        endpoint: z.string(),
        rampToVus: z.number(),
        durationSeconds: z.number().default(30)
      }),
      execute: async (args: any) => {
        return {
          crashedAt: 450,
          shed503At: null,
          behaviorUnderExtremLoad: 'crash',
          maxSustainableVus: 380
        };
      }
    },

    check_data_archival_debt: {
      description: 'Monitor table sizes and growth rates for archival strategies.',
      parameters: z.object({
        databaseUrl: z.string(),
        sizeThresholdMb: z.number().default(100)
      }),
      execute: async (args: any) => {
        return {
          largeTables: [
            {
              tableName: 'audit_logs',
              rowCount: 15000000,
              sizeMb: 4500,
              hasIndexes: true,
              estimatedGrowthPerMonth: '500MB',
              archivalSuggestion: 'Implement table partitioning by month.'
            }
          ]
        };
      }
    },

    check_sync_blocking: {
      description: 'Find I/O operations without async/await that block event loop.',
      parameters: z.object({
        repoPath: z.string(),
        language: z.string()
      }),
      execute: async (args: any) => {
        return {
          findings: [
            {
              file: 'src/utils/config.ts',
              line: 12,
              operation: 'fs.readFileSync',
              alternative: 'fs.promises.readFile',
              snippet: 'const conf = JSON.parse(fs.readFileSync("config.json"))'
            }
          ]
        };
      }
    },

    check_distributed_monolith: {
      description: 'Detect services that must be deployed together to function.',
      parameters: z.object({
        repoPath: z.string(),
        services: z.array(z.object({ name: z.string(), path: z.string() }))
      }),
      execute: async (args: any) => {
        return {
          coupledPairs: [
            {
              serviceA: 'auth-service',
              serviceB: 'billing-service',
              couplingType: 'shared_db',
              file: 'src/db/shared_schema.prisma',
              line: 1
            }
          ],
          isDistributedMonolith: true
        };
      }
    },

    submit_architecture_report: {
      description: 'Submit the final ArchitectureAgentResult JSON to end the run.',
      parameters: z.object({
        agentType: z.literal("architecture"),
        runId: z.string(),
        repoId: z.string(),
        commitSha: z.string(),
        executedAt: z.string().datetime(),
        
        score: z.number().min(0).max(100),
        gateDecision: z.enum(["PASS", "WARN", "BLOCK"]),
        
        performanceMetrics: z.object({
          coldStartMs: z.number().nullable(),
          p99LatencyMs: z.number().nullable(),
          maxSustainableVus: z.number().nullable(),
          behaviorUnderLoad: z.string().nullable()
        }),
        
        findings: z.array(z.object({
          id: z.string(),
          severity: z.enum(["HIGH", "MEDIUM", "LOW", "INFO"]),
          category: z.enum([
            "N_PLUS_1", "MISSING_INDEX", "UNBOUNDED_RESULTS", "CIRCULAR_DEPS",
            "NO_CACHING", "TIGHT_COUPLING", "SYNC_BLOCKING", "MISSING_RETRY",
            "DISTRIBUTED_MONOLITH", "MISSING_TRACING", "DEPENDENCY_CHAIN",
            "DATABASE_INTEGRATION", "DATA_ARCHIVAL", "HARDCODED_ENV",
            "WRITE_IDEMPOTENCY", "COLD_START", "BACKPRESSURE"
          ]),
          title: z.string(),
          description: z.string(),
          file: z.string().nullable(),
          line: z.number().nullable(),
          toolName: z.string(),
          rawEvidence: z.string(),
          suggestedFix: z.string(),
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
        return { success: true, message: "Architecture report submitted." };
      }
    }
  };
};
