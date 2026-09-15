import assert from 'node:assert/strict';
import type { UIMessage } from 'ai';
import { createGordonTools } from '../src/agents/definitions/chat/gordon.tools.js';
import { directAttachmentActionTools, hasLatestToolApprovalResponse, isFastConversation } from '../src/routes/chat.js';
import { getModel } from '../src/providers/model.provider.js';

function message(text: string): UIMessage {
  return { id: 'test-message', role: 'user', parts: [{ type: 'text', text }] };
}

function testFastConversationMatching() {
  for (const text of ['help', 'hello!', '  who are you???  ', 'what can you do.']) {
    assert.equal(isFastConversation(message(text), false, false), true, `${JSON.stringify(text)} should use the fast lane`);
  }
  for (const text of ['explain why CI failed', 'help me fix CI', 'hello there']) {
    assert.equal(isFastConversation(message(text), false, false), false, `${JSON.stringify(text)} should use the orchestrator`);
  }
}

function testAttachmentActionPolicy() {
  const noIntentTools: any = createGordonTools('test-user', undefined, 'full_access', {
    forceActionApproval: true,
    allowedActionTools: directAttachmentActionTools(message('Summarize the attached report.')),
  });
  assert.equal(noIntentTools.spawn_agent, undefined);
  assert.equal(noIntentTools.approve_and_merge, undefined);
  assert.ok(noIntentTools.read_repo_file, 'read-only reference tools remain available');

  const scanTools: any = createGordonTools('test-user', undefined, 'full_access', {
    forceActionApproval: true,
    allowedActionTools: directAttachmentActionTools(message('Run a security scan and use the attachment as context.')),
  });
  assert.equal(scanTools.spawn_agent.needsApproval, true, 'attachments force approval in full_access mode');
  assert.equal(scanTools.run_all_agents.needsApproval, true);
  assert.equal(scanTools.approve_and_merge, undefined, 'unrequested action types remain unavailable');

  const approvalContinuation = {
    id: 'assistant-message',
    role: 'assistant',
    parts: [{ type: 'tool-spawn_agent', state: 'approval-responded' }],
  } as unknown as UIMessage;
  assert.equal(hasLatestToolApprovalResponse([message('Run a security scan.'), approvalContinuation]), true);
  assert.equal(hasLatestToolApprovalResponse([approvalContinuation, message('Thanks.')]), false, 'historical approvals do not constrain later turns');
}

function testPhaseModelsOverrideProviderDefaults() {
  const original = {
    analyzer: process.env.ANALYZER_MODEL,
    orchestrator: process.env.ORCHESTRATOR_MODEL,
    tokenRouterKey: process.env.TOKENROUTER_API_KEY,
    tokenRouterBaseUrl: process.env.TOKENROUTER_BASE_URL,
    tokenRouter: process.env.TOKENROUTER_MODEL,
  };
  try {
    process.env.ANALYZER_MODEL = 'configured-analyzer';
    process.env.ORCHESTRATOR_MODEL = 'configured-orchestrator';
    process.env.TOKENROUTER_API_KEY = 'test-key';
    process.env.TOKENROUTER_BASE_URL = 'https://tokenrouter.test/v1';
    process.env.TOKENROUTER_MODEL = 'provider-default';
    assert.equal(getModel('analyzer').modelId, 'configured-analyzer');
    assert.equal(getModel('orchestrator').modelId, 'configured-orchestrator');

    delete process.env.ANALYZER_MODEL;
    assert.equal(getModel('analyzer').modelId, 'provider-default', 'provider fallback remains when phase model is absent');
  } finally {
    if (original.analyzer === undefined) delete process.env.ANALYZER_MODEL;
    else process.env.ANALYZER_MODEL = original.analyzer;
    if (original.orchestrator === undefined) delete process.env.ORCHESTRATOR_MODEL;
    else process.env.ORCHESTRATOR_MODEL = original.orchestrator;
    if (original.tokenRouterKey === undefined) delete process.env.TOKENROUTER_API_KEY;
    else process.env.TOKENROUTER_API_KEY = original.tokenRouterKey;
    if (original.tokenRouterBaseUrl === undefined) delete process.env.TOKENROUTER_BASE_URL;
    else process.env.TOKENROUTER_BASE_URL = original.tokenRouterBaseUrl;
    if (original.tokenRouter === undefined) delete process.env.TOKENROUTER_MODEL;
    else process.env.TOKENROUTER_MODEL = original.tokenRouter;
  }
}

testFastConversationMatching();
testAttachmentActionPolicy();
testPhaseModelsOverrideProviderDefaults();
console.log('PASS: chat route policy guards');
