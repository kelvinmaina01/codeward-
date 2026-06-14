import { FlySandbox } from './fly-machine.js';
import { detectStack } from './stack-detector.js';

export interface RunOptions {
  repoUrl: string;
  files: string[]; // Mock list of files from GitHub API to detect stack before cloning
  githubToken: string;
}

export async function runSandbox(options: RunOptions) {
  console.log(`[Runner] Starting sandbox run for ${options.repoUrl}`);

  // 1. Detect Stack
  const stack = await detectStack(options.files);
  console.log(`[Runner] Detected stack:`, stack);

  // Choose base image from the Fly.io registry
  // We use the exact deployment hash from our remote build
  const image = stack.runtime === 'python' 
    ? 'registry.fly.io/codeward-sandboxes-v2:python' 
    : 'registry.fly.io/codeward-sandboxes-v2:deployment-01KV13ANZ9AJNNPAXN4A75G44Y';

  // 2. Create Sandbox in the Cloud
  const sandbox = new FlySandbox({ image });
  
  try {
    // Start sandbox with token injected
    await sandbox.start({
      GITHUB_TOKEN: options.githubToken,
      STRIPE_SECRET_KEY: 'sk_test_dummy_key_for_testing'
    });

    // 3. Clone Repository
    // Using a securely injected token URL for clone
    // Since we don't have real tokens in local testing often, we assume public clone or token injected via env
    const cloneCmd = `git clone https://\${GITHUB_TOKEN}@${options.repoUrl.replace('https://', '')} /app/repo`;
    const cloneRes = await sandbox.exec(cloneCmd);
    if (cloneRes.exitCode !== 0) throw new Error(`Clone failed: ${cloneRes.stderr}`);
    
    // 4. Install Dependencies
    if (stack.runtime === 'node') {
      console.log(`[Runner] Installing Node dependencies using ${stack.packageManager}`);
      const installRes = await sandbox.exec(`cd /app/repo && ${stack.packageManager} install`);
      if (installRes.exitCode !== 0) console.warn(`[Runner] Install warnings/errors: ${installRes.stderr}`);
    } else if (stack.runtime === 'python') {
      console.log(`[Runner] Installing Python dependencies`);
      if (stack.packageManager === 'pipenv') {
        await sandbox.exec(`cd /app/repo && pip install pipenv && pipenv install`);
      } else {
        await sandbox.exec(`cd /app/repo && pip install -r requirements.txt`);
      }
    }

    // 5. Run Security Scans (Mock example using TruffleHog)
    // In production we would parse the JSON output of these tools
    console.log(`[Runner] Running Security Agents...`);
    const secRes = await sandbox.exec(`cd /app/repo && trufflehog filesystem . --json`);
    
    // 6. Run Test Suite
    let testOutput = '';
    if (stack.testRunner) {
      console.log(`[Runner] Running Test Runner: ${stack.testRunner}`);
      const testRes = await sandbox.exec(`cd /app/repo && ${stack.testRunner}`);
      testOutput = testRes.stdout + '\n' + testRes.stderr;
    }

    console.log(`[Runner] Run completed successfully.`);
    return {
      success: true,
      stack,
      securityScan: secRes.stdout,
      testOutput
    };

  } catch (error: any) {
    console.error(`[Runner] Run failed:`, error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    // 7. Cleanup
    await sandbox.destroy();
  }
}
