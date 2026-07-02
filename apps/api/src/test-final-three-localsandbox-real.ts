import { LocalExecSandbox } from './sandbox/local-exec.js';
import { complianceAgent } from './agents/definitions/compliance.agent.js';
import { dataDxAgent } from './agents/definitions/data_dx.agent.js';
import { aiEraAgent } from './agents/definitions/ai_era.agent.js';
import { NativeOpenAIProvider } from './providers/openai.provider.js';
import { runAgentLoop } from './agents/agent-loop.js';
import type { AgentDefinition } from './agents/core/provider.js';
import 'dotenv/config';

const REPO_URL = 'https://github.com/kelvinmaina01/codeward-.git';

async function runAgent(agent: AgentDefinition, sandbox: any, note: string) {
  console.log(`\n\n=== ${agent.displayName} ===`);
  const toolMap = agent.createTools(sandbox);
  let reportResult: any = null;
  const submitToolName = Object.keys(toolMap).find(n => n.startsWith('submit_'))!;

  const toolArray = Object.entries(toolMap).map(([name, impl]: [string, any]) => ({
    name, description: impl.description, parameters: impl.parameters,
    execute: async (args: any) => {
      const t = Date.now();
      const result = await impl.execute(args);
      console.log(`  [tool] ${name} -> ${((Date.now() - t) / 1000).toFixed(1)}s | ${JSON.stringify(result).slice(0, 140)}`);
      if (name === submitToolName) reportResult = args;
      return result;
    }
  }));

  const provider = new NativeOpenAIProvider();
  await runAgentLoop({
    model: 'gpt-4o-mini', systemPrompt: agent.systemPrompt, maxSteps: agent.maxSteps, tools: toolArray,
    messages: [{ role: 'user', content: `Analyze this repository. Run ID: test-${agent.id}-001. ${note} Submit your findings using ${submitToolName}.` }]
  }, provider);

  if (!reportResult) { console.log(`${agent.id}: FAILED to submit report`); return; }
  console.log(`${agent.id} -> score/gateDecision: ${JSON.stringify({ score: reportResult.score ?? reportResult.overallTeamHealthScore, gate: reportResult.gateDecision ?? reportResult.riskLevel ?? reportResult.weekOverWeekTrend })}`);
  console.log(`findings: ${(reportResult.findings ?? []).length}`);
}

async function main() {
  const sandbox = new LocalExecSandbox();
  const t0 = Date.now();
  await sandbox.init(REPO_URL, 'baseline');
  console.log(`Fresh clone in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const note = 'There is NO running instance, NO databaseUrl, and NO live external service connection in this pipeline — every dynamic check will honestly report applicable:false; treat that as "not tested", never as "passed". Use only what real tools give you.';

  try {
    await runAgent(complianceAgent, sandbox, note);
    await runAgent(dataDxAgent, sandbox, note);
    await runAgent(aiEraAgent, sandbox, note);
  } finally {
    await sandbox.destroy();
    console.log('\nSandbox destroyed.');
  }
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
