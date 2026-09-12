import { createOpenAI } from "@ai-sdk/openai";

export interface ProviderConfig {
  name: string;
  baseURL?: string;
  apiKey: string;
  defaultOrchestratorModel: string;
  defaultAnalyzerModel: string;
  headers?: Record<string, string>;
}

/**
 * Dynamically resolves the active AI provider configuration from environment variables.
 * Allows instant swapping between OpenAI, OpenRouter, DeepSeek, Groq, AgentRouter,
 * or ANY custom OpenAI-compatible endpoint (Ollama, vLLM, Together AI, Mistral, LiteLLM).
 */
export function resolveActiveProvider(): ProviderConfig {
  const explicitProvider = process.env.AI_PROVIDER?.toLowerCase()?.trim();

  // 1. Generic Custom Gateway (e.g. OpenRouter, DeepSeek, Ollama, Together, vLLM, LiteLLM)
  const customBaseUrl = process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL;
  const customApiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (customBaseUrl && customApiKey && (!explicitProvider || explicitProvider === 'custom')) {
    return {
      name: 'custom',
      baseURL: customBaseUrl,
      apiKey: customApiKey,
      defaultOrchestratorModel: process.env.AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o',
      defaultAnalyzerModel: process.env.AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      headers: { 'User-Agent': 'Codeward/1.0.0' },
    };
  }

  // 2. OpenRouter (https://openrouter.ai)
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if ((explicitProvider === 'openrouter' || (!explicitProvider && openRouterKey)) && openRouterKey) {
    return {
      name: 'openrouter',
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      apiKey: openRouterKey,
      defaultOrchestratorModel: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
      defaultAnalyzerModel: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      headers: {
        'HTTP-Referer': process.env.APP_URL || 'https://codeward.net',
        'X-Title': 'Codeward',
      },
    };
  }

  // 3. DeepSeek (https://api.deepseek.com)
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if ((explicitProvider === 'deepseek' || (!explicitProvider && deepseekKey)) && deepseekKey) {
    return {
      name: 'deepseek',
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      apiKey: deepseekKey,
      defaultOrchestratorModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      defaultAnalyzerModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    };
  }

  // 4. Groq (https://groq.com)
  const groqKey = process.env.GROQ_API_KEY;
  if ((explicitProvider === 'groq' || (!explicitProvider && groqKey)) && groqKey) {
    return {
      name: 'groq',
      baseURL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
      apiKey: groqKey,
      defaultOrchestratorModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      defaultAnalyzerModel: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    };
  }

  // 5. Official OpenAI Direct
  const openAiKey = process.env.OPENAI_API_KEY;
  if ((explicitProvider === 'openai' || (!explicitProvider && openAiKey)) && openAiKey && (!customBaseUrl || customBaseUrl.includes('api.openai.com'))) {
    return {
      name: 'openai',
      baseURL: 'https://api.openai.com/v1',
      apiKey: openAiKey,
      defaultOrchestratorModel: process.env.OPENAI_MODEL || 'gpt-4o',
      defaultAnalyzerModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    };
  }

  // 6. AgentRouter (https://agentrouter.org)
  const agentRouterKey = process.env.AGENTROUTER_API_KEY;
  if ((explicitProvider === 'agentrouter' || (!explicitProvider && agentRouterKey)) && agentRouterKey) {
    return {
      name: 'agentrouter',
      baseURL: process.env.AGENTROUTER_BASE_URL || 'https://agentrouter.org/v1',
      apiKey: agentRouterKey,
      defaultOrchestratorModel: process.env.AGENTROUTER_MODEL || 'gpt-5.6-sol',
      defaultAnalyzerModel: process.env.AGENTROUTER_MODEL || 'gpt-4o-mini',
      headers: { 'User-Agent': 'Cline/3.0.0' },
    };
  }

  // 7. TokenRouter (only when base URL is explicitly supplied)
  const tokenRouterKey = process.env.TOKENROUTER_API_KEY;
  const tokenRouterBaseUrl = process.env.TOKENROUTER_BASE_URL;
  if ((explicitProvider === 'tokenrouter' || (!explicitProvider && tokenRouterKey && tokenRouterBaseUrl)) && tokenRouterKey && tokenRouterBaseUrl) {
    return {
      name: 'tokenrouter',
      baseURL: tokenRouterBaseUrl,
      apiKey: tokenRouterKey,
      defaultOrchestratorModel: process.env.TOKENROUTER_MODEL || 'z-ai/glm-5.3-free',
      defaultAnalyzerModel: process.env.TOKENROUTER_MODEL || 'z-ai/glm-5.3-free',
      headers: { 'User-Agent': 'Cline/3.0.0' },
    };
  }

  // 8. Moonshot / Kimi
  const kimiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;
  if ((explicitProvider === 'kimi' || (!explicitProvider && kimiKey)) && kimiKey) {
    return {
      name: 'kimi',
      baseURL: 'https://api.moonshot.cn/v1',
      apiKey: kimiKey,
      defaultOrchestratorModel: process.env.KIMI_MODEL || 'moonshot-v1-8k',
      defaultAnalyzerModel: process.env.KIMI_MODEL || 'moonshot-v1-8k',
    };
  }

  return {
    name: 'none',
    apiKey: 'dummy-key',
    defaultOrchestratorModel: 'gpt-4o',
    defaultAnalyzerModel: 'gpt-4o-mini',
  };
}

export function getModel(phase?: "orchestrator" | "analyzer", requestedModel?: string) {
  const provider = resolveActiveProvider();

  const openai = createOpenAI({
    apiKey: provider.apiKey,
    ...(provider.baseURL ? { baseURL: provider.baseURL } : {}),
    ...(provider.headers ? { headers: provider.headers } : {}),
  });

  if (requestedModel) {
    return openai(requestedModel);
  }

  const defaultModel = phase === 'orchestrator' 
    ? provider.defaultOrchestratorModel 
    : provider.defaultAnalyzerModel;

  return openai(defaultModel);
}
