import { createOpenAI } from "@ai-sdk/openai";

export function getModel(phase?: "orchestrator" | "analyzer", requestedModel?: string) {
  const tokenRouterKey = process.env.TOKENROUTER_API_KEY;
  const agentRouterKey = process.env.AGENTROUTER_API_KEY;
  const primaryKey = process.env.OPENAI_API_KEY;
  const kimiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;

  const customBaseUrl = process.env.OPENAI_BASE_URL;
  const tokenRouterBaseUrl = process.env.TOKENROUTER_BASE_URL;
  const isTokenRouter = Boolean(tokenRouterKey) && (Boolean(tokenRouterBaseUrl) || Boolean(customBaseUrl?.includes('tokenrouter')));
  const useAgentRouterDirectly = process.env.USE_AGENTROUTER_DIRECTLY === 'true';
  const isAgentRouter = !isTokenRouter && (useAgentRouterDirectly || (!primaryKey && Boolean(agentRouterKey)));

  let baseURL = customBaseUrl;
  let apiKey = primaryKey || agentRouterKey || kimiKey;
  let headers: Record<string, string> | undefined = undefined;

  if (isTokenRouter) {
    baseURL = tokenRouterBaseUrl || (customBaseUrl?.includes('tokenrouter') ? customBaseUrl : "https://api.tokenrouter.com/v1");
    apiKey = tokenRouterKey || primaryKey;
    headers = { "User-Agent": "Cline/3.0.0" };
  } else if (isAgentRouter) {
    baseURL = "https://agentrouter.org/v1";
    apiKey = agentRouterKey || apiKey;
    headers = { "User-Agent": "Cline/3.0.0" };
  } else if (!baseURL) {
    if (kimiKey && !primaryKey) {
      baseURL = "https://api.moonshot.cn/v1";
    }
  }

  const openai = createOpenAI({
    apiKey: apiKey || "dummy-key",
    ...(headers ? { headers } : {}),
    ...(baseURL ? { baseURL } : {})
  });

  if (requestedModel) {
    return openai(requestedModel);
  }

  if (isTokenRouter) {
    return openai(process.env.TOKENROUTER_MODEL || process.env.OPENAI_MODEL || "z-ai/glm-5.3-free");
  }

  if (isAgentRouter) {
    return openai(process.env.AGENTROUTER_MODEL || process.env.OPENAI_MODEL || "gpt-5.6-sol");
  }

  if (process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY) {
    return openai(process.env.KIMI_MODEL || "moonshot-v1-8k");
  }

  if (process.env.OPENAI_MODEL) {
    return openai(process.env.OPENAI_MODEL);
  }

  if (phase === "orchestrator") {
    // Best tool-calling reliability for multi-step orchestration
    return openai("gpt-4o");
  }
  // Analyzers: fast + cheap, each only needs 1 tool call
  return openai("gpt-4o-mini");
}

