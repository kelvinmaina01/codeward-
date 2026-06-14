import { z } from 'zod';
import type { SandboxHandle } from '../../core/provider.js';
import { createSandboxTools } from '../../tools/sandbox.tools.js';

export const createDataDXTools = (sandbox: SandboxHandle) => {
  const baseTools = createSandboxTools(sandbox);

  return {
    ...baseTools,

    analyse_data_pipelines: {
      description: 'Find "spaghetti" pipelines where schema changes break downstream consumers.',
      parameters: z.object({
        repoPath: z.string(),
        pipelineGlob: z.string(),
        languages: z.array(z.string())
      }),
      execute: async (args: any) => {
        return {
          findings: [
            {
              pipeline: 'user-events-etl',
              file: 'src/pipelines/events.py',
              line: 42,
              issue: 'hardcoded_schema',
              downstreamConsumers: ['marketing_dashboard', 'billing_sync'],
              severity: 'HIGH'
            }
          ]
        };
      }
    },

    check_data_contracts: {
      description: 'Verify that data producers and consumers have formal schema agreements.',
      parameters: z.object({
        repoPath: z.string(),
        contractFormats: z.array(z.string())
      }),
      execute: async (args: any) => {
        return {
          producerConsumerPairs: [
            {
              producer: 'checkout-service',
              consumer: 'revenue-reporting',
              hasContract: false,
              contractFormat: null,
              isValidated: false,
              riskOfBreaking: 'HIGH'
            }
          ]
        };
      }
    },

    check_vector_embedding_drift: {
      description: 'Check if vector embeddings in RAG systems are built with a mismatched model.',
      parameters: z.object({
        repoPath: z.string(),
        vectorDbConfig: z.string()
      }),
      execute: async (args: any) => {
        return {
          findings: [
            {
              indexName: 'docs_index_v1',
              embeddingModel: 'text-embedding-ada-002',
              queryModel: 'text-embedding-3-small',
              modelMismatch: true,
              embeddingAge: '45 days',
              severity: 'HIGH'
            }
          ]
        };
      }
    },

    audit_dark_data: {
      description: 'Find data that is collected and stored but never accessed by any code path.',
      parameters: z.object({
        databaseUrl: z.string(),
        repoPath: z.string(),
        daysSinceLastAccess: z.number().default(90)
      }),
      execute: async (args: any) => {
        return {
          darkDataFindings: [
            {
              tableName: 'user_activity_logs_2024',
              columnName: 'raw_payload',
              rowCount: 4500000,
              lastAccessedDays: 120,
              storageSizeMb: 12500,
              isPii: false,
              recommendation: 'archive'
            }
          ],
          estimatedWastedStorageMb: 12500
        };
      }
    },

    check_data_lineage: {
      description: 'Verify that key business metrics can be traced back to their raw source.',
      parameters: z.object({
        repoPath: z.string(),
        keyMetrics: z.array(z.string())
      }),
      execute: async (args: any) => {
        return {
          findings: [
            {
              metric: 'mau',
              hasLineage: true,
              lineageDepth: 3,
              canBeTracedToRawSource: true,
              lineageGaps: []
            }
          ]
        };
      }
    },

    check_event_schema_registry: {
      description: 'Verify a centralized schema registry exists for analytics events.',
      parameters: z.object({
        repoPath: z.string(),
        analyticsProvider: z.string(),
        expectedEvents: z.array(z.string())
      }),
      execute: async (args: any) => {
        return {
          findings: [
            {
              eventName: 'User_Signed_Up_V2',
              hasRegisteredSchema: false,
              file: 'src/components/Signup.tsx',
              line: 88,
              severity: 'MEDIUM'
            }
          ],
          unregisteredEventCount: 14
        };
      }
    },

    check_data_quality: {
      description: 'Run statistical checks on key tables to detect data corruption.',
      parameters: z.object({
        databaseUrl: z.string(),
        tables: z.array(z.object({
          tableName: z.string(),
          columns: z.array(z.object({ name: z.string(), expectedType: z.string(), nullableOk: z.boolean() }))
        }))
      }),
      execute: async (args: any) => {
        return {
          findings: [
            {
              tableName: 'subscriptions',
              columnName: 'stripe_customer_id',
              issueType: 'high_null_rate',
              affectedRowPercent: 4.5,
              severity: 'HIGH'
            }
          ]
        };
      }
    },

    measure_ci_reliability: {
      description: 'Analyse CI/CD pipeline run history for the past week.',
      parameters: z.object({
        repoPath: z.string(),
        ciPlatform: z.enum(["github_actions", "gitlab_ci", "jenkins", "circleci"]),
        lookbackDays: z.number().default(7)
      }),
      execute: async (args: any) => {
        return {
          totalRuns: 145,
          passRate: 88.5,
          flakyFailureRate: 4.2,
          meanTimeToGreenMinutes: 14,
          longestBuildMinutes: 45,
          mostCommonFailureStep: 'e2e-tests-playwright',
          weekOverWeekTrend: 'worsening'
        };
      }
    },

    check_local_env_parity: {
      description: 'Compare local dev configuration with production configuration.',
      parameters: z.object({
        repoPath: z.string()
      }),
      execute: async (args: any) => {
        return {
          findings: [
            {
              type: 'version_mismatch',
              description: 'Local Redis is v6, Prod is v7',
              productionValue: '7.2',
              localValue: '6.0',
              severity: 'MEDIUM'
            }
          ],
          hasDevContainerOrDockerCompose: true,
          hasMakefile: true
        };
      }
    },

    measure_onboarding_time: {
      description: 'Estimate how long it takes a new developer to get to "first successful local run".',
      parameters: z.object({
        repoPath: z.string()
      }),
      execute: async (args: any) => {
        return {
          estimatedOnboardingHours: 4.5,
          setupStepCount: 12,
          manualStepsCount: 8,
          automatedStepsCount: 4,
          blockers: [
            {
              type: 'undocumented_step',
              description: 'Missing step to provision AWS SSO credentials',
              file: 'README.md',
              estimatedTimeHours: 1.5
            }
          ]
        };
      }
    },

    check_build_test_latency: {
      description: 'Measure local test suite and build time. Flag if > 5 minutes.',
      parameters: z.object({
        repoPath: z.string(),
        buildCommand: z.string(),
        testCommand: z.string()
      }),
      execute: async (args: any) => {
        return {
          buildTimeSeconds: 45,
          testTimeSeconds: 420,
          exceedsFlowThreshold: true,
          slowestTestFiles: [
            { file: 'src/services/billing.test.ts', durationSeconds: 140 }
          ],
          slowestBuildSteps: ['tsc typechecking'],
          recommendations: ['Split billing tests', 'Use swc instead of tsc']
        };
      }
    },

    audit_tooling_fragmentation: {
      description: 'Find redundant tools doing the same job.',
      parameters: z.object({
        repoPath: z.string()
      }),
      execute: async (args: any) => {
        return {
          redundantTools: [
            {
              category: 'task runner',
              tools: ['npm scripts', 'Makefile', 'justfile'],
              recommendation: 'Standardize on justfile'
            }
          ],
          totalTools: 24,
          redundancyScore: 45
        };
      }
    },

    check_alert_fatigue: {
      description: 'Analyse monitoring alert configurations for high-volume noise.',
      parameters: z.object({
        repoPath: z.string(),
        monitoringProvider: z.enum(["datadog", "pagerduty", "grafana", "cloudwatch", "custom"])
      }),
      execute: async (args: any) => {
        return {
          alertStats: {
            totalAlertsPerWeek: 1450,
            actionableAlertPercent: 12,
            noiseAlertPercent: 88,
            meanTimeToAcknowledge: 45
          },
          noisyAlerts: [
            {
              alertName: 'High CPU on worker node',
              firesPerWeek: 450,
              actionTakenPercent: 2,
              recommendation: 'tune'
            }
          ]
        };
      }
    },

    check_golden_paths: {
      description: 'Check if the repo has standardized service templates.',
      parameters: z.object({
        repoPath: z.string()
      }),
      execute: async (args: any) => {
        return {
          hasServiceTemplates: true,
          templateDirectories: ['packages/create-service'],
          serviceCount: 14,
          inconsistentServices: [
            {
              serviceName: 'legacy-auth',
              deviatesFrom: 'node-express-template',
              deviations: ['Using CommonJS', 'Missing Datadog tracing']
            }
          ]
        };
      }
    },

    check_analytics_coverage: {
      description: 'Verify that key business metrics are tracked with code-level events.',
      parameters: z.object({
        repoPath: z.string(),
        requiredMetrics: z.array(z.string())
      }),
      execute: async (args: any) => {
        return {
          findings: [
            {
              metric: 'churn',
              hasTrackingCode: false,
              trackingFiles: [],
              severity: 'MEDIUM'
            }
          ]
        };
      }
    },

    compare_with_prior_week: {
      description: 'Load last week\'s Data & DX report and compute week-over-week deltas.',
      parameters: z.object({
        repoId: z.string(),
        currentMetrics: z.object({}).passthrough()
      }),
      execute: async (args: any) => {
        return {
          improvements: ['CI pass rate improved by 5%'],
          regressions: ['Build latency increased by 45s'],
          newIssues: ['Vector embedding drift detected'],
          resolvedIssues: ['Redundant task runner removed'],
          trendSummary: 'Stable with slight CI improvements but worsening build times.'
        };
      }
    },

    submit_data_dx_report: {
      description: 'Submit the final DataDXAgentResult JSON to end the run.',
      parameters: z.object({
        agentType: z.literal("data_dx"),
        runId: z.string(),
        repoId: z.string(),
        weekStartDate: z.string(),
        executedAt: z.string().datetime(),
        
        overallTeamHealthScore: z.number().min(0).max(100),
        ciReliabilityScore: z.number().min(0).max(100),
        dataQualityScore: z.number().min(0).max(100),
        dxScore: z.number().min(0).max(100),
        
        weekOverWeekTrend: z.enum(["significantly_improving", "improving", "stable", "worsening", "significantly_worsening"]),
        
        highlights: z.array(z.string()),
        concerns: z.array(z.string()),
        
        findings: z.array(z.object({
          id: z.string(),
          severity: z.enum(["HIGH", "MEDIUM", "LOW", "INFO"]),
          category: z.enum([
            "PIPELINE_ENTANGLEMENT", "MISSING_DATA_CONTRACT", "EMBEDDING_DRIFT",
            "DARK_DATA", "DATA_LINEAGE", "SCHEMA_REGISTRY", "DATA_QUALITY",
            "FLAKY_CI", "ENV_PARITY", "ONBOARDING_LATENCY", "BUILD_LATENCY",
            "TOOLING_FRAGMENTATION", "ALERT_FATIGUE", "MISSING_GOLDEN_PATH",
            "ANALYTICS_DEBT", "DATA_ACCESS_CONTROL", "RETENTION_VIOLATION"
          ]),
          title: z.string(),
          description: z.string(),
          file: z.string().nullable(),
          line: z.number().nullable(),
          toolName: z.string(),
          rawEvidence: z.string(),
          isNewThisWeek: z.boolean(),
          weekOverWeekChange: z.enum(["new", "worsened", "unchanged", "improved"]),
          recommendation: z.string()
        })),
        
        teamMetrics: z.object({
          ciPassRatePercent: z.number(),
          meanTimeToGreenMinutes: z.number(),
          estimatedOnboardingHours: z.number(),
          buildTimeSeconds: z.number(),
          testTimeSeconds: z.number(),
          alertNoisePercent: z.number().nullable()
        }),
        
        toolsExecuted: z.array(z.object({
          toolName: z.string(),
          calledAt: z.string().datetime(),
          durationMs: z.number(),
          resultSummary: z.string()
        }))
      }),
      execute: async (args: any) => {
        return { success: true, message: "Data & DX report submitted." };
      }
    }
  };
};
