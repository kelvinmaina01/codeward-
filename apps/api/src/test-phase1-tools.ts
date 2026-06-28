import { LocalExecSandbox } from './sandbox/local-exec.js';
import { createOrchestratorTools } from './agents/definitions/orchestrator/orchestrator.tools.js';

async function main() {
  const sandbox = new LocalExecSandbox();
  
  try {
    // Clone a popular open source repository as a test
    console.log('--- Setting up Sandbox ---');
    // Using simple/express or similar small repo to test
    await sandbox.init('https://github.com/expressjs/express.git');
    
    const tools = createOrchestratorTools(sandbox);
    
    console.log('\n--- Testing read_repo_config ---');
    const configRes = await tools.read_repo_config.execute({
      repoPath: 'expressjs/express',
      repoId: '123'
    });
    console.log('Config result:', configRes);
    
    console.log('\n--- Testing analyse_commit_diff ---');
    // We just execute it against whatever the HEAD is of the cloned repo
    const diffRes = await tools.analyse_commit_diff.execute({});
    console.log('Diff Analysis Result:', JSON.stringify(diffRes, null, 2));

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    console.log('\n--- Cleaning up ---');
    await sandbox.destroy();
  }
}

main();
