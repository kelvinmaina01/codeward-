import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function getModel(phase?: "orchestrator" | "analyzer") {
  if (phase === "orchestrator") {
    // Best tool-calling reliability for multi-step orchestration
    return openai.chat("gpt-4o", { structuredOutputs: false });
  }
  // Analyzers: fast + cheap, each only needs 1 tool call
  return openai.chat("gpt-4o-mini", { structuredOutputs: false });
}
