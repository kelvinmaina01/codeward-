/**
 * ============================================================================
 * Agent Provider Registry
 * ============================================================================
 * 
 * Maps provider names to their implementations.
 * All providers use the OpenAI-compatible API format, allowing dynamic
 * routing to OpenAI, AgentRouter, DeepSeek, Kimi, or any compatible endpoint.
 * 
 * To add a new provider:
 * 1. Create the provider file in ./providers/
 * 2. Import and register it here
 * 3. Done — every agent can now use it via repo config
 * ============================================================================
 */

import type { AgentProvider } from './provider.js';
import { OpenAIProvider } from './providers/openai.provider.js';
import { isBedrockEnabled } from '../../providers/engine.provider.js';

// ---------------------------------------------------------------------------
// Provider Registry
// ---------------------------------------------------------------------------
//
// Every entry here is a LAYER 1 provider: it runs a whole agent (tool loop, findings
// extraction, policy engine, telemetry). The choice of which LAYER 2 inference engine actually
// carries the model calls — Amazon Bedrock or the OpenAI-compatible cascade — is made in
// providers/engine.provider.ts and passed in below.
//
// BedrockProvider is deliberately NOT registered here directly: it is a layer-2 transport that
// returns { text, toolCalls, usage } and has no concept of a finding, a score or a gate
// decision, so it cannot satisfy this interface.
//
// Routing:
//   'openai'   -> cascade resolved from env: Bedrock first when enabled, OpenAI fallback
//   'bedrock'  -> forces Bedrock with no fallback (useful for validating the AWS path)
//   'openai-direct' -> forces the OpenAI-compatible cascade, bypassing Bedrock entirely
//
// Bedrock becomes Priority 1 for the default route the moment AI_ENGINE=bedrock (or
// BEDROCK_ENABLED=true) is set on the environment. It is opt-in rather than hardcoded because
// ECS supplies credentials via the task role — there is no key to detect — so an unconditional
// default would make every request in a non-AWS environment pay a failed round trip first.

const providers: Record<string, AgentProvider> = {
  openai: new OpenAIProvider(),
  bedrock: new OpenAIProvider('bedrock'),
  'openai-direct': new OpenAIProvider('openai'),
  // -------------------------------------------------------------------------
  // Future providers — add here when ready:
  // deepseek: new DeepSeekProvider(),
  // kimi: new KimiProvider(),
  // -------------------------------------------------------------------------
};

/** The default provider used when no override is specified */
const DEFAULT_PROVIDER = 'openai';

console.log(
  `[AgentRegistry] Inference routing: ${isBedrockEnabled() ? 'Bedrock (priority 1) -> OpenAI cascade (failover)' : 'OpenAI cascade (Bedrock disabled — set AI_ENGINE=bedrock to enable)'}`
);

/**
 * Get a provider by name. Falls back to the default provider.
 * 
 * Usage:
 *   const provider = getProvider('openai');
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
