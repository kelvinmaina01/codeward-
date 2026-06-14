import { z } from 'zod';
import type { SandboxHandle } from '../../core/provider.js';
import { createSandboxTools } from '../../tools/sandbox.tools.js';

export const createComplianceTools = (sandbox: SandboxHandle) => {
  const baseTools = createSandboxTools(sandbox);

  return {
    ...baseTools,

    scan_data_retention: {
      description: 'Find PII retained beyond business necessity or legal limits.',
      parameters: z.object({
        databaseUrl: z.string(),
        piiTableNames: z.array(z.string()),
        retentionPolicies: z.array(z.object({
          tableName: z.string(),
          maxRetentionDays: z.number()
        }))
      }),
      execute: async (args: any) => {
        return {
          findings: [
            {
              tableName: 'users',
              columnName: 'deleted_at',
              oldestRecordAgeDays: 450,
              policyMaxDays: 30,
              excessRecordCount: 12540,
              severity: 'HIGH'
            }
          ]
        };
      }
    },

    check_rtbf_implementation: {
      description: 'Verify Right to Be Forgotten works end-to-end (backups, logs, vectors).',
      parameters: z.object({
        baseUrl: z.string(),
        databaseUrl: z.string(),
        repoPath: z.string(),
        testUserId: z.string()
      }),
      execute: async (args: any) => {
        return {
          deletionCoverage: {
            primaryDb: true,
            backupDb: false,
            auditLogs: true,
            vectorEmbeddings: false,
            analyticsEvents: true,
            emailLogs: false
          },
          uncoveredSources: ['vectorEmbeddings', 'emailLogs', 'backupDb'],
          severity: 'HIGH'
        };
      }
    },

    check_consent_versioning: {
      description: 'Verify that consent terms are versioned and matched against data use.',
      parameters: z.object({
        databaseUrl: z.string(),
        repoPath: z.string(),
        consentTableName: z.string().optional(),
        currentConsentVersion: z.string()
      }),
      execute: async (args: any) => {
        return {
          findings: [
            {
              type: 'scope_mismatch',
              description: 'Using data collected under v1.0 (no AI consent) for new AI training pipeline.',
              affectedUserCount: 84000,
              severity: 'HIGH'
            }
          ]
        };
      }
    },

    run_wcag_accessibility_scan: {
      description: 'Run axe-core against the app UI to check WCAG 2.2 compliance.',
      parameters: z.object({
        baseUrl: z.string(),
        pages: z.array(z.object({ path: z.string(), name: z.string() })),
        wcagLevel: z.enum(["A", "AA", "AAA"]).default("AA")
      }),
      execute: async (args: any) => {
        return {
          violations: [
            {
              id: 'color-contrast',
              impact: 'serious',
              description: 'Elements must have sufficient color contrast',
              wcagCriteria: 'WCAG 2.2 1.4.3',
              helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/color-contrast',
              nodes: [{ html: '<button class="bg-gray-100 text-white">Submit</button>', target: ['#submit'] }]
            }
          ],
          passCount: 45,
          violationCount: 1,
          incompleteCount: 0
        };
      }
    },

    check_eu_ai_act_compliance: {
      description: 'Check if AI systems have required risk classifications and oversight.',
      parameters: z.object({
        repoPath: z.string(),
        aiSystemDescriptions: z.array(z.object({
          name: z.string(),
          purpose: z.string(),
          affectedDomain: z.string()
        }))
      }),
      execute: async (args: any) => {
        return {
          riskClassifications: [
            {
              systemName: 'CandidateScreeningAI',
              classifiedRisk: 'high',
              hasRiskAssessment: false,
              hasTransparencyLog: true,
              hasHumanOversight: false,
              hasIncidentReporting: false,
              complianceGaps: ['Missing Risk Assessment', 'Missing Human Oversight']
            }
          ]
        };
      }
    },

    check_audit_trail_integrity: {
      description: 'Verify sensitive operations have immutable, signed audit logs.',
      parameters: z.object({
        repoPath: z.string(),
        databaseUrl: z.string(),
        sensitiveOperations: z.array(z.string())
      }),
      execute: async (args: any) => {
        return {
          auditLogCoverage: [
            {
              operation: 'user.delete',
              hasAuditLog: true,
              isImmutable: false,
              isCryptographicallySigned: false,
              retentionPeriodDays: 365
            }
          ],
          findings: [
            {
              operation: 'user.delete',
              gap: 'Audit log is mutable and unsigned (vulnerable to tampering)',
              severity: 'HIGH'
            }
          ]
        };
      }
    },

    check_nhi_compliance: {
      description: 'Find unmanaged service accounts and machine-to-machine keys.',
      parameters: z.object({
        repoPath: z.string(),
        cloudProvider: z.enum(["aws", "gcp", "azure", "none"]),
        checkKubernetes: z.boolean()
      }),
      execute: async (args: any) => {
        return {
          findings: [
            {
              identityType: 'api_key',
              file: 'src/config/stripe.ts',
              line: 14,
              isManaged: false,
              rotationPolicy: 'none',
              lastRotatedDays: null,
              severity: 'HIGH'
            }
          ]
        };
      }
    },

    check_shadow_ai_usage: {
      description: 'Detect unauthorized LLMs or AI tools with company data.',
      parameters: z.object({
        repoPath: z.string(),
        checkForAIApiCalls: z.boolean(),
        allowedAIProviders: z.array(z.string())
      }),
      execute: async (args: any) => {
        return {
          findings: [
            {
              type: 'unauthorized_ai_provider',
              file: 'src/scripts/data_cleanup.ts',
              line: 42,
              providerUrl: 'api.mistral.ai',
              severity: 'MEDIUM'
            }
          ]
        };
      }
    },

    check_data_minimization: {
      description: 'Find data fields collected but never used.',
      parameters: z.object({
        databaseUrl: z.string(),
        repoPath: z.string()
      }),
      execute: async (args: any) => {
        return {
          unusedPiiColumns: [
            {
              tableName: 'users',
              columnName: 'mother_maiden_name',
              piiType: 'sensitive',
              lastAccessedDays: 780,
              recommendation: 'remove'
            }
          ]
        };
      }
    },

    check_cross_border_data: {
      description: 'Check if PII data is being stored in non-compliant regions.',
      parameters: z.object({
        databaseUrl: z.string(),
        cloudProvider: z.string(),
        configuredRegions: z.array(z.string()),
        userLocations: z.array(z.string())
      }),
      execute: async (args: any) => {
        return {
          findings: [
            {
              dataType: 'user_profiles',
              storedInRegion: 'us-east-1',
              userJurisdiction: 'EU',
              isCompliant: false,
              legalBasis: null,
              severity: 'HIGH'
            }
          ]
        };
      }
    },

    check_algorithmic_impact: {
      description: 'Flag automated decision systems without fairness audits.',
      parameters: z.object({
        repoPath: z.string(),
        highRiskDomains: z.array(z.string())
      }),
      execute: async (args: any) => {
        return {
          findings: [
            {
              systemName: 'CreditScoreCalculator',
              file: 'src/services/credit.ts',
              line: 88,
              domain: 'credit',
              hasImpactAssessment: false,
              hasBiasAudit: false,
              hasFairnessMetrics: false,
              severity: 'HIGH'
            }
          ]
        };
      }
    },

    compare_with_prior_run: {
      description: 'Compare current findings with the last compliance run to surface NEW issues.',
      parameters: z.object({
        repoId: z.string(),
        currentFindings: z.array(z.object({}).passthrough()),
        lookbackRuns: z.number().default(1)
      }),
      execute: async (args: any) => {
        return {
          newFindings: args.currentFindings, // Simulate all are new for the test
          resolvedFindings: [],
          worsenedFindings: [],
          unchangedFindingsCount: 0
        };
      }
    },

    submit_compliance_report: {
      description: 'Submit the final ComplianceAgentResult JSON to end the run.',
      parameters: z.object({
        agentType: z.literal("compliance"),
        runId: z.string(),
        repoId: z.string(),
        triggerType: z.enum(["scheduled", "on_push"]),
        executedAt: z.string().datetime(),
        
        score: z.number().min(0).max(100),
        riskLevel: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "CLEAN"]),
        
        newFindingsSinceLastRun: z.number(),
        resolvedSinceLastRun: z.number(),
        
        findings: z.array(z.object({
          id: z.string(),
          severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]),
          category: z.enum([
            "DATA_RETENTION", "RTBF", "CONSENT_VERSIONING", "ACCESSIBILITY",
            "EU_AI_ACT", "AUDIT_TRAIL", "NHI", "SHADOW_AI", "DATA_MINIMIZATION",
            "CROSS_BORDER", "ALGORITHMIC_IMPACT"
          ]),
          legalFramework: z.string().nullable(),
          title: z.string(),
          description: z.string(),
          file: z.string().nullable(),
          line: z.number().nullable(),
          toolName: z.string(),
          rawEvidence: z.string(),
          estimatedFinePotential: z.string().nullable(),
          remediationSteps: z.array(z.string()),
          dismissed: z.boolean().default(false),
          isNewThisRun: z.boolean()
        })),
        
        toolsExecuted: z.array(z.object({
          toolName: z.string(),
          calledAt: z.string().datetime(),
          durationMs: z.number(),
          resultSummary: z.string()
        }))
      }),
      execute: async (args: any) => {
        return { success: true, message: "Compliance report submitted." };
      }
    }
  };
};
