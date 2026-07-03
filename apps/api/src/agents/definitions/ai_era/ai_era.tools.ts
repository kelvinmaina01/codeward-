import { z } from 'zod';
import type { SandboxHandle } from '../../core/provider.js';
import { createSandboxTools } from '../../tools/sandbox.tools.js';
import { createMemoryTools } from '../../tools/memory.tools.js';

function grepLines(stdout: string) {
  return stdout.split('\n').filter(Boolean).map(line => {
    const [file, lineNo, ...rest] = line.split(':');
    return { file, line: Number(lineNo) || null, snippet: rest.join(':').trim().slice(0, 200) };
  });
}

export const createAIEraTools = (sandbox: SandboxHandle) => {
  const baseTools = createSandboxTools(sandbox);

  return {
    ...baseTools,

    inject_prompt_payloads: {
      description: 'Requires firing live payloads at a deployed LLM-connected endpoint. Not available in this clone-and-analyze pipeline.',
      parameters: z.object({ baseUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance available to send adversarial requests to.' })
    },

    check_system_prompt_leakage: {
      description: 'Requires firing live extraction attempts at a deployed LLM endpoint. Not available in this clone-and-analyze pipeline.',
      parameters: z.object({ baseUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance available.' })
    },

    check_token_spend_controls: {
      description: 'Real grep for LLM API call sites missing max_tokens. Cannot simulate a live cost attack — that half honestly does not run here.',
      parameters: z.object({}),
      execute: async () => {
        const res = await sandbox.exec(`grep -rn --include="*.ts" --include="*.js" -B2 -A5 -E "\\.(chat\\.completions\\.create|generateText)\\(" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -100`);
        const hasMaxTokensNearby = res.stdout.includes('max_tokens') || res.stdout.includes('maxTokens');
        const callSites = await sandbox.exec(`grep -rn --include="*.ts" --include="*.js" -E "\\.(chat\\.completions\\.create|generateText)\\(" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -30`);
        return { staticFindings: grepLines(callSites.stdout).map(f => ({ ...f, hasMaxTokensNearby })), dynamicFindings: { applicable: false, reason: 'No running instance to simulate a live cost attack against.' } };
      }
    },

    validate_llm_output_schemas: {
      description: 'Real grep for LLM output being written directly to a DB call without a nearby schema-validation call (zod/joi/yup parse).',
      parameters: z.object({}),
      execute: async () => {
        const res = await sandbox.exec(`grep -rn --include="*.ts" --include="*.js" -B3 -E "db\\.(insert|update).*\\.(text|content|message)\\b" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -60`);
        const hasValidation = /\.parse\(|\.safeParse\(/.test(res.stdout);
        return { note: hasValidation ? 'Validation calls found nearby some DB writes — manual review still recommended.' : 'No zod/joi/yup .parse()/.safeParse() found near DB writes that appear to use LLM output.', rawContext: res.stdout.slice(0, 3000) };
      }
    },

    check_vector_index_freshness: {
      description: 'Real check only for pgvector via direct Postgres connection. Other vector DBs need their own live SDK connection this pipeline does not have.',
      parameters: z.object({ vectorDb: z.enum(['pgvector', 'pinecone', 'weaviate', 'qdrant', 'chroma']).optional(), databaseUrl: z.string().optional(), sourceTableName: z.string().optional(), embeddingTableName: z.string().optional() }),
      execute: async (args: any) => {
        if (args.vectorDb !== 'pgvector' || !args.databaseUrl || !args.sourceTableName || !args.embeddingTableName) {
          return { applicable: false, reason: 'Only pgvector is checkable here, and needs databaseUrl + both table names.' };
        }
        const postgres = (await import('postgres')).default;
        const isLocal = args.databaseUrl.includes('localhost');
        const sql = postgres(args.databaseUrl, { prepare: false, ssl: isLocal ? false : 'require', connect_timeout: 10 });
        try {
          const [source] = await sql`SELECT COUNT(*) as count FROM ${sql(args.sourceTableName)}`;
          const [embed] = await sql`SELECT COUNT(*) as count FROM ${sql(args.embeddingTableName)}`;
          return { totalSourceRecords: Number(source.count), totalEmbeddings: Number(embed.count), missingEmbeddings: Math.max(0, Number(source.count) - Number(embed.count)) };
        } finally { await sql.end({ timeout: 5 }); }
      }
    },

    check_pii_in_ai_pipelines: {
      description: 'Real grep for caller-supplied PII regex patterns near logging or LLM-context-construction code.',
      parameters: z.object({ piiPatterns: z.array(z.object({ name: z.string(), regex: z.string() })) }),
      execute: async (args: { piiPatterns: { name: string; regex: string }[] }) => {
        const findings = [];
        for (const p of args.piiPatterns) {
          try {
            const res = await sandbox.exec(`grep -rn --include="*.ts" --include="*.js" -E "${p.regex}" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -10`);
            const matches = grepLines(res.stdout);
            if (matches.length) findings.push({ patternName: p.name, matches });
          } catch { /* invalid regex from caller, skip */ }
        }
        return { findings };
      }
    },

    check_hallucination_trust_patterns: {
      description: 'Real grep for LLM response fields written directly into sensitive sinks (DB writes, payment calls) with no validation call between them.',
      parameters: z.object({}),
      execute: async () => {
        const res = await sandbox.exec(`grep -rn --include="*.ts" --include="*.js" -E "(charge|payment|db\\.(insert|update))\\(.*\\.(response|completion|choices)\\[" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -30`);
        return { findings: grepLines(res.stdout) };
      }
    },

    check_missing_human_in_loop: {
      description: 'Real grep for destructive-sounding function calls (delete/ban/terminate/charge) located near LLM decision output with no nearby approval-check keyword.',
      parameters: z.object({ destructivePatterns: z.array(z.string()).optional().default(['delete', 'ban', 'terminate', 'charge', 'refund']) }),
      execute: async (args: { destructivePatterns?: string[] }) => {
        const pattern = (args.destructivePatterns ?? []).join('|');
        const res = await sandbox.exec(`grep -rn --include="*.ts" --include="*.js" -iE "(${pattern})\\(" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | grep -iE "llm|ai\\.|completion" | grep -viE "approv|confirm|review" | head -30`);
        return { findings: grepLines(res.stdout) };
      }
    },

    check_rag_context_bloat: {
      description: 'Requires firing live queries at a deployed RAG endpoint. Not available in this clone-and-analyze pipeline.',
      parameters: z.object({ baseUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance available.' })
    },

    check_model_version_lock: {
      description: 'Real grep for hardcoded, dated/versioned LLM model ID strings that are candidates for deprecation.',
      parameters: z.object({}),
      execute: async () => {
        const res = await sandbox.exec(`grep -rn --include="*.ts" --include="*.js" -E "(gpt-[0-9]|claude-[0-9]|text-embedding-)[a-z0-9.-]*-[0-9]{4,8}" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -30`);
        return { findings: grepLines(res.stdout) };
      }
    },

    check_nondeterministic_ui: {
      description: 'Requires rendering a live app multiple times and diffing screenshots. Not available in this clone-and-analyze pipeline.',
      parameters: z.object({ baseUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance to render.' })
    },

    check_ai_attribution: {
      description: 'Real `git log` scan for commits whose message pattern suggests AI-assisted authorship, checking for attribution metadata.',
      parameters: z.object({ lookbackCommits: z.number().optional().default(50) }),
      execute: async (args: { lookbackCommits?: number }) => {
        const res = await sandbox.exec(`git log -n ${args.lookbackCommits ?? 50} --pretty=format:"%H|%s"`);
        const commits = res.stdout.split('\n').filter(Boolean);
        const aiLike = commits.filter(c => /claude|copilot|gpt|ai-generated|cursor/i.test(c));
        const withAttribution = aiLike.filter(c => /co-authored-by|generated-by/i.test(c));
        return { totalCommitsScanned: commits.length, likelyAiAssistedCommits: aiLike.length, withAttributionMetadata: withAttribution.length };
      }
    },

    check_evasive_ai_tests: {
      description: 'Real grep for test files that mock the entire LLM client rather than testing real integration.',
      parameters: z.object({}),
      execute: async () => {
        const res = await sandbox.exec(`grep -rln --include="*.test.ts" --include="*.test.js" --include="*.spec.ts" -iE "jest\\.mock\\(.(openai|anthropic)|vi\\.mock\\(.(openai|anthropic)" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -30`);
        return { filesFullyMockingLlm: res.stdout.split('\n').filter(Boolean) };
      }
    },

    check_training_data_exposure: {
      description: 'Real grep for logging calls capturing raw user input that gets sent to external analytics/logging providers.',
      parameters: z.object({ loggingLibraries: z.array(z.string()).optional().default(['datadog', 'sentry', 'mixpanel', 'amplitude']) }),
      execute: async (args: { loggingLibraries?: string[] }) => {
        const pattern = (args.loggingLibraries ?? []).join('|');
        const res = await sandbox.exec(`grep -rln --include="*.ts" --include="*.js" -iE "${pattern}" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -20`);
        const files = res.stdout.split('\n').filter(Boolean);
        const findings = [];
        for (const f of files.slice(0, 10)) {
          const userInput = await sandbox.exec(`grep -n -iE "req\\.body|userInput|user_input" "${f}" 2>/dev/null | head -3`);
          if (userInput.stdout.trim()) findings.push({ file: f, evidence: userInput.stdout.slice(0, 300) });
        }
        return { findings };
      }
    },

    check_model_bias: {
      description: 'Requires firing live test payloads at a deployed AI-ranking endpoint. Not available in this clone-and-analyze pipeline.',
      parameters: z.object({ baseUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance available to test.' })
    },

    submit_ai_era_report: {
      description: 'Submit the final AIEraAgentResult JSON to end the run.',
      parameters: z.object({
        agentType: z.literal("ai_era"), runId: z.string(), repoId: z.string(), commitSha: z.string(), executedAt: z.string().datetime(),
        score: z.number().min(0).max(100), gateDecision: z.enum(["PASS", "WARN", "BLOCK"]),
        promptInjectionVulnerable: z.boolean(), systemPromptLeaking: z.boolean(), ragIndexFresh: z.boolean().nullable(),
        findings: z.array(z.object({
          id: z.string(), severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]),
          category: z.enum(["PROMPT_INJECTION", "TOKEN_SPEND", "UNVALIDATED_OUTPUT", "MODEL_VERSION", "PII_IN_PIPELINE", "NO_AI_RATE_LIMIT", "HALLUCINATION_TRUST", "TRAINING_EXPOSURE", "SYSTEM_PROMPT_LEAK", "UI_DRIFT", "STALE_VECTOR_INDEX", "AI_LOGIC_SHIFT", "AI_ATTRIBUTION", "PROMPT_VERSION", "RAG_CONTEXT_BLOAT", "MISSING_HITL", "MODEL_BIAS", "EVASIVE_AI_TEST"]),
          title: z.string(), description: z.string(), file: z.string().nullable(), line: z.number().nullable(), toolName: z.string(), rawEvidence: z.string(),
          adversarialPayload: z.string().nullable(), dismissed: z.boolean().default(false)
        })),
        toolsExecuted: z.array(z.object({ toolName: z.string(), calledAt: z.string().datetime(), durationMs: z.number(), resultSummary: z.string() }))
      }),
      execute: async (args: any) => ({ success: true, message: "AI-Era report submitted." })
    },

    ...createMemoryTools('ai_era')
  };
};
