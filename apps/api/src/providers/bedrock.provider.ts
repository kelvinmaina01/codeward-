/**
 * ============================================================================
 * Amazon Bedrock Provider — Converse API
 * ============================================================================
 *
 * Implements the same low-level AgentProvider contract as NativeOpenAIProvider, so it can be
 * handed to `runAgentLoop()` without touching the loop or any agent definition.
 *
 * The loop speaks OpenAI's wire format (assistant messages carrying `tool_calls`, results sent
 * back as `role: 'tool'`). Bedrock's Converse API uses content blocks instead: `toolUse` on the
 * assistant turn and `toolResult` on a *user* turn. This provider therefore translates in both
 * directions — OpenAI-shaped history in, Converse out; Converse response in, OpenAI-shaped
 * `rawContent` out — so the history the loop accumulates stays in one consistent format and
 * nothing upstream needs to know which provider served the call.
 *
 * FinOps: Bedrock prompt caching is opt-in AND capability-gated. Unlike OpenAI, which caches long
 * prefixes automatically, Bedrock only caches where an explicit `cachePoint` block is placed —
 * and only on models whose per-model request schema actually models that key. This architecture
 * re-sends a large static prefix (system prompt + tool schemas) on every step of every run, so
 * without those markers a migration would pay full input rate on all of it. Two cache points are
 * inserted, after each static block, but only when `modelSupportsExplicitCaching()` says the
 * candidate accepts them — see that function for why sending them blindly is fatal.
 * ============================================================================
 */

import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
  type Message,
  type SystemContentBlock,
  type Tool,
  type ToolConfiguration,
} from '@aws-sdk/client-bedrock-runtime';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { AgentProvider, AgentRunConfig, AgentResult, AgentTool } from './openai.provider.js';

/**
 * Cross-region inference profiles are GEO-SCOPED, and this is the whole reason Bedrock worked
 * locally and failed on Fargate.
 *
 * A `us.`-prefixed profile is only resolvable from a US region; calling it from eu-north-1 fails
 * with "The provided model identifier is invalid." The bedrock client below defaults to
 * `us-east-1` when AWS_REGION is unset — true on a laptop — but ECS injects AWS_REGION=eu-north-1
 * (infra/ecs-services.yaml sets BEDROCK_REGION to the stack's own region), so the same image
 * silently switched regions in production while the model ids stayed `us.`.
 *
 * Deriving the prefix from the runtime region is what makes one image correct in every
 * deployment. Every candidate list below also ends on a `global.` profile, which is resolvable
 * from any commercial source region and is therefore the backstop when a geo profile is missing.
 */
function bedrockGeoPrefix(): string {
  const region = (process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1').toLowerCase();
  if (region.startsWith('eu-')) return 'eu.';
  if (region.startsWith('ap-')) return 'apac.';
  // us-*, and anything unrecognised, keeps today's behaviour rather than guessing a new geo.
  return 'us.';
}

/**
 * Whether a model's Bedrock request schema accepts explicit `cachePoint` blocks.
 *
 * This is NOT a Converse-API question. The AWS SDK models `cachePoint` in `Tool`,
 * `SystemContentBlock` and `ContentBlock` unconditionally, so a request carrying one serializes
 * and ships fine. Bedrock then validates the translated payload against the *target model's* own
 * schema, which is strict, and a model without prompt-caching support answers:
 *
 *   Malformed input request: #/toolConfig/tools/3: extraneous key [cachePoint] is not permitted
 *
 * That is a hard failure of the whole call, not a degradation — which is why the marker has to be
 * gated on the model rather than sent hopefully. The allow-list mirrors AWS's "Supported models,
 * Regions, and explicit caching limits" table; the deny-list runs first because several
 * unsupported ids contain substrings the allow-list would otherwise match (`claude-3-5-sonnet`
 * matches both the unsupported 20240620 v1 and the supported 20241022 v2).
 */
export function modelSupportsExplicitCaching(modelId: string): boolean {
  const m = (modelId || '').toLowerCase().replace(/^(us|eu|apac|global)\./, '');

  // Deny-list first — these are explicitly absent from AWS's supported-caching table.
  if (m.includes('claude-3-5-sonnet-20240620')) return false; // 3.5 Sonnet v1
  if (m.includes('claude-3-5-haiku')) return false;
  if (m.includes('claude-3-haiku') || m.includes('claude-3-sonnet') || m.includes('claude-3-opus')) return false;
  if (m.includes('claude-opus-4-1') || m.includes('claude-sonnet-4-2025')) return false;

  return (
    m.includes('claude-fable-5') ||
    m.includes('claude-mythos') ||
    m.includes('claude-opus-5') ||
    m.includes('claude-opus-4-8') ||
    m.includes('claude-opus-4-7') ||
    m.includes('claude-opus-4-6') ||
    m.includes('claude-opus-4-5') ||
    m.includes('claude-sonnet-5') ||
    m.includes('claude-sonnet-4-6') ||
    m.includes('claude-sonnet-4-5') ||
    m.includes('claude-haiku-4-5') ||
    m.includes('claude-3-7-sonnet') ||
    m.includes('claude-3-5-sonnet-20241022')
  );
}

/**
 * Whether a model honours `toolChoice: { any: {} }` (forced tool use).
 *
 * The agent contract leans on this: every run is supposed to terminate by calling its `submit_*`
 * tool. Anthropic models on Bedrock honour `any`. Amazon Nova does NOT — every Nova variant
 * probed (micro, lite, pro, bare and geo-prefixed) fails `any` with
 * `ModelErrorException: Model produced invalid sequence as part of ToolUse`, while the identical
 * request with `toolChoice: { auto: {} }` succeeds.
 *
 * This is the same class of defect as the cachePoint crash — a per-model capability hardcoded
 * into the payload — so it gets the same treatment: a gate up front, plus a runtime self-heal for
 * when the gate is wrong.
 *
 * CONSEQUENCE, and it is a real one: under `auto` the model is free to answer with prose instead
 * of calling `submit_*`. Nova is therefore an AVAILABILITY tier, not a quality-equivalent one —
 * runs served by it are likelier to come back as text and be marked `truncated` by the agent
 * loop. That is the intended trade when the alternative is total downtime.
 */
export function modelSupportsForcedToolChoice(modelId: string): boolean {
  const m = (modelId || '').toLowerCase();
  if (m.includes('amazon.nova') || m.includes('amazon.titan')) return false;
  if (m.includes('meta.llama') || m.includes('mistral.')) return false;
  return m.includes('anthropic.');
}

/**
 * Maps a logical model name onto an ordered list of Bedrock model or inference profile IDs.
 *
 * Ordering rule: VERIFIED-INVOKABLE first, cache-capable before not, then backstops. Listing a
 * profile with `list-inference-profiles` is necessary but NOT sufficient — a profile can be
 * ACTIVE and still refuse every invocation for account reasons, so each id below was probed with
 * a real one-token ConverseCommand rather than trusted from the listing.
 *
 * Probe snapshot, us-east-1, 2026-09-18 — a POINT-IN-TIME observation, not a standing guarantee.
 * Account entitlement moved underneath this list during the very session that produced it (see
 * caveat 1), which is itself the argument for keeping the runtime ladder rather than pinning one id:
 *   INVOKABLE  us.anthropic.claude-sonnet-4-5-20250929-v1:0   cache-capable (1,024-token minimum)
 *   INVOKABLE  us.anthropic.claude-haiku-4-5-20251001-v1:0    cache-capable (4,096-token minimum)
 *   INVOKABLE  us.anthropic.claude-opus-4-5-20251101-v1:0     cache-capable (4,096-token minimum)
 *   INVOKABLE  us.anthropic.claude-sonnet-4-20250514-v1:0     no caching  -> gate turns it off
 *   INVOKABLE  us.anthropic.claude-3-haiku-20240307-v1:0      no caching  -> gate turns it off
 *   BLOCKED    us.anthropic.claude-sonnet-5                   AccessDenied: not available for this account
 *   BLOCKED    us.anthropic.claude-sonnet-4-6                 ResourceNotFound: Anthropic use-case form not submitted
 *   BLOCKED    every global.* profile                         ResourceNotFound: Anthropic use-case form not submitted
 *   BLOCKED    us.anthropic.claude-3-sonnet-20240229-v1:0     end of life
 *
 * The five ids the previous list hardcoded — `claude-3-5-sonnet-20240620-v1:0` (the synthesis
 * default), `claude-3-5-sonnet-20241022-v2:0`, `claude-3-7-sonnet-20250219-v1:0` and
 * `claude-3-5-haiku-20241022-v1:0` — do not resolve in either region at all. Only
 * `claude-3-haiku-20240307-v1:0` did, which is how a no-caching legacy model came to be the one
 * that received the cache markers and crashed the run.
 *
 * THREE STANDING CAVEATS, all account-level rather than code-level. None is fixable here:
 *   1. The account is mid-enablement. Within one session the us-east-1 entitlement went from
 *      "five profiles invokable" to EVERY Anthropic model returning "Model use case details have
 *      not been submitted for this account" — `claude-3-haiku-20240307` included, which had
 *      answered a live request minutes earlier. Submit the Anthropic use-case details form in the
 *      Bedrock console and re-run the probe before trusting any ordering below.
 *   2. eu-north-1 — the ECS region — refuses every Anthropic model with "Your account is
 *      currently being verified." Until that clears, production cannot reach Bedrock on any id.
 *   3. Once entitlement settles, promote `${geo}anthropic.claude-sonnet-5` to the head of the
 *      synthesis list: it is cache-capable at a 512-token minimum (vs 1,024 for Sonnet 4.5) and
 *      strictly better than what leads today. It is omitted for now because it fails with a
 *      distinct "not available for this account" AccessDenied rather than the form gate.
 */
/**
 * Amazon Nova — the non-Anthropic safety net, appended beneath every Anthropic candidate.
 *
 * Reason it exists: with the account's Anthropic entitlement pending, EVERY Claude profile
 * returns "Model use case details have not been submitted" in us-east-1 and "Your account is
 * currently being verified" in eu-north-1. Nova is Amazon's own family and is unaffected —
 * probed live and answering in BOTH regions — so it is the difference between a degraded run
 * and total downtime.
 *
 * Geo profile first, then the bare in-region id. That order is load-bearing rather than
 * decorative: from eu-north-1, `eu.amazon.nova-*` all answer, while bare `amazon.nova-micro-v1:0`
 * and `amazon.nova-pro-v1:0` fail with "Invocation ... with on-demand throughput isn't supported"
 * (only nova-lite has a bare on-demand path there). From us-east-1 both forms answer.
 *
 * Nova accepts neither explicit cache points in `tools` nor forced tool use, and both gates
 * already return false for it, so it is driven uncached and on `toolChoice: auto`.
 */
function novaFallbackTier(geo: string, order: 'mechanical-safe' | 'most-capable-first'): string[] {
  // Use lite and pro for robust multi-tool execution. Micro is excluded from multi-tool agents to prevent sequence errors.
  const tiers = order === 'mechanical-safe' ? ['lite', 'pro'] : ['pro', 'lite'];
  const candidates = [
    // Direct verified cross-region profiles in us-east-1
    ...tiers.map((t) => `us.amazon.nova-${t}-v1:0`),
    // Target geo profile
    ...tiers.map((t) => `${geo}amazon.nova-${t}-v1:0`),
    // Bare in-region IDs
    ...tiers.map((t) => `amazon.nova-${t}-v1:0`),
  ];
  return Array.from(new Set(candidates));
}

export function resolveBedrockModelCandidates(model: string): string[] {
  const m = (model || '').toLowerCase();

  // Explicit per-run override wins
  if (process.env.BEDROCK_MODEL_ID && !m) {
    return [process.env.BEDROCK_MODEL_ID];
  }

  // Already an explicit Bedrock id / inference profile — pass through untouched
  if (m.includes('anthropic.') || m.includes('amazon.nova') || m.includes('meta.llama')) {
    return [model];
  }

  const geo = bedrockGeoPrefix();
  const isMechanical = m.includes('mini') || m.includes('haiku') || m.includes('nano') || m.includes('lite');

  if (isMechanical) {
    const candidates: string[] = [];
    if (process.env.BEDROCK_MODEL_MECHANICAL) {
      candidates.push(process.env.BEDROCK_MODEL_MECHANICAL);
    }
    candidates.push(
      // Verified invokable, cache-capable.
      `${geo}anthropic.claude-haiku-4-5-20251001-v1:0`,
      // Non-Anthropic safety net, robust multi-tool Nova models (Lite, then Pro)
      ...novaFallbackTier(geo, 'mechanical-safe'),
      // Region backstop
      'global.anthropic.claude-haiku-4-5-20251001-v1:0'
    );
    return Array.from(new Set(candidates));
  }

  // Frontier / Synthesis tier — stays Sonnet-class, as before, but on current-generation
  // profiles that actually exist and actually cache.
  const synthesisCandidates: string[] = [];
  if (process.env.BEDROCK_MODEL_SYNTHESIS) {
    synthesisCandidates.push(process.env.BEDROCK_MODEL_SYNTHESIS);
  }
  synthesisCandidates.push(
    // Verified invokable, cache-capable at a 1,024-token minimum.
    `${geo}anthropic.claude-sonnet-4-5-20250929-v1:0`,
    // Verified non-Anthropic safety net, flagship Pro first
    ...novaFallbackTier(geo, 'most-capable-first'),
    // Region backstop
    'global.anthropic.claude-sonnet-4-5-20250929-v1:0'
  );
  return Array.from(new Set(synthesisCandidates));
}

export function resolveBedrockModelId(model: string): string {
  return resolveBedrockModelCandidates(model)[0];
}

/**
 * AWS Bedrock Converse API enforces strict constraints on tool names:
 * - Pattern: ^[a-zA-Z0-9_-]+$
 * - Maximum length: 64 characters
 *
 * If an LLM hallucinates an argument signature (e.g. "read_file(candidate)"), spaces,
 * or extraneous characters, this normalizes it into a valid Bedrock identifier.
 */
export function sanitizeBedrockToolName(name: string | undefined | null): string {
  if (!name || typeof name !== 'string') return 'unknown_tool';
  // Strip common prefixes like "tools." or "Step X: " or "Step 12: "
  let clean = name.replace(/^(?:step\s*\d+[:.]\s*|tools[.:]\s*)/i, '').trim();
  // Strip argument signatures like `read_file(...)` and anything following it
  clean = clean.replace(/\(.*?\).*$/, '').trim();
  // Replace any non-alphanumeric/underscore/hyphen character with an underscore
  clean = clean.replace(/[^a-zA-Z0-9_-]/g, '_');
  // Collapse consecutive underscores and trim leading/trailing underscores
  clean = clean.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  if (!clean) return 'unknown_tool';
  return clean.slice(0, 64);
}

/**
 * AWS Bedrock Converse API requires toolUseId to match ^[a-zA-Z0-9_-]+$ and length <= 64.
 */
export function sanitizeBedrockToolUseId(id: string | undefined | null): string {
  if (!id || typeof id !== 'string') return `tool_${Date.now()}`;
  const clean = id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return clean || `tool_${Date.now()}`;
}

/**
 * One marker per union. These were previously a single constant laundered through
 * `as unknown as ContentBlock` and spread into `any`-typed arrays, so TypeScript never checked
 * either injection site — the compiler would happily have accepted a marker in a field that has
 * no `cachePoint` member. Both unions genuinely carry a `CachePointMember`, so declaring them
 * properly costs nothing and makes the tools/system distinction explicit.
 */
const SYSTEM_CACHE_POINT: SystemContentBlock = { cachePoint: { type: 'default' } };
const TOOLS_CACHE_POINT: Tool = { cachePoint: { type: 'default' } };

// NOTE: tool-name / toolUseId sanitization is defined above (sanitizeBedrockToolName,
// sanitizeBedrockToolUseId — the more thorough remote implementation, which also sanitizes the
// toolUseId and strips "step N:"/"tools:" prefixes and parenthetical suffixes). My earlier
// name-only sanitizer was superseded by it during the merge and removed to avoid a duplicate.

/** Bedrock rejects a toolResult that is not carried on a user turn, hence the role mapping. */
export function toConverseMessages(messages: any[]): Message[] {
  const out: Message[] = [];

  const pushBlock = (role: 'user' | 'assistant', block: ContentBlock) => {
    const last = out[out.length - 1];
    // Converse requires alternating turns; consecutive same-role blocks must be merged into
    // one message. This matters most for tool results, which the loop emits as N separate
    // `role: 'tool'` messages that Bedrock expects as N blocks on a single user turn.
    if (last && last.role === role) {
      (last.content as ContentBlock[]).push(block);
      return;
    }
    out.push({ role, content: [block] });
  };

  for (const msg of messages) {
    if (!msg) continue;

    if (msg.role === 'tool') {
      pushBlock('user', {
        toolResult: {
          toolUseId: sanitizeBedrockToolUseId(msg.tool_call_id ?? msg.id),
          content: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content ?? '') }],
        },
      } as unknown as ContentBlock);
      continue;
    }

    if (msg.role === 'assistant') {
      if (typeof msg.content === 'string' && msg.content.trim()) {
        pushBlock('assistant', { text: msg.content } as ContentBlock);
      }
      for (const call of msg.tool_calls ?? []) {
        let input: any = {};
        try {
          input = typeof call.function?.arguments === 'string'
            ? JSON.parse(call.function.arguments || '{}')
            : (call.function?.arguments ?? {});
        } catch {
          input = {};
        }
        pushBlock('assistant', {
          toolUse: {
            toolUseId: sanitizeBedrockToolUseId(call.id),
            name: sanitizeBedrockToolName(call.function?.name),
            input,
          },
        } as unknown as ContentBlock);
      }
      continue;
    }

    // user / system-as-user and anything else
    const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content ?? '');
    if (text.trim()) pushBlock('user', { text } as ContentBlock);
  }

  // Converse requires the conversation to open on a user turn.
  if (out.length > 0 && out[0].role !== 'user') {
    out.unshift({ role: 'user', content: [{ text: 'Begin.' } as ContentBlock] });
  }
  return out;
}

/**
 * Agent tools declare their parameters as live Zod schemas — the layer-1 provider's
 * `toolMapToArray` passes `def.parameters` straight through and NativeOpenAIProvider converts
 * them at request time. Bedrock's `inputSchema.json` expects real JSON Schema; a Zod object
 * serializes to its internal `{"_def":{...},"~standard":{...}}` shape with no `"type"` key, so
 * without this the model receives an uninterpretable parameter schema for every tool. The
 * `_def` probe mirrors the guard NativeOpenAIProvider already uses, so a tool that supplies
 * plain JSON Schema passes through untouched.
 */
function toJsonSchema(parameters: any): any {
  if (!parameters) return { type: 'object', properties: {} };
  if (parameters._def) return zodToJsonSchema(parameters);
  return parameters;
}

function toConverseTools(tools: AgentTool[] | undefined): Tool[] {
  return (tools ?? []).map((t) => ({
    toolSpec: {
      name: sanitizeBedrockToolName(t.name),
      description: t.description,
      inputSchema: { json: toJsonSchema(t.parameters) },
    },
  })) as Tool[];
}

/**
 * Bedrock requires `toolConfig` whenever the conversation history contains any toolUse or
 * toolResult block — the model needs the tool definitions to interpret its own prior turns,
 * even when it is not being offered tools now. It also rejects `tools: []`, so an empty
 * toolConfig is not a legal way to satisfy that requirement; a placeholder tool is.
 *
 * This is reached on the FINAL step of any agent with no `submit_*` tool. `agent-loop.ts`
 * narrows the tool list to terminal tools only on the last step, which yields `[]` for
 * orchestrator phase 1 and phase 2 (neither declares a submit tool) while their history is full
 * of tool blocks from earlier steps — so it failed deterministically, once per run, not
 * intermittently.
 */
const NOOP_TOOL_NAME = 'no_op';
const NOOP_TOOL: Tool = {
  toolSpec: {
    name: NOOP_TOOL_NAME,
    description:
      'Placeholder only. Do NOT call this tool. It exists solely to satisfy an API requirement ' +
      'and performs no action. Reply with your final answer as text instead.',
    inputSchema: { json: { type: 'object', properties: {} } },
  },
} as Tool;

function historyContainsToolBlocks(messages: Message[]): boolean {
  return messages.some((m) =>
    ((m.content ?? []) as any[]).some((b) => b && (b.toolUse || b.toolResult))
  );
}

/**
 * The model-side schema rejection described on `modelSupportsExplicitCaching`. Detected
 * separately from every other failure because the remedy is unique: retry the SAME model with
 * the markers stripped, rather than moving on to the next candidate. This is the backstop for
 * the capability table drifting out of date, or for an operator pointing
 * BEDROCK_MODEL_SYNTHESIS at a model this file has never heard of.
 */
function isCachePointRejection(err: any): boolean {
  const msg = (err?.message || String(err)).toLowerCase();
  return msg.includes('cachepoint') && (msg.includes('extraneous key') || msg.includes('malformed input'));
}

/**
 * The forced-tool-use rejection described on `modelSupportsForcedToolChoice`. Like the cachePoint
 * rejection, the remedy is to retry the SAME model degraded rather than move to the next one.
 */
function isForcedToolChoiceRejection(err: any): boolean {
  const msg = (err?.message || String(err)).toLowerCase();
  return (
    msg.includes('invalid sequence as part of tooluse') ||
    (msg.includes('toolchoice') && (msg.includes('not supported') || msg.includes('extraneous key')))
  );
}

/**
 * Is this failure "wrong model id for this region/account", i.e. worth trying the next candidate?
 *
 * The previous version probed `err.message` for 'validationexception' and 'accessdeniedexception',
 * which are the exception *names* and never appear in the message text — so those two probes were
 * dead and any ValidationException (the cachePoint crash included) fell straight through to a
 * rethrow. This reads the structured fields instead.
 *
 * Deliberately NOT treating a bare ValidationException as an identifier issue: a genuine
 * malformed-request bug (bad turn ordering, an empty tools array) would otherwise cycle silently
 * through every candidate and surface as the last one's error, hiding the real defect.
 */
function isModelIdentifierIssue(err: any): boolean {
  const name = String(err?.name ?? '').toLowerCase();
  const status = Number(err?.$metadata?.httpStatusCode ?? 0);
  const msg = (err?.message || String(err)).toLowerCase();

  if (name.includes('resourcenotfound') || name.includes('accessdenied')) return true;
  if (status === 403 || status === 404) return true;

  return (
    msg.includes('model identifier is invalid') ||
    msg.includes("don't have access to the model") ||
    msg.includes('not supported in this region') ||
    msg.includes('is not authorized to perform: bedrock:invokemodel')
  );
}

/**
 * Maps a Bedrock model or inference profile ID to the appropriate AWS Region endpoint.
 * Stockholm (eu-north-1) has no Bedrock service, so requests from Fargate must route to us-east-1 or eu-central-1.
 */
export function getRegionForBedrockModel(modelId: string): string {
  const m = (modelId || '').toLowerCase().trim();
  if (m.startsWith('us.')) return 'us-east-1';
  if (m.startsWith('eu.')) return 'eu-central-1';
  if (m.startsWith('apac.')) return 'ap-southeast-1';
  if (m.startsWith('global.')) return 'us-east-1';

  const configured = (process.env.BEDROCK_REGION || '').toLowerCase().trim();
  if (configured && configured !== 'eu-north-1') {
    return configured;
  }
  return 'us-east-1';
}

export class BedrockProvider implements AgentProvider {
  id = 'bedrock';
  private clients: Map<string, BedrockRuntimeClient> = new Map();

  private getClient(region: string): BedrockRuntimeClient {
    let client = this.clients.get(region);
    if (!client) {
      client = new BedrockRuntimeClient({ region });
      this.clients.set(region, client);
    }
    return client;
  }


  async execute(config: AgentRunConfig): Promise<AgentResult> {
    const startTime = Date.now();
    const modelCandidates = resolveBedrockModelCandidates(config.model);
    const converseTools = toConverseTools(config.tools);
    const messages = toConverseMessages(config.messages || []);

    /**
     * Built per attempt, not once up front. Whether cache markers belong in the payload is a
     * property of the candidate being tried, so hoisting this above the loop (as it was) meant
     * the first candidate's caching decision was silently applied to every later candidate too.
     *
     * Cache points are placed after each static block: the system prompt and the tool schemas are
     * byte-identical across every step of a run, which is exactly the reuse Bedrock bills at the
     * cache-read rate; the message history after them changes every step and is not marked.
     * Checkpoints are evaluated `tools` -> `system` -> `messages` against the cumulative prefix,
     * so a step with only a handful of small tools may fall under the model's minimum — per AWS
     * that is not an error, the prefix simply isn't cached.
     */
    const buildCommand = (candidateId: string, withCaching: boolean, forceToolUse: boolean) => {
      const system: SystemContentBlock[] = [{ text: config.systemPrompt }];
      if (withCaching) system.push(SYSTEM_CACHE_POINT);

      let toolConfig: ToolConfiguration | undefined;
      if (converseTools.length > 0) {
        toolConfig = {
          tools: withCaching ? [...converseTools, TOOLS_CACHE_POINT] : [...converseTools],
          // `any` forces the agent to terminate through its submit_* tool, which is what the
          // agent contract wants. Gated because Amazon Nova rejects `any` outright — see
          // modelSupportsForcedToolChoice.
          toolChoice: forceToolUse ? { any: {} } : { auto: {} },
        };
      } else if (historyContainsToolBlocks(messages)) {
        // No tools offered this turn, but the history references them — Bedrock demands toolConfig
        // anyway. `auto` (never `any`) so the model is free to answer with text rather than being
        // forced to invoke the placeholder. No cache point here: a single tiny tool falls under
        // the minimum cacheable size and marking it would waste a checkpoint.
        toolConfig = { tools: [NOOP_TOOL], toolChoice: { auto: {} } };
      }

      return new ConverseCommand({
        modelId: candidateId,
        system,
        messages,
        inferenceConfig: {
          maxTokens: config.maxTokens ?? 8192,
          temperature: config.temperature ?? 0,
        },
        ...(toolConfig ? { toolConfig } : {}),
      });
    };

    let res: any = null;
    let modelId = modelCandidates[0];
    let lastErr: any = null;

    outer:
    for (let i = 0; i < modelCandidates.length; i++) {
      const candidateId = modelCandidates[i];
      let withCaching = modelSupportsExplicitCaching(candidateId);
      let forceToolUse = modelSupportsForcedToolChoice(candidateId);

      // Up to three attempts per candidate: as configured, then once per capability the model
      // turns out not to have. Each degradation retries the SAME model — moving to the next
      // candidate would discard a model that is merely fussy, not unavailable.
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const targetRegion = getRegionForBedrockModel(candidateId);
          const client = this.getClient(targetRegion);
          console.log(`-> Calling Bedrock Converse (${candidateId}) in region [${targetRegion}] (caching=${withCaching ? 'on' : 'off'}, toolChoice=${forceToolUse ? 'any' : 'auto'})...`);
          res = await client.send(buildCommand(candidateId, withCaching, forceToolUse));
          modelId = candidateId;
          break outer;
        } catch (err: any) {
          lastErr = err;

          if (withCaching && isCachePointRejection(err)) {
            console.warn(
              `[BedrockProvider] "${candidateId}" rejected explicit cache points (${err?.message}). ` +
              `Retrying the same model without them — update modelSupportsExplicitCaching() to stop paying for this round-trip.`
            );
            withCaching = false;
            continue;
          }

          if (forceToolUse && isForcedToolChoiceRejection(err)) {
            console.warn(
              `[BedrockProvider] "${candidateId}" rejected forced tool use (${err?.message}). ` +
              `Retrying the same model with toolChoice=auto — the run may return prose instead of a submit_* call.`
            );
            forceToolUse = false;
            continue;
          }

          if (isModelIdentifierIssue(err) && i < modelCandidates.length - 1) {
            console.warn(`[BedrockProvider] Candidate model "${candidateId}" failed (${err?.message}). Trying next candidate "${modelCandidates[i + 1]}"...`);
            break;
          }
          throw err;
        }
      }
    }

    if (!res && lastErr) throw lastErr;

    const blocks = (res.output as any)?.message?.content ?? [];
    let text = '';
    const toolCalls: Array<{ id: string; name: string; input: any }> = [];
    const rawToolCalls: any[] = [];

    for (const block of blocks as any[]) {
      if (block?.text) text += block.text;
      if (block?.toolUse) {
        const id = sanitizeBedrockToolUseId(block.toolUse.toolUseId);
        const name = sanitizeBedrockToolName(block.toolUse.name);
        toolCalls.push({ id, name, input: block.toolUse.input ?? {} });
        rawToolCalls.push({
          id,
          type: 'function',
          function: { name, arguments: JSON.stringify(block.toolUse.input ?? {}) },
        });
      }
    }

    const u: any = res.usage ?? null;
    const reportedInput = typeof u?.inputTokens === 'number' ? u.inputTokens : null;
    const output = typeof u?.outputTokens === 'number' ? u.outputTokens : null;

    /**
     * Bedrock's accounting differs from every other provider this codebase talks to, and getting
     * it wrong is silent. Per AWS: "When prompt caching is enabled, the `inputTokens` field
     * represents only the non-cached input tokens... total input tokens = inputTokens +
     * cacheReadInputTokens + cacheWriteInputTokens."
     *
     * BudgetService treats `cachedInput` as a SUBSET of `input` (it clamps with Math.min), which
     * is the OpenAI/Anthropic convention. Reporting Bedrock's raw `inputTokens` as `input` would
     * therefore clamp the cache-read figure down to the small uncached remainder and drop the
     * write tokens entirely — under-stating spend by most of the prefix on exactly the runs where
     * caching is working. Summing here restores the subset invariant the billing layer assumes.
     */
    const cachedInput = Number(u?.cacheReadInputTokens ?? 0) || 0;
    const cacheWriteInput = Number(u?.cacheWriteInputTokens ?? 0) || 0;
    const input = (reportedInput ?? 0) + cachedInput + cacheWriteInput;
    const reportedTotal = Number(u?.totalTokens ?? 0) || 0;

    return {
      text,
      // Handed straight back into the loop's history, so it is emitted in the same OpenAI shape
      // the loop already appends for every other provider.
      rawContent: { role: 'assistant', content: text || null, tool_calls: rawToolCalls.length > 0 ? rawToolCalls : undefined },
      toolCalls,
      usage: {
        input,
        output: output ?? 0,
        // `totalTokens` follows the same exclusion rule as `inputTokens`, so take whichever is
        // larger rather than trusting a figure that may omit the cached prefix.
        total: Math.max(reportedTotal, input + (output ?? 0)),
        cachedInput,
        cacheWriteInput,
        reported: reportedInput !== null || output !== null,
      },
      servedBy: {
        provider: 'bedrock',
        model: modelId,
        isFallback: false,
        attemptCount: 1,
        latencyMs: Date.now() - startTime,
      },
    };
  }
}
