import 'dotenv/config';
import { guardianAgent } from './agents/definitions/guardian.agent.js';
import type { SandboxHandle } from './agents/core/provider.js';

const dummySandbox: SandboxHandle = { exec: async () => ({ exitCode: 0, stdout: '', stderr: '' }), destroy: async () => {} };

async function main() {
  console.log('=== GUARDIAN AGENT — real GitHub App auth chain, read-only calls only ===\n');
  const tools = guardianAgent.createTools(dummySandbox);

  // repoId 12 = kelvinmaina01/compass-project, a real installation (139654039)
  console.log('--- list_issues (repoId=12, kelvinmaina01/compass-project) ---');
  const issuesRes: any = await (tools as any).list_issues.execute({ repoId: '12', state: 'open' });
  console.log(JSON.stringify(issuesRes, null, 2));

  console.log('\n--- get_file_contents (repoId=12, README.md) ---');
  const fileRes: any = await (tools as any).get_file_contents.execute({ repoId: '12', filePath: 'README.md' });
  console.log(fileRes.error ? fileRes : { size: fileRes.size, preview: fileRes.content?.slice(0, 200) });

  console.log('\n--- repoId with no installationId (repoId=11, codeward- itself) — should honestly fail, not fake success ---');
  const noInstallRes: any = await (tools as any).list_issues.execute({ repoId: '11', state: 'open' });
  console.log(JSON.stringify(noInstallRes, null, 2));
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
