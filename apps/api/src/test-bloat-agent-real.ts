/**
 * Full vertical-slice stress test for the Bloat agent: real LLM (NativeOpenAIProvider,
 * the only provider with a working key), real sandbox exec, real Fallow CLI tool calls,
 * against this actual repo. No DB writes — prints the final report instead, so it's safe
 * to run repeatedly without touching Postgres.
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { bloatAgent } from './agents/definitions/bloat.agent.js';
import { NativeOpenAIProvider } from './providers/openai.provider.js';
import { runAgentLoop } from './agents/agent-loop.js';
import type { SandboxHandle } from './agents/core/provider.js';
import 'dotenv/config';

const execAsync = promisify(exec);
const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');

const sandbox: SandboxHandle = {
  exec: async (cmd: string) => {
    console.log(`[real exec] ${cmd}`);
    try {
      const { stdout, stderr } = await execAsync(cmd, { cwd: REPO_ROOT, maxBuffer: 1024 * 1024 * 50 });
      return { exitCode: 0, stdout, stderr };
    } catch (err: any) {
      return { exitCode: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? err.message };
    }
  },
  destroy: async () => {},
};

async function main() {
  console.log('=== BLOAT AGENT — REAL LLM + REAL FALLOW CLI, NO MOCKS ===\n');

  const toolMap = bloatAgent.createTools(sandbox);
  let reportResult: any = null;

  const toolArray = Object.entries(toolMap).map(([name, impl]) => ({
    name,
    description: impl.description,
    parameters: impl.parameters,
    execute: async (args: any) => {
      const result = await impl.execute(args);
      if (name === 'submit_bloat_report') reportResult = args;
      return result;
    }
  }));

  const provider = new NativeOpenAIProvider();

  await runAgentLoop({
    model: 'gpt-4o-mini',
    systemPrompt: bloatAgent.systemPrompt,
    maxSteps: bloatAgent.maxSteps,
    tools: toolArray,
    messages: [{
      role: 'user',
      content: `Analyze this repository for code bloat.
Repo path: ${REPO_ROOT}
Run ID: test-run-real-001
Use your tools to investigate. Submit your findings using submit_bloat_report.`
    }]
  }, provider);

  console.log('\n=== FINAL REPORT ===');
  if (!reportResult) {
    console.log('Agent never called submit_bloat_report (check maxSteps / tool errors above).');
    process.exit(1);
  }
  console.log('gateDecision:', reportResult.gateDecision);
  console.log('score:', reportResult.score);
  console.log('fallowHealthScore:', reportResult.fallowHealthScore, reportResult.fallowGrade);
  console.log('findings count:', reportResult.findings?.length);
  console.log('toolsExecuted:', reportResult.toolsExecuted?.map((t: any) => t.toolName));
  console.log('\nFull findings:\n', JSON.stringify(reportResult.findings, null, 2));
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
