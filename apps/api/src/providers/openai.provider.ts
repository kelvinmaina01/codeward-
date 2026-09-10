export interface AgentTool {
  name: string;
  description: string;
  parameters: any; // Raw JSON schema
  execute: (args: any) => Promise<any> | any;
}

export interface AgentRunConfig {
  model: string;
  systemPrompt: string;
  maxTokens?: number;
  temperature?: number;
  tools?: AgentTool[];
  maxSteps?: number;
  messages: any[];
}

export interface ServingMetadata {
  provider: string;
  model: string;
  isFallback: boolean;
  attemptCount: number;
  latencyMs: number;
}

export interface AgentResult {
  text: string;
  toolCalls: Array<{ id: string; name: string; input: any }>;
  rawContent: any; // For appending back to history if needed
  usage?: {
    input: number;
    output: number;
    total: number;
  };
  servedBy?: ServingMetadata;
}

export interface AgentProvider {
  id: string;
  execute(config: AgentRunConfig): Promise<AgentResult>;
}

export interface ModelCandidate {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  headers?: Record<string, string>;
  sanitizePayload?: (payload: any) => any;
}

/**
 * Sanitizes log output and exception messages to prevent accidental API key leaks.
 */
export function sanitizeErrorLog(message: string): string {
  if (!message) return '';
  return message
    .replace(/Bearer\s+[A-Za-z0-9_\-\.]{15,}/gi, 'Bearer [REDACTED_API_KEY]')
    .replace(/sk-[A-Za-z0-9_\-]{15,}/gi, 'sk-[REDACTED_API_KEY]')
    .replace(/(apiKey|api_key|token|authorization)["']?\s*[:=]\s*["']?[A-Za-z0-9_\-\.]{15,}["']?/gi, '$1="[REDACTED]"');
}

/**
 * Thrown when a request has an unrecoverable payload or schema configuration error (e.g. 400/422).
 * Fast-fails immediately without cascading through multiple providers.
 */
export class FatalPayloadError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number) {
    super(sanitizeErrorLog(message));
    this.name = 'FatalPayloadError';
    this.statusCode = statusCode;
  }
}

export class NativeOpenAIProvider implements AgentProvider {
  id = 'openai';

  /**
   * Loud boot-time configuration validator.
   * Ensures that missing AI credentials fail visibly at startup rather than during in-flight requests.
   */
  static validateConfiguration(): { valid: boolean; providers: string[]; warnings: string[] } {
    const configured: string[] = [];
    const warnings: string[] = [];

    if (process.env.TOKENROUTER_API_KEY) configured.push('tokenrouter');
    if (process.env.OPENAI_API_KEY) configured.push('openai_direct');
    if (process.env.AGENTROUTER_API_KEY) configured.push('agentrouter');
    if (process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY) configured.push('kimi');

    if (configured.length === 0) {
      warnings.push(
        '⚠️ FATAL AI CONFIGURATION: Zero AI providers configured! Set at least one of TOKENROUTER_API_KEY, OPENAI_API_KEY, or AGENTROUTER_API_KEY.'
      );
      console.error('\n' + '='.repeat(80));
      console.error('[NativeOpenAIProvider] ❌ ZERO AI PROVIDERS CONFIGURED AT BOOT');
      console.error('Agent tasks will fail. Please configure an OpenAI-compatible API key in your .env');
      console.error('='.repeat(80) + '\n');
    } else {
      console.log(`[NativeOpenAIProvider] 🌐 Discovered ${configured.length} AI provider(s) at boot: ${configured.join(', ')}`);
    }

    return { valid: configured.length > 0, providers: configured, warnings };
  }

  /**
   * Resolves the ordered cascade of AI providers and models dynamically from environment
   * variables, avoiding hardcoding and allowing any OpenAI-compatible provider/model.
   */
  resolveCandidates(config: AgentRunConfig): ModelCandidate[] {
    const candidates: ModelCandidate[] = [];

    // 1. TokenRouter (e.g. z-ai/glm-5.3-free or custom model)
    const tokenRouterKey = process.env.TOKENROUTER_API_KEY;
    if (tokenRouterKey) {
      candidates.push({
        name: 'tokenrouter',
        baseUrl: process.env.TOKENROUTER_BASE_URL || 'https://api.tokenrouter.com/v1',
        apiKey: tokenRouterKey,
        model: process.env.TOKENROUTER_MODEL || (config.model && config.model.includes('/') ? config.model : 'z-ai/glm-5.3-free'),
        headers: { 'User-Agent': 'Cline/3.0.0' },
        sanitizePayload: (payload: any) => {
          // TokenRouter reasoning models (GLM, etc.) prefer required tool_choice and no strict schema flag
          if (payload.tools && payload.tools.length > 0) {
            payload.tool_choice = 'required';
          }
          return payload;
        },
      });
    }

    // 2. Custom OpenAI-Compatible Gateway / Self-hosted (e.g. DeepSeek, vLLM, Ollama, Kimi)
    const customBaseUrl = process.env.OPENAI_BASE_URL;
    const customKey = process.env.OPENAI_API_KEY;
    if (customBaseUrl && customKey && !customBaseUrl.includes('api.openai.com')) {
      candidates.push({
        name: 'custom_gateway',
        baseUrl: customBaseUrl,
        apiKey: customKey,
        model: process.env.OPENAI_MODEL || config.model || 'gpt-4o-mini',
        headers: { 'User-Agent': 'Cline/3.0.0' },
      });
    }

    // 3. Official OpenAI Direct (if standard OpenAI API key is set)
    const openAiKey = process.env.OPENAI_API_KEY;
    if (openAiKey && (!customBaseUrl || customBaseUrl.includes('api.openai.com'))) {
      candidates.push({
        name: 'openai_direct',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: openAiKey,
        model: process.env.OPENAI_MODEL || (config.model && !config.model.includes('/') ? config.model : 'gpt-4o-mini'),
      });
    }

    // 4. AgentRouter Reverse Proxy (fallback)
    const agentRouterKey = process.env.AGENTROUTER_API_KEY;
    if (agentRouterKey) {
      candidates.push({
        name: 'agentrouter',
        baseUrl: process.env.AGENTROUTER_BASE_URL || 'https://agentrouter.org/v1',
        apiKey: agentRouterKey,
        model: process.env.AGENTROUTER_MODEL || 'gpt-5.6-sol',
        headers: { 'User-Agent': 'Cline/3.0.0' },
      });
    }

    // 5. Moonshot / Kimi (if configured)
    const kimiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;
    if (kimiKey) {
      candidates.push({
        name: 'kimi',
        baseUrl: 'https://api.moonshot.cn/v1',
        apiKey: kimiKey,
        model: process.env.KIMI_MODEL || 'moonshot-v1-8k',
      });
    }

    // Allow custom cascade ordering if specified (e.g. AI_PROVIDER_CASCADE="tokenrouter,openai_direct")
    if (process.env.AI_PROVIDER_CASCADE) {
      const order = process.env.AI_PROVIDER_CASCADE.split(',').map(s => s.trim().toLowerCase());
      candidates.sort((a, b) => {
        const idxA = order.indexOf(a.name.toLowerCase());
        const idxB = order.indexOf(b.name.toLowerCase());
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }

    return candidates;
  }

  async execute(config: AgentRunConfig): Promise<AgentResult> {
    const candidates = this.resolveCandidates(config);
    if (candidates.length === 0) {
      throw new Error(
        'No valid AI API Key configured. Please set TOKENROUTER_API_KEY, OPENAI_API_KEY, or AGENTROUTER_API_KEY in your .env'
      );
    }

    // Total wall-clock budget for the entire cascade (default 90s)
    const totalCascadeBudgetMs = Number(process.env.AI_CASCADE_TIMEOUT_MS) || 90000;
    const cascadeStartTime = Date.now();

    const callEndpoint = async (
      candidate: ModelCandidate,
      candidateIndex: number
    ): Promise<AgentResult> => {
      const url = `${candidate.baseUrl.replace(/\/+$/, '')}/chat/completions`;
      const messages = [
        { role: 'system', content: config.systemPrompt },
        ...config.messages,
      ];

      let payload: any = {
        model: candidate.model,
        messages,
        max_tokens: config.maxTokens ?? 8192,
        temperature: config.temperature ?? 0,
      };

      if (config.tools && config.tools.length > 0) {
        const { zodToJsonSchema } = await import('zod-to-json-schema');
        payload.tools = config.tools.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: (t.parameters && t.parameters._def) ? zodToJsonSchema(t.parameters) : t.parameters,
          },
        }));
        payload.tool_choice = 'required';
      }

      // Per-candidate parameter / schema sanitization
      if (candidate.sanitizePayload) {
        payload = candidate.sanitizePayload(payload);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${candidate.apiKey}`,
        ...(candidate.headers || {}),
      };

      const maxAttempts = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // Enforce wall-clock budget across the entire cascade
        const elapsedCascade = Date.now() - cascadeStartTime;
        const remainingBudget = totalCascadeBudgetMs - elapsedCascade;
        if (remainingBudget <= 0) {
          throw new Error(
            `Total cascade wall-clock timeout (${totalCascadeBudgetMs}ms) exceeded while trying provider "${candidate.name}".`
          );
        }

        // Each individual HTTP request gets the smaller of remaining budget or 60s
        const perRequestTimeout = Math.min(60000, remainingBudget);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), perRequestTimeout);

        try {
          const attemptLabel = attempt > 1 ? `, retry #${attempt}` : '';
          console.log(`-> Calling AI API (${url}, model: ${candidate.model}${attemptLabel})...`);
          
          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            const status = response.status;
            const sanitizedError = sanitizeErrorLog(errorText);

            // 1. FATAL / CONFIG ERRORS (400, 422):
            // Check if it's an "invalid model" error on this specific provider (which CAN cascade)
            const isModelNotFoundError =
              sanitizedError.toLowerCase().includes('model') &&
              (sanitizedError.toLowerCase().includes('not found') ||
               sanitizedError.toLowerCase().includes('invalid model') ||
               sanitizedError.toLowerCase().includes('does not exist'));

            if ((status === 400 || status === 422) && !isModelNotFoundError) {
              // Bad schema / invalid parameters: fail fast! Do NOT burn latency cascading across providers.
              console.error(`[NativeOpenAIProvider] ❌ Fatal request error (${status}) from ${candidate.name}: ${sanitizedError}`);
              throw new FatalPayloadError(`Fatal AI request error (${status}): ${sanitizedError}`, status);
            }

            // 2. RETRYABLE ON SAME PROVIDER (429 with Jitter, transient 502/503/504)
            if (status === 429 && attempt < maxAttempts) {
              // Check Retry-After header
              const retryAfterHeader = response.headers.get('retry-after');
              const parsedRetryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : 0;
              const jitter = Math.floor(Math.random() * 1000);
              const delay = parsedRetryAfter > 0 && parsedRetryAfter <= 10000
                ? parsedRetryAfter + jitter
                : (attempt * 2500) + jitter;

              console.warn(
                `[NativeOpenAIProvider] Rate limit (429) from ${candidate.name}. Backing off with jitter (${delay}ms) before retry #${attempt + 1}...`
              );
              await new Promise(res => setTimeout(res, delay));
              continue;
            }

            if ([502, 503, 504].includes(status) && attempt < maxAttempts) {
              const delay = (attempt * 2000) + Math.floor(Math.random() * 1000);
              console.warn(`[NativeOpenAIProvider] Transient error ${status} from ${candidate.name}. Retrying in ${delay}ms...`);
              await new Promise(res => setTimeout(res, delay));
              continue;
            }

            // 3. CASCADE-WORTHY (401, 402, 403, exhausted 429/5xx, or model not found)
            throw new Error(`API error ${status}: ${sanitizedError}`);
          }

          const data = await response.json();
          const parsedResult = this.parseResponse(data);

          // 4. OBSERVABLE SERVING TELEMETRY: Record which candidate served the request
          const totalTurnLatency = Date.now() - cascadeStartTime;
          const isFallback = candidateIndex > 0;
          parsedResult.servedBy = {
            provider: candidate.name,
            model: candidate.model,
            isFallback,
            attemptCount: attempt,
            latencyMs: totalTurnLatency,
          };

          const fallbackBadge = isFallback ? ` ⚠️ [FALLBACK from ${candidates[0].name}]` : '';
          console.log(
            `[NativeOpenAIProvider] 🎯 Served by "${candidate.name}" (${candidate.model})${fallbackBadge} in ${totalTurnLatency}ms (attempt #${attempt})`
          );

          return parsedResult;
        } catch (err: any) {
          clearTimeout(timeoutId);
          lastError = err;

          // Re-throw fatal payload errors immediately (do not retry, do not cascade)
          if (err instanceof FatalPayloadError) {
            throw err;
          }

          // Retry on network abort/timeout or transient failures on same provider
          if (attempt < maxAttempts && (err.name === 'AbortError' || err.message?.includes('fetch failed'))) {
            const delay = (attempt * 2000) + Math.floor(Math.random() * 1000);
            console.warn(`[NativeOpenAIProvider] Network/Timeout error from ${candidate.name}. Retrying in ${delay}ms...`);
            await new Promise(res => setTimeout(res, delay));
            continue;
          }

          throw err;
        }
      }

      throw lastError || new Error('All attempts failed');
    };

    const errors: Array<{ provider: string; model: string; error: string }> = [];

    // Fallback cascade: try candidates sequentially until one succeeds
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      try {
        return await callEndpoint(candidate, i);
      } catch (err: any) {
        // If it's a fatal payload configuration error, abort the entire cascade immediately!
        if (err instanceof FatalPayloadError) {
          throw err;
        }

        const sanitizedMsg = sanitizeErrorLog(err.message);
        console.warn(`[NativeOpenAIProvider] ⚠️ Provider "${candidate.name}" (${candidate.model}) failed: ${sanitizedMsg}`);
        errors.push({ provider: candidate.name, model: candidate.model, error: sanitizedMsg });
      }
    }

    throw new Error(
      `All AI providers failed in cascade:\n${errors.map(e => `  ├─ [${e.provider}] (${e.model}): ${e.error}`).join('\n')}`
    );
  }

  private parseResponse(data: any): AgentResult {
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error(`Invalid AI response structure: no choices returned in ${JSON.stringify(data).slice(0, 250)}`);
    }
    const message = choice.message || {};

    let toolCalls = (message.tool_calls || []).map((call: any) => {
      let input: any = {};
      try {
        input = typeof call.function.arguments === 'string'
          ? JSON.parse(call.function.arguments)
          : (call.function.arguments || {});
      } catch {
        input = {};
      }
      return {
        id: call.id || `call_${Math.random().toString(36).substring(2, 9)}`,
        name: call.function.name,
        input,
      };
    });

    // Fallback: If no tool_calls array, check if model embedded function call in text or markdown
    if (toolCalls.length === 0 && message.content) {
      const text = message.content.trim();
      // Case A: <tool_call> JSON </tool_call>
      const xmlMatch = text.match(/<tool_call>([\s\S]*?)<\/tool_call>/);
      if (xmlMatch) {
        try {
          const parsed = JSON.parse(xmlMatch[1].trim());
          if (parsed.name) {
            toolCalls.push({
              id: `call_${Math.random().toString(36).substring(2, 9)}`,
              name: parsed.name,
              input: parsed.arguments || parsed.input || parsed.parameters || {},
            });
          }
        } catch {}
      }

      // Case B: ```json { ... } ``` or raw JSON
      if (toolCalls.length === 0) {
        const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const candidateStr = jsonBlockMatch ? jsonBlockMatch[1].trim() : (text.startsWith('{') ? text : null);
        if (candidateStr) {
          try {
            const parsed = JSON.parse(candidateStr);
            if (parsed.name && (parsed.arguments || parsed.input)) {
              toolCalls.push({
                id: `call_${Math.random().toString(36).substring(2, 9)}`,
                name: parsed.name,
                input: parsed.arguments || parsed.input || {},
              });
            } else if (parsed.findings || parsed.overallWeightedScore || parsed.gateDecision) {
              toolCalls.push({
                id: `call_${Math.random().toString(36).substring(2, 9)}`,
                name: 'submit_architecture_report',
                input: parsed,
              });
            }
          } catch {}
        }
      }
    }

    return {
      text: message.content || message.reasoning_content || '',
      toolCalls,
      rawContent: message,
      usage: {
        input: data.usage?.prompt_tokens ?? data.usage?.input_tokens ?? 0,
        output: data.usage?.completion_tokens ?? data.usage?.output_tokens ?? 0,
        total: data.usage?.total_tokens ?? ((data.usage?.prompt_tokens ?? 0) + (data.usage?.completion_tokens ?? 0)),
      },
    };
  }
}
