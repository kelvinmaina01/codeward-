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
 * FinOps: Bedrock prompt caching is opt-in. Unlike OpenAI, which caches long prefixes
 * automatically, Bedrock only caches where an explicit `cachePoint` block is placed. This
 * architecture re-sends a large static prefix (system prompt + ~20 tool schemas) on every step
 * of every run, so without those markers a migration would pay full input rate on all of it.
 * Two cache points are inserted, after each static block, which is where the reuse actually is.
 * ============================================================================
 */

import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
  type Message,
  type Tool,
} from '@aws-sdk/client-bedrock-runtime';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { AgentProvider, AgentRunConfig, AgentResult, AgentTool } from './openai.provider.js';

/**
 * Maps a Bedrock model or inference profile ID to the appropriate AWS Region endpoint.
 *
 * AWS Bedrock rule:
 * - Cross-region profiles prefixed with `us.` MUST be called in a US region (us-east-1).
 * - Cross-region profiles prefixed with `eu.` MUST be called in an EU region (eu-central-1).
 * - Cross-region profiles prefixed with `apac.` MUST be called in an APAC region (ap-southeast-1).
 * - Foundation models without a prefix must be called in a region hosting that foundation model.
 * - Note: eu-north-1 (Stockholm) has NO Bedrock foundation models, so requests from Fargate in
 *   Stockholm must cross-region route to eu-central-1 or us-east-1.
 */
export function getRegionForBedrockModel(modelId: string): string {
  const m = (modelId || '').toLowerCase().trim();
  if (m.startsWith('us.')) return 'us-east-1';
  if (m.startsWith('eu.')) return 'eu-central-1';
  if (m.startsWith('apac.')) return 'ap-southeast-1';

  // For non-prefixed models (e.g. anthropic.claude-3-5-haiku...):
  const configured = (process.env.BEDROCK_REGION || process.env.AWS_REGION || '').toLowerCase().trim();
  if (configured && configured !== 'eu-north-1') {
    return configured;
  }
  // Default to us-east-1 (where all Anthropic foundation models reside)
  return 'us-east-1';
}

/**
 * Cross-region inference profiles are GEO-SCOPED.
 * If running on ECS in eu-north-1 (Stockholm), Bedrock is not available in that region,
 * so we default preferred geo to 'us.' (or 'eu.' fallback), both supported via cross-region routing.
 */
function bedrockGeoPrefix(): string {
  const region = (process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1').toLowerCase().trim();
  // eu-north-1 has no Bedrock at all — use us. by default as standard Bedrock geo
  if (region === 'eu-north-1' || !region) return 'us.';
  if (region.startsWith('eu-')) return 'eu.';
  if (region.startsWith('ap-')) return 'apac.';
  return 'us.';
}

/**
 * Maps a logical model name onto an ordered list of Bedrock model or inference profile IDs.
 * Cross-region inference profile IDs are strongly preferred. If the primary candidate fails
 * with an invalid identifier or unsupported region, BedrockProvider will attempt the next candidate.
 */
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

  const primaryGeo = bedrockGeoPrefix();
  const secondaryGeo = primaryGeo === 'us.' ? 'eu.' : 'us.';
  const isMechanical = m.includes('mini') || m.includes('haiku') || m.includes('nano') || m.includes('lite');

  if (isMechanical) {
    const candidates: string[] = [];
    if (process.env.BEDROCK_MODEL_MECHANICAL) {
      candidates.push(process.env.BEDROCK_MODEL_MECHANICAL);
    }
    // Official active AWS Bedrock Claude 3.5 Haiku and Claude 3 Haiku IDs across US and EU
    candidates.push(
      `${primaryGeo}anthropic.claude-3-5-haiku-20241022-v1:0`,
      `${secondaryGeo}anthropic.claude-3-5-haiku-20241022-v1:0`,
      `${primaryGeo}anthropic.claude-3-haiku-20240307-v1:0`,
      `${secondaryGeo}anthropic.claude-3-haiku-20240307-v1:0`,
      'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      'anthropic.claude-3-5-haiku-20241022-v1:0',
      'anthropic.claude-3-haiku-20240307-v1:0'
    );
    return Array.from(new Set(candidates));
  }

  // Frontier / Synthesis tier
  const synthesisCandidates: string[] = [];
  if (process.env.BEDROCK_MODEL_SYNTHESIS) {
    synthesisCandidates.push(process.env.BEDROCK_MODEL_SYNTHESIS);
  }
  // Official active AWS Bedrock Claude 3.5 Sonnet and 3.7 Sonnet IDs across US and EU
  synthesisCandidates.push(
    `${primaryGeo}anthropic.claude-3-5-sonnet-20241022-v2:0`,
    `${secondaryGeo}anthropic.claude-3-5-sonnet-20241022-v2:0`,
    `${primaryGeo}anthropic.claude-3-5-sonnet-20240620-v1:0`,
    `${secondaryGeo}anthropic.claude-3-5-sonnet-20240620-v1:0`,
    `${primaryGeo}anthropic.claude-3-7-sonnet-20250219-v1:0`,
    `${secondaryGeo}anthropic.claude-3-7-sonnet-20250219-v1:0`,
    'anthropic.claude-3-5-sonnet-20240620-v1:0'
  );
  return Array.from(new Set(synthesisCandidates));
}

export function resolveBedrockModelId(model: string): string {
  return resolveBedrockModelCandidates(model)[0];
}

const CACHE_POINT = { cachePoint: { type: 'default' } } as unknown as ContentBlock;

/** Bedrock rejects a toolResult that is not carried on a user turn, hence the role mapping. */
function toConverseMessages(messages: any[]): Message[] {
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
          toolUseId: String(msg.tool_call_id ?? msg.id ?? ''),
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
          toolUse: { toolUseId: String(call.id), name: call.function?.name, input },
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
      name: t.name,
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

export class BedrockProvider implements AgentProvider {
  id = 'bedrock';
  private clients: Map<string, BedrockRuntimeClient> = new Map();
  private defaultRegion: string;

  constructor(region?: string) {
    const rawRegion = region || process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1';
    // If running in Stockholm (eu-north-1) where Bedrock is absent, default to us-east-1
    this.defaultRegion = rawRegion === 'eu-north-1' ? 'us-east-1' : rawRegion;
  }

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

    // Two cache points, placed after each static block. The system prompt and the tool schemas
    // are byte-identical across every step of a run, which is exactly the reuse Bedrock bills at
    // the cache-read rate; the message history after them changes every step and is not marked.
    const system: any[] = [{ text: config.systemPrompt }, CACHE_POINT];
    const messages = toConverseMessages(config.messages || []);

    let toolConfig: any;
    if (converseTools.length > 0) {
      toolConfig = {
        tools: [...converseTools, CACHE_POINT],
        // The agent contract depends on forced tool use: every run must terminate by calling
        // its submit_* tool. Anthropic models on Bedrock honour `any`; verify before pointing
        // this provider at a model family that does not.
        toolChoice: { any: {} },
      };
    } else if (historyContainsToolBlocks(messages)) {
      // No tools offered this turn, but the history references them — Bedrock demands toolConfig
      // anyway. `auto` (never `any`) so the model is free to answer with text rather than being
      // forced to invoke the placeholder. No cache point here: a single tiny tool falls under
      // the minimum cacheable size and marking it would waste a checkpoint.
      toolConfig = { tools: [NOOP_TOOL], toolChoice: { auto: {} } };
    }

    let res: any = null;
    let modelId = modelCandidates[0];
    let lastErr: any = null;

    for (let i = 0; i < modelCandidates.length; i++) {
      const candidateId = modelCandidates[i];
      const targetRegion = getRegionForBedrockModel(candidateId);
      const client = this.getClient(targetRegion);

      const command = new ConverseCommand({
        modelId: candidateId,
        system,
        messages,
        inferenceConfig: {
          maxTokens: config.maxTokens ?? 8192,
          temperature: config.temperature ?? 0,
        },
        ...(toolConfig ? { toolConfig } : {}),
      });

      try {
        console.log(`-> Calling Bedrock Converse (${candidateId}) in region [${targetRegion}]...`);
        res = await client.send(command);
        modelId = candidateId;
        break;
      } catch (err: any) {
        lastErr = err;
        const msg = (err?.message || String(err)).toLowerCase();
        const isCandidateIssue =
          msg.includes('model identifier is invalid') ||
          msg.includes('resourcenotfoundexception') ||
          msg.includes('validationexception') ||
          msg.includes('not supported in this region') ||
          msg.includes('accessdeniedexception') ||
          msg.includes('throttlingexception') ||
          msg.includes('model not found');

        if (isCandidateIssue && i < modelCandidates.length - 1) {
          console.warn(`[BedrockProvider] Candidate model "${candidateId}" in [${targetRegion}] failed (${err?.message}). Trying next candidate "${modelCandidates[i + 1]}"...`);
          continue;
        }
        throw err;
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
        const id = String(block.toolUse.toolUseId);
        toolCalls.push({ id, name: block.toolUse.name, input: block.toolUse.input ?? {} });
        rawToolCalls.push({
          id,
          type: 'function',
          function: { name: block.toolUse.name, arguments: JSON.stringify(block.toolUse.input ?? {}) },
        });
      }
    }

    const u: any = res.usage ?? null;
    const input = typeof u?.inputTokens === 'number' ? u.inputTokens : null;
    const output = typeof u?.outputTokens === 'number' ? u.outputTokens : null;
    // cacheReadInputTokens is the discounted portion. BudgetService treats cachedInput as a
    // SUBSET of input and prices the remainder at full rate, so it is reported as-is here.
    const cachedInput = Number(u?.cacheReadInputTokens ?? 0) || 0;

    return {
      text,
      // Handed straight back into the loop's history, so it is emitted in the same OpenAI shape
      // the loop already appends for every other provider.
      rawContent: { role: 'assistant', content: text || null, tool_calls: rawToolCalls.length > 0 ? rawToolCalls : undefined },
      toolCalls,
      usage: {
        input: input ?? 0,
        output: output ?? 0,
        total: typeof u?.totalTokens === 'number' ? u.totalTokens : (input ?? 0) + (output ?? 0),
        cachedInput,
        reported: input !== null || output !== null,
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
