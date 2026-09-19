import { AgentProvider, AgentRunConfig } from "../providers/openai.provider.js";

export interface AgentLoopResult {
  text: string;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
    /** Portion of `input` served from the provider's prompt cache. */
    cachedInput: number;
    /** Portion of `input` written to the provider's prompt cache, billed above the input rate. */
    cacheWriteInput: number;
    /** Steps whose response carried a usage block, and steps that did not. */
    reportedSteps: number;
    unreportedSteps: number;
  };
  /** Which cascade candidate actually served the last call — OpenAI direct or a fallback. */
  servedBy?: { provider: string; model: string; isFallback: boolean };
  /** Chain of custody: real-time, tamper-proof backend record of every tool invoked. */
  toolsExecuted: Array<{ toolName: string; calledAt: string; durationMs: number; resultSummary: string }>;
  /** True when the agent reached maxSteps before generating a final report / terminal tool call. */
  truncated?: boolean;
}

/** JSON.stringify that never throws — tolerates circular refs and BigInt in a tool result. */
function safeStringify(value: unknown): string {
  try {
    const seen = new WeakSet();
    return JSON.stringify(value, (_k, v) => {
      if (typeof v === 'bigint') return v.toString();
      if (v && typeof v === 'object') {
        if (seen.has(v as object)) return '[Circular]';
        seen.add(v as object);
      }
      return v;
    }) ?? String(value);
  } catch {
    try { return String(value); } catch { return '[unserializable tool result]'; }
  }
}

function normalizeToolName(name: string): string {
  if (!name || typeof name !== 'string') return 'unknown_tool';
  // Strip common prefixes like "tools." or "Step X: "
  let clean = name.replace(/^(?:step\s*\d+[:.]\s*|tools[.:]\s*)/i, '').trim();
  // Strip argument signatures like read_file(...) -> read_file and anything following
  clean = clean.replace(/\(.*?\).*$/, '').trim();
  // Take the first token
  clean = clean.split(/\s+/)[0] || '';
  return clean;
}

export async function runAgentLoop(config: AgentRunConfig, provider: AgentProvider): Promise<AgentLoopResult> {
  let currentMessages = [...(config.messages || [])];
  const maxSteps = config.maxSteps || 15;
  const tokenUsage = { input: 0, output: 0, total: 0, cachedInput: 0, cacheWriteInput: 0, reportedSteps: 0, unreportedSteps: 0 };
  const toolsExecuted: Array<{ toolName: string; calledAt: string; durationMs: number; resultSummary: string }> = [];
  let servedBy: AgentLoopResult['servedBy'];
  // Circuit breaker for a wedged tool-calling loop: if every tool call errors on N consecutive
  // steps, the model is stuck (e.g. hammering a tool that always throws). The maxSteps ceiling
  // already bounds this — it can never be an infinite loop — but breaking early stops the run from
  // burning its whole step budget and N more LLM calls on a state that will not recover.
  let consecutiveAllErrorSteps = 0;
  const MAX_CONSECUTIVE_ALL_ERROR_STEPS = 4;

  const addUsage = (usage?: { input: number; output: number; total: number; cachedInput?: number; cacheWriteInput?: number; reported?: boolean }) => {
    if (!usage) { tokenUsage.unreportedSteps++; return; }
    tokenUsage.input += usage.input ?? 0;
    tokenUsage.output += usage.output ?? 0;
    tokenUsage.total += usage.total ?? ((usage.input ?? 0) + (usage.output ?? 0));
    tokenUsage.cachedInput += usage.cachedInput ?? 0;
    tokenUsage.cacheWriteInput += usage.cacheWriteInput ?? 0;
    if (usage.reported === false) tokenUsage.unreportedSteps++;
    else tokenUsage.reportedSteps++;
  };

  // Surfaces the exact condition that left every persisted token_usage row at zero: the call
  // succeeded, but whatever served it reported no usage, so the cost of the run is unknown
  // rather than free.
  const warnIfUsageMissing = () => {
    if (tokenUsage.unreportedSteps === 0) return;
    console.warn(
      `[AgentLoop] ${tokenUsage.unreportedSteps}/${tokenUsage.unreportedSteps + tokenUsage.reportedSteps} step(s) returned no usage block` +
      `${servedBy ? ` (served by "${servedBy.provider}"${servedBy.isFallback ? ', a cascade fallback' : ''})` : ''}` +
      ` — recorded token counts understate the real cost of this run.`
    );
  };

  for (let step = 0; step < maxSteps; step++) {
    const isLastStep = step === maxSteps - 1;

    // On the very last step, inject a system nudge and restrict tools to terminal submission only
    const stepConfig = { ...config, messages: currentMessages };
    if (isLastStep) {
      // Guard against a tool definition with a missing/non-string name — `.startsWith` on
      // undefined would crash the loop before the mandatory terminal step could run.
      const terminalTools = config.tools?.filter(t => typeof t?.name === 'string' && t.name.startsWith("submit_"));
      stepConfig.tools = terminalTools ?? [];
      currentMessages.push({
        role: "user",
        content: "⚠️ SYSTEM: You have reached the maximum allowed steps. You MUST call your submit_* tool NOW with whatever findings you have. All exploration tools are now closed."
      });
    }

    let result;
    try {
      result = await provider.execute(stepConfig);
      addUsage(result.usage);
      if (result.servedBy) {
        servedBy = { provider: result.servedBy.provider, model: result.servedBy.model, isFallback: result.servedBy.isFallback };
      }
    } catch (error: any) {
      error.checkpointState = currentMessages;
      throw error;
    }
    
    // Push the raw assistant message with sanitized tool names
    if (result.rawContent) {
      if (Array.isArray(result.rawContent.tool_calls)) {
        for (const tc of result.rawContent.tool_calls) {
          if (tc?.function?.name) {
            const rawName = String(tc.function.name);
            const norm = normalizeToolName(rawName);
            const matched = config.tools?.find(t => t.name === norm || t.name === norm.toLowerCase());
            tc.function.name = matched ? matched.name : norm.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
          }
        }
      }
      currentMessages.push(result.rawContent);
    } else {
      currentMessages.push({ role: "assistant", content: result.text || "" });
    }

    // Defensive: a provider is contracted to return a toolCalls array of {id,name,input}, but the
    // loop must not crash if a malformed/empty response slips through. Normalize to a safe array of
    // string-named calls before any .length / .some / .map touches it.
    const safeToolCalls = (Array.isArray(result.toolCalls) ? result.toolCalls : [])
      .filter((c: any) => c && typeof c === 'object')
      .map((c: any) => ({ ...c, name: String(c.name ?? ''), id: String(c.id ?? '') }));

    if (safeToolCalls.length === 0) {
      warnIfUsageMissing();
      return { text: result.text, tokenUsage, servedBy, toolsExecuted };
    }

    // Dynamic terminal detection: any tool starting with "submit_" is terminal
    const isTerminal = safeToolCalls.some(call => call.name.startsWith("submit_"));
    
    // Execute each tool call
    const toolResults = await Promise.all(
      safeToolCalls.map(async (call) => {
        let tool = config.tools?.find(t => t.name === call.name);
        let resolvedName = call.name;
        if (!tool) {
          const norm = normalizeToolName(call.name);
          const candidate = config.tools?.find(t => t.name === norm || t.name === norm.toLowerCase());
          if (candidate) {
            tool = candidate;
            resolvedName = candidate.name;
            call.name = candidate.name;
          }
        }

        if (!tool) {
          console.warn(`[AgentLoop] Unknown tool called: ${call.name}`);
          const safeName = resolvedName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
          return { id: call.id, name: safeName, content: `Unknown tool: ${call.name}`, isError: true };
        }
        const toolStartTime = Date.now();
        const calledAt = new Date(toolStartTime).toISOString();
        try {
          const res = await tool.execute(call.input);
          const durationMs = Date.now() - toolStartTime;
          let resultSummary = 'OK';
          if (res) {
            if (typeof res === 'object') {
              resultSummary = res.summary || res.message || res.status || (res.success !== undefined ? `success: ${res.success}` : `${Object.keys(res).length} keys returned`);
            } else {
              resultSummary = String(res).slice(0, 100);
            }
          }
          toolsExecuted.push({ toolName: resolvedName, calledAt, durationMs, resultSummary: String(resultSummary).slice(0, 200) });
          // safeStringify: a tool returning a circular structure or a BigInt would make a plain
          // JSON.stringify throw. That throw is caught below, but it would discard an otherwise-
          // valid result and mark the call errored — so serialize defensively and preserve the data.
          return { id: call.id, name: resolvedName, content: safeStringify(res), isError: false };
        } catch (e: any) {
          const durationMs = Date.now() - toolStartTime;
          const msg = e?.message ?? String(e);
          toolsExecuted.push({ toolName: resolvedName, calledAt, durationMs, resultSummary: `Error: ${msg}`.slice(0, 200) });
          console.error(`[AgentLoop] Tool "${resolvedName}" error:`, msg);
          return { id: call.id, name: resolvedName, content: `Error: ${msg}`, isError: true };
        }
      })
    );

    if (isTerminal) {
      console.log(`[AgentLoop] Terminal tool called at step ${step + 1}/${maxSteps}. Exiting.`);
      warnIfUsageMissing();
      return { text: result.text, tokenUsage, servedBy, toolsExecuted, truncated: false };
    }

    // Circuit breaker: if every tool call this step errored, the run may be wedged. Count
    // consecutive such steps and bail out early (as truncated) once the threshold is hit, rather
    // than spending the rest of the step budget — and that many more LLM calls — on a stuck state.
    if (toolResults.length > 0 && toolResults.every((r: any) => r.isError)) {
      consecutiveAllErrorSteps++;
      if (consecutiveAllErrorSteps >= MAX_CONSECUTIVE_ALL_ERROR_STEPS) {
        console.warn(`[AgentLoop] ${consecutiveAllErrorSteps} consecutive steps where every tool call errored — breaking out to avoid a wedged loop.`);
        warnIfUsageMissing();
        return { text: result.text, tokenUsage, servedBy, toolsExecuted, truncated: true };
      }
    } else {
      consecutiveAllErrorSteps = 0;
    }

    // Format tool results as proper role: 'tool' messages
    for (const res of toolResults) {
      currentMessages.push({
        role: "tool",
        tool_call_id: res.id,
        name: res.name,
        content: res.content
      });
    }
  }

  console.warn(`[AgentLoop] Max steps (${maxSteps}) exhausted without terminal tool call.`);
  warnIfUsageMissing();
  return { text: "Max steps reached without submission", tokenUsage, servedBy, toolsExecuted, truncated: true };
}
