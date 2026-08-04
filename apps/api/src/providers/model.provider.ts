import { createOpenAI } from "@ai-sdk/openai";

export function getModel(phase?: "orchestrator" | "analyzer") {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;
  
  let baseURL = process.env.OPENAI_BASE_URL;
  if (!baseURL) {
    if (process.env.OPENROUTER_API_KEY) {
      baseURL = "https://openrouter.ai/api/v1";
    } else if (process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY) {
      baseURL = "https://api.moonshot.cn/v1";
    }
  }

  const openai = createOpenAI({
    apiKey: apiKey || "dummy-key",
    ...(baseURL ? { baseURL } : {})
  });

  const customModel = process.env.OPENAI_MODEL;
  if (customModel) {
    return openai(customModel);
  }

  if (process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY) {
    return openai("moonshot-v1-8k");
  }

  if (phase === "orchestrator") {
    // Best tool-calling reliability for multi-step orchestration
    return openai("gpt-4o");
  }
  // Analyzers: fast + cheap, each only needs 1 tool call
  return openai("gpt-4o-mini");
}
