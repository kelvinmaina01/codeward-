/**
 * ============================================================================
 * Agent Provider Registry
 * ============================================================================
 * 
 * Maps provider names to their implementations.
 * 
 * To add a new provider:
 * 1. Create the provider file in ./providers/
 * 2. Import and register it here
 * 3. Done — every agent can now use it via repo config
 * ============================================================================
 */

import type { AgentProvider } from './provider.js';
import { AnthropicProvider } from './providers/anthropic.provider.js';
import { OpenAIProvider } from './providers/openai.provider.js';

// ---------------------------------------------------------------------------
// Provider Registry
// ---------------------------------------------------------------------------

const providers: Record<string, AgentProvider> = {
  openai: new OpenAIProvider(),
  // AnthropicProvider actually routes through OpenRouter (OPENROUTER_API_KEY), which is
  // unset in this environment — every call to it fails at the provider layer. Kept
  // registered (so an explicit override still resolves) but no longer the default.
  anthropic: new AnthropicProvider(),
  // -------------------------------------------------------------------------
  // Future providers — add here when ready:
  // ollama: new OllamaProvider(),
  // custom: new CustomProvider(),
  // -------------------------------------------------------------------------
};

/** The default provider used when no override is specified */
const DEFAULT_PROVIDER = 'openai';

/**
 * Get a provider by name. Falls back to the default provider.
 * 
 * Usage:
 *   const provider = getProvider('anthropic');
 *   const result = await provider.execute(config);
 * 
 * Or from repo config:
 *   const provider = getProvider(repo.config.provider);
 */
export function getProvider(name?: string): AgentProvider {
  const key = name ?? DEFAULT_PROVIDER;
  const provider = providers[key];
  
  if (!provider) {
    console.warn(`[AgentRegistry] Unknown provider "${key}", falling back to "${DEFAULT_PROVIDER}"`);
    return providers[DEFAULT_PROVIDER];
  }
  
  return provider;
}

/**
 * List all registered provider names.
 * Useful for the Settings UI to show available options.
 */
export function listProviders(): string[] {
  return Object.keys(providers);
}
