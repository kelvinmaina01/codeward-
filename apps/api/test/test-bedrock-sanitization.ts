import { sanitizeBedrockToolName, sanitizeBedrockToolUseId, toConverseMessages } from '../src/providers/bedrock.provider.js';

console.log('--- Testing sanitizeBedrockToolName ---');

const testCases = [
  { input: 'read_file', expected: 'read_file' },
  { input: 'read_file() on candidates', expected: 'read_file' },
  { input: 'check_rls_policies_live(databaseUrl)', expected: 'check_rls_policies_live' },
  { input: 'tools.run_semgrep', expected: 'run_semgrep' },
  { input: 'Step 4: run_semgrep()', expected: 'run_semgrep' },
  { input: 'invalid name with spaces & special $ chars', expected: 'invalid_name_with_spaces_special_chars' },
  { input: 'a'.repeat(100), expected: 'a'.repeat(64) },
  { input: '', expected: 'unknown_tool' },
  { input: null as any, expected: 'unknown_tool' },
];

let failed = 0;
for (const tc of testCases) {
  const actual = sanitizeBedrockToolName(tc.input);
  const pass = actual === tc.expected;
  console.log(`${pass ? '✅' : '❌'} Input: "${tc.input}" => "${actual}" (expected "${tc.expected}")`);
  if (!pass) failed++;
  
  // Verify Bedrock constraints:
  // 1. <= 64 chars
  if (actual.length > 64) {
    console.error(`❌ Length > 64: ${actual.length}`);
    failed++;
  }
  // 2. Pattern: ^[a-zA-Z0-9_-]+$
  if (!/^[a-zA-Z0-9_-]+$/.test(actual)) {
    console.error(`❌ Does not match regex ^[a-zA-Z0-9_-]+$: ${actual}`);
    failed++;
  }
}

console.log('--- Testing sanitizeBedrockToolUseId ---');
const idTests = [
  'tooluse_123',
  'call:abc-123.def',
  '',
  'a'.repeat(100),
];

for (const id of idTests) {
  const sanitized = sanitizeBedrockToolUseId(id);
  console.log(`ID: "${id}" => "${sanitized}"`);
  if (sanitized.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
    console.error(`❌ Invalid toolUseId: ${sanitized}`);
    failed++;
  } else {
    console.log(`✅ Valid toolUseId`);
  }
}

console.log('--- Testing toConverseMessages with Malformed Tool Names ---');
const simulatedConversation = [
  { role: 'user', content: 'Scan the repo for security vulnerabilities.' },
  {
    role: 'assistant',
    content: 'Running initial scans.',
    tool_calls: [
      {
        id: 'call_123:abc.def',
        type: 'function',
        function: {
          name: 'read_file() on candidates',
          arguments: '{"path":"src/index.ts"}',
        },
      },
      {
        id: 'call_456',
        type: 'function',
        function: {
          name: 'check_rls_policies_live(databaseUrl)',
          arguments: '{"databaseUrl":"postgres://..."}',
        },
      },
      {
        id: 'call_789',
        type: 'function',
        function: {
          name: 'Step 4: run_semgrep()',
          arguments: '{}',
        },
      },
      {
        id: 'call_999',
        type: 'function',
        function: {
          name: 'super_long_tool_name_that_definitely_exceeds_sixty_four_characters_limit_in_bedrock_validation',
          arguments: '{}',
        },
      }
    ],
  },
  {
    role: 'tool',
    tool_call_id: 'call_123:abc.def',
    content: 'file contents',
  },
];

const converseMessages = toConverseMessages(simulatedConversation);
console.log('Converse Messages output:');

for (const msg of converseMessages) {
  for (const block of (msg.content as any[])) {
    if (block.toolUse) {
      const { name, toolUseId } = block.toolUse;
      console.log(`Checking toolUse block: name="${name}", toolUseId="${toolUseId}"`);
      if (!/^[a-zA-Z0-9_-]+$/.test(name) || name.length > 64) {
        console.error(`❌ Bedrock validation violation in toolUse.name: "${name}"`);
        failed++;
      } else {
        console.log(`✅ toolUse.name satisfies Bedrock constraints: "${name}"`);
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(toolUseId) || toolUseId.length > 64) {
        console.error(`❌ Bedrock validation violation in toolUseId: "${toolUseId}"`);
        failed++;
      } else {
        console.log(`✅ toolUseId satisfies Bedrock constraints: "${toolUseId}"`);
      }
    }
    if (block.toolResult) {
      const { toolUseId } = block.toolResult;
      console.log(`Checking toolResult block: toolUseId="${toolUseId}"`);
      if (!/^[a-zA-Z0-9_-]+$/.test(toolUseId) || toolUseId.length > 64) {
        console.error(`❌ Bedrock validation violation in toolResult.toolUseId: "${toolUseId}"`);
        failed++;
      } else {
        console.log(`✅ toolResult.toolUseId satisfies Bedrock constraints: "${toolUseId}"`);
      }
    }
  }
}

if (failed > 0) {
  console.error(`\nFAILED ${failed} tests`);
  process.exit(1);
} else {
  console.log('\nAll Bedrock tests PASSED! 🚀');
}
