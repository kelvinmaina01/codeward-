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

// ---------------------------------------------------------------------------
// Provider Registry
// ---------------------------------------------------------------------------

const providers: Record<string, AgentProvider> = {
  anthropic: new AnthropicProvider(),
  // -------------------------------------------------------------------------
  // Future providers — add here when ready:
  // openai: new OpenAIProvider(),
  // ollama: new OllamaProvider(),
  // custom: new CustomProvider(),
  // -------------------------------------------------------------------------
};

/** The default provider used when no override is specified */
const DEFAULT_PROVIDER = 'anthropic';

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
