import { Sandbox } from '@e2b/code-interpreter';
import type { SandboxHandle } from './local-exec.js';

export interface E2BSandboxConfig {
  apiKey?: string;
  workDir?: string;
}

export class E2BSandbox implements SandboxHandle {
  private sandbox: Sandbox | null = null;
  private apiKey: string;
  public workDir: string;
  private destroyed: boolean = false;

  constructor(config?: E2BSandboxConfig) {
    this.apiKey = config?.apiKey || process.env.E2B_API_KEY || '';
    this.workDir = config?.workDir || '/home/user/repo';

    if (!this.apiKey) {
      throw new Error('E2B_API_KEY is not configured in environment.');
    }
  }

  async init(
    repoUrl: string,
    commitSHA?: string,
    env: Record<string, string> = {},
    installationToken?: string
  ): Promise<void> {
    if (this.destroyed) {
      throw new Error('Cannot initialize a destroyed sandbox.');
    }

    console.log(`[E2BSandbox] Spawning isolated Firecracker microVM...`);
    this.sandbox = await Sandbox.create({
      apiKey: this.apiKey,
      envs: env,
      timeoutMs: 60 * 60 * 1000, // 1 hour session length (Hobby plan limit)
    });

    console.log(`[E2BSandbox] Sandbox ready (ID: ${this.sandbox.sandboxId}). Cloning ${repoUrl}...`);

    // Ensure working directory exists
    await this.sandbox.commands.run(`mkdir -p ${this.workDir}`);

    const authedUrl = installationToken
      ? repoUrl.replace('https://', `https://x-access-token:${installationToken}@`)
      : repoUrl;

    const cloneCmd = `GIT_LFS_SKIP_SMUDGE=1 git clone --depth 50 "${authedUrl}" ${this.workDir}`;
    const cloneRes = await this.sandbox.commands.run(cloneCmd);

    if (cloneRes.exitCode !== 0) {
      const sanitized = (cloneRes.stderr || cloneRes.stdout || '').replace(
        new RegExp(installationToken ?? '(?!)', 'g'),
        '[REDACTED]'
      );
      throw new Error(`Failed to clone repo into E2B sandbox: ${sanitized}`);
    }

    if (commitSHA && commitSHA !== 'baseline') {
      console.log(`[E2BSandbox] Checking out commit ${commitSHA}...`);
      const checkoutRes = await this.sandbox.commands.run(
        `cd ${this.workDir} && git checkout ${commitSHA}`
      );
      if (checkoutRes.exitCode !== 0) {
        console.warn(`[E2BSandbox] Warning during checkout of ${commitSHA}:`, checkoutRes.stderr);
      }
    }

    console.log(`[E2BSandbox] Repository initialized successfully at ${this.workDir}`);
  }

  async exec(command: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    if (this.destroyed || !this.sandbox) {
      throw new Error('E2B Sandbox is not running or has been destroyed.');
    }

    // Run command within the repository working directory
    const fullCmd = `cd ${this.workDir} && ${command}`;
    const res = await this.sandbox.commands.run(fullCmd);

    return {
      exitCode: res.exitCode ?? 0,
      stdout: res.stdout,
      stderr: res.stderr,
    };
  }

  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.sandbox) {
      console.log(`[E2BSandbox] Terminating sandbox ${this.sandbox.sandboxId} (Zero Compute Waste)...`);
      try {
        await this.sandbox.kill();
        console.log(`[E2BSandbox] Sandbox destroyed cleanly.`);
      } catch (err: any) {
        console.error(`[E2BSandbox] Error killing sandbox:`, err.message);
      } finally {
        this.sandbox = null;
      }
    }
  }
}
