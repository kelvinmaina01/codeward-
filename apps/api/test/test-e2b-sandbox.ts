import 'dotenv/config';
import { Sandbox } from '@e2b/code-interpreter';

async function testE2B() {
  console.log('--- Testing E2B Cloud Sandbox Connection ---');
  const apiKey = process.env.E2B_API_KEY;
  console.log(`API Key configured: ${apiKey ? apiKey.slice(0, 10) + '...' : 'NONE'}`);

  const start = Date.now();
  console.log('Spawning isolated E2B microVM sandbox...');
  const sandbox = await Sandbox.create({ apiKey });

  try {
    const bootMs = Date.now() - start;
    console.log(`✅ Sandbox spawned successfully in ${bootMs}ms! Sandbox ID: ${sandbox.sandboxId}`);

    console.log('Running test command: uname -a && cat /etc/os-release...');
    const result = await sandbox.commands.run('uname -a && cat /etc/os-release');
    console.log('Output stdout:\n', result.stdout.trim());

    console.log('Running memory and CPU check: free -h && lscpu | grep "Model name"...');
    const specs = await sandbox.commands.run('free -h && lscpu | grep "Model name"');
    console.log('Specs:\n', specs.stdout.trim());

    console.log('Testing file write and execution...');
    await sandbox.files.write('/tmp/test.txt', 'Codeward Sandbox Fallback Verified');
    const catRes = await sandbox.commands.run('cat /tmp/test.txt');
    console.log('File content read:', catRes.stdout.trim());

    console.log('✅ All E2B capabilities verified!');
  } finally {
    console.log('Cleaning up & destroying E2B sandbox (Zero Compute Waste)...');
    await sandbox.kill();
    console.log('✅ E2B Sandbox killed cleanly.');
  }
}

testE2B().catch((err) => {
  console.error('❌ E2B test error:', err);
  process.exit(1);
});
