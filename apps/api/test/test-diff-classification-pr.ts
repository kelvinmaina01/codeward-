import { classifyDiff, getGitDiffAndFiles } from '../src/agents/definitions/orchestrator/orchestrator.tools.js';
import type { SandboxHandle } from '../src/agents/core/provider.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING PR DIFF CLASSIFICATION & AGENT SELECTION TESTS');
  console.log('=============================================================\n');

  // Test 1: Pure README.md update
  console.log('--- Test Group 1: Pure Documentation / README Changes ---');
  const docDiff = `
diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -1,3 +1,5 @@
 # Codeward
+A platform for autonomous PR review and code health.
+See documentation for details.
`;
  const docFiles = ['README.md'];
  const docAnalysis = classifyDiff(docDiff, docFiles);

  assert(docAnalysis.riskProfile.isDocOrConfigOnly === true, 'Identifies README as doc-only');
  assert(docAnalysis.recommendedAgents.length === 0, 'Zero agents recommended on pure README PR');
  assert(docAnalysis.mandatoryAgents.length === 0, 'Zero mandatory agents on pure README PR (security is skipped)');
  assert(!docAnalysis.recommendedAgents.includes('security'), 'Security agent explicitly NOT recommended on README PR');
  assert(!docAnalysis.recommendedAgents.includes('broken_code'), 'Broken Code agent skipped on README PR');
  assert(!docAnalysis.recommendedAgents.includes('architecture'), 'Architecture agent skipped on README PR');
  assert(!docAnalysis.recommendedAgents.includes('bloat'), 'Bloat agent skipped on README PR');

  // Test 2: Documentation directory + txt files
  console.log('\n--- Test Group 2: Multi-file Docs & Non-Workflow Config ---');
  const multiDocDiff = `
diff --git a/docs/architecture.md b/docs/architecture.md
+++ b/docs/architecture.md
+## New Architecture Diagram
diff --git a/notes.txt b/notes.txt
+++ b/notes.txt
+meeting notes
`;
  const multiDocFiles = ['docs/architecture.md', 'notes.txt'];
  const multiDocAnalysis = classifyDiff(multiDocDiff, multiDocFiles);

  assert(multiDocAnalysis.riskProfile.isDocOrConfigOnly === true, 'Identifies docs/ folder and .txt as doc-only');
  assert(multiDocAnalysis.recommendedAgents.length === 0, 'Zero agents recommended on multi-file docs PR');

  // Test 3: Normal Code Change
  console.log('\n--- Test Group 3: Normal Code File Changes ---');
  const codeDiff = `
diff --git a/src/utils/math.ts b/src/utils/math.ts
--- a/src/utils/math.ts
+++ b/src/utils/math.ts
@@ -1,2 +1,6 @@
-export function add(a: number, b: number) { return a + b; }
+export function add(a: number, b: number) {
+  if (isNaN(a) || isNaN(b)) throw new Error('Invalid number');
+  return a + b;
+}
`;
  const codeFiles = ['src/utils/math.ts'];
  const codeAnalysis = classifyDiff(codeDiff, codeFiles);

  assert(codeAnalysis.riskProfile.isDocOrConfigOnly === false, 'Code change is NOT doc-only');
  assert(codeAnalysis.recommendedAgents.includes('broken_code'), 'Broken code agent recommended for .ts change');
  assert(codeAnalysis.recommendedAgents.includes('security'), 'Security agent recommended for code change');
  assert(codeAnalysis.mandatoryAgents.includes('security'), 'Security agent mandatory for code change');
  assert(!codeAnalysis.recommendedAgents.includes('architecture'), 'Architecture skipped on small math utility change');

  // Test 4: Database Migration / Schema Changes
  console.log('\n--- Test Group 4: Database Schema / Migration Changes ---');
  const migrationDiff = `
diff --git a/src/db/schema.ts b/src/db/schema.ts
--- a/src/db/schema.ts
+++ b/src/db/schema.ts
@@ -10,3 +10,10 @@
+export const organizations = pgTable('organizations', {
+  id: serial('id').primaryKey(),
+  name: varchar('name', { length: 255 }).notNull(),
+});
`;
  const migrationFiles = ['src/db/schema.ts'];
  const migrationAnalysis = classifyDiff(migrationDiff, migrationFiles);

  assert(migrationAnalysis.recommendedAgents.includes('architecture'), 'Architecture recommended for schema.ts');
  assert(migrationAnalysis.recommendedAgents.includes('data_dx'), 'Data DX recommended for schema.ts');
  assert(migrationAnalysis.recommendedAgents.includes('security'), 'Security recommended for schema.ts');

  // Test 5: LLM / AI Call Sites
  console.log('\n--- Test Group 5: AI / LLM Client Call Sites ---');
  const aiDiff = `
diff --git a/src/services/ai.service.ts b/src/services/ai.service.ts
+++ b/src/services/ai.service.ts
@@ -0,0 +1,5 @@
+import OpenAI from 'openai';
+const openai = new OpenAI();
+export async function runPrompt() {
+  return await openai.chat.completions.create({ model: 'gpt-4o', messages: [] });
+}
`;
  const aiFiles = ['src/services/ai.service.ts'];
  const aiAnalysis = classifyDiff(aiDiff, aiFiles);

  assert(aiAnalysis.recommendedAgents.includes('ai_era'), 'AI Era agent recommended when openai.chat.completions touched');

  // Test 6: Multi-Commit Diff Strategy (getGitDiffAndFiles mock)
  console.log('\n--- Test Group 6: Multi-Commit Base-Diff Extraction ---');
  let execCalls: string[] = [];
  const mockSandboxWithOriginMain: SandboxHandle = {
    exec: async (cmd: string) => {
      execCalls.push(cmd);
      if (cmd === 'git rev-parse --verify origin/main') {
        return { exitCode: 0, stdout: 'abc1234', stderr: '' };
      }
      if (cmd === 'git diff origin/main...HEAD') {
        return {
          exitCode: 0,
          stdout: '+ // commit 1 changes\n+ // commit 2 changes\n',
          stderr: ''
        };
      }
      if (cmd === 'git diff --name-only origin/main...HEAD') {
        return {
          exitCode: 0,
          stdout: 'src/commit1.ts\nsrc/commit2.ts\n',
          stderr: ''
        };
      }
      return { exitCode: 1, stdout: '', stderr: 'not found' };
    },
    destroy: async () => {}
  } as any;

  const resultWithOriginMain = await getGitDiffAndFiles(mockSandboxWithOriginMain);
  assert(resultWithOriginMain.changedFiles.includes('src/commit1.ts'), 'Captures multi-commit file 1 via origin/main...HEAD');
  assert(resultWithOriginMain.changedFiles.includes('src/commit2.ts'), 'Captures multi-commit file 2 via origin/main...HEAD');
  assert(execCalls.includes('git diff origin/main...HEAD'), 'Invoked 3-dot PR diff against origin/main');

  // Test 7: Fallback when origin/main does not exist
  console.log('\n--- Test Group 7: Fallback to git show HEAD on Shallow Repos ---');
  const mockShallowSandbox: SandboxHandle = {
    exec: async (cmd: string) => {
      if (cmd.startsWith('git rev-parse')) {
        return { exitCode: 1, stdout: '', stderr: 'branch not found' };
      }
      if (cmd === 'git show --format= HEAD') {
        return { exitCode: 0, stdout: '+ const singleCommit = true;\n', stderr: '' };
      }
      if (cmd === 'git show --format= --name-only HEAD') {
        return { exitCode: 0, stdout: 'src/single.ts\n', stderr: '' };
      }
      return { exitCode: 1, stdout: '', stderr: '' };
    },
    destroy: async () => {}
  } as any;

  const shallowResult = await getGitDiffAndFiles(mockShallowSandbox);
  assert(shallowResult.changedFiles.includes('src/single.ts'), 'Fell back cleanly to git show HEAD');

  console.log('\n=============================================================');
  console.log(`📊 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal error running tests:', e);
  process.exit(1);
});
