import { AgentProvider, AgentRunConfig } from "../providers/openai.provider.js";

export interface AgentLoopResult {
  text: string;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
    /** Portion of `input` served from the provider's prompt cache. */
    cachedInput: number;
    /** Steps whose response carried a usage block, and steps that did not. */
    reportedSteps: number;
    unreportedSteps: number;
  };
  /** Which cascade candidate actually served the last call — OpenAI direct or a fallback. */
  servedBy?: { provider: string; model: string; isFallback: boolean };
  /** Chain of custody: real-time, tamper-proof backend record of every tool invoked. */
  toolsExecuted: Array<{ toolName: string; calledAt: string; durationMs: number; resultSummary: string }>;
}

export async function runAgentLoop(config: AgentRunConfig, provider: AgentProvider): Promise<AgentLoopResult> {
  let currentMessages = [...(config.messages || [])];
  const maxSteps = config.maxSteps || 15;
  const tokenUsage = { input: 0, output: 0, total: 0, cachedInput: 0, reportedSteps: 0, unreportedSteps: 0 };
  const toolsExecuted: Array<{ toolName: string; calledAt: string; durationMs: number; resultSummary: string }> = [];
  let servedBy: AgentLoopResult['servedBy'];

  const addUsage = (usage?: { input: number; output: number; total: number; cachedInput?: number; reported?: boolean }) => {
    if (!usage) { tokenUsage.unreportedSteps++; return; }
    tokenUsage.input += usage.input ?? 0;
    tokenUsage.output += usage.output ?? 0;
    tokenUsage.total += usage.total ?? ((usage.input ?? 0) + (usage.output ?? 0));
    tokenUsage.cachedInput += usage.cachedInput ?? 0;
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
      const terminalTools = config.tools?.filter(t => t.name.startsWith("submit_"));
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
    
    // Push the raw assistant message which contains the proper tool_calls field
    if (result.rawContent) {
      currentMessages.push(result.rawContent);
    } else {
      currentMessages.push({ role: "assistant", content: result.text || "" });
    }

    if (result.toolCalls.length === 0) {
      warnIfUsageMissing();
      return { text: result.text, tokenUsage, servedBy, toolsExecuted };
    }
    
    // Dynamic terminal detection: any tool starting with "submit_" is terminal
    const isTerminal = result.toolCalls.some(call => call.name.startsWith("submit_"));
    
    // Execute each tool call
    const toolResults = await Promise.all(
      result.toolCalls.map(async (call) => {
        const tool = config.tools?.find(t => t.name === call.name);
        if (!tool) {
          console.warn(`[AgentLoop] Unknown tool called: ${call.name}`);
          return { id: call.id, name: call.name, content: `Unknown tool: ${call.name}` };
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
          toolsExecuted.push({ toolName: call.name, calledAt, durationMs, resultSummary: String(resultSummary).slice(0, 200) });
          return { id: call.id, name: call.name, content: JSON.stringify(res) };
        } catch (e: any) {
          const durationMs = Date.now() - toolStartTime;
          toolsExecuted.push({ toolName: call.name, calledAt, durationMs, resultSummary: `Error: ${e.message}`.slice(0, 200) });
          console.error(`[AgentLoop] Tool "${call.name}" error:`, e.message);
          return { id: call.id, name: call.name, content: `Error: ${e.message}` };
        }
      })
    );

    if (isTerminal) {
      console.log(`[AgentLoop] Terminal tool called at step ${step + 1}/${maxSteps}. Exiting.`);
      warnIfUsageMissing();
      return { text: result.text, tokenUsage, servedBy, toolsExecuted };
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
  return { text: "Max steps reached without submission", tokenUsage, servedBy, toolsExecuted };
}
