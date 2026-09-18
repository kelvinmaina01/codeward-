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

    // Ensure clean working directory before cloning to prevent git 128 collisions
    await this.sandbox.commands.run(`rm -rf ${this.workDir} && mkdir -p ${this.workDir}`);

    const authedUrl = installationToken
      ? repoUrl.replace('https://', `https://x-access-token:${installationToken}@`)
      : repoUrl;

    const runClone = async (url: string) => {
      const cloneCmd = `GIT_LFS_SKIP_SMUDGE=1 git clone --depth 50 "${url}" ${this.workDir}`;
      return await this.sandbox!.commands.run(cloneCmd);
    };

    try {
      await runClone(authedUrl);
    } catch (cloneErr: any) {
      // If authenticated clone fails (e.g. invalid/expired installationToken, status 128),
      // attempt unauthenticated clone if token was used (handles public repos cleanly)
      if (installationToken) {
        console.warn(`[E2BSandbox] Authenticated clone failed (${cloneErr.message}). Retrying unauthenticated clone for ${repoUrl}...`);
        try {
          await this.sandbox.commands.run(`rm -rf ${this.workDir} && mkdir -p ${this.workDir}`);
          await runClone(repoUrl);
        } catch (fallbackErr: any) {
          const rawErr = fallbackErr.stderr || fallbackErr.stdout || fallbackErr.message || '';
          const sanitized = rawErr.replace(new RegExp(installationToken, 'g'), '[REDACTED]');
          throw new Error(`Failed to clone repository into sandbox (exit ${fallbackErr.exitCode ?? 128}): ${sanitized || fallbackErr.message}`);
        }
      } else {
        const rawErr = cloneErr.stderr || cloneErr.stdout || cloneErr.message || '';
        throw new Error(`Failed to clone repository into sandbox (exit ${cloneErr.exitCode ?? 128}): ${rawErr || cloneErr.message}`);
      }
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
    try {
      const res = await this.sandbox.commands.run(fullCmd);
      return {
        exitCode: res.exitCode ?? 0,
        stdout: res.stdout || '',
        stderr: res.stderr || '',
      };
    } catch (err: any) {
      // E2B commands.run throws CommandExitError on non-zero exit codes.
      // CLI static analysis tools (like fallow, grep, git diff) legitimately return exitCode 1
      // when issues/matches are found. Returning the output with the exit code allows agents
      // to parse the findings instead of treating normal analysis results as a fatal container crash.
      if (err.exitCode !== undefined || err.name === 'CommandExitError') {
        return {
          exitCode: err.exitCode ?? 1,
          stdout: err.stdout || '',
          stderr: err.stderr || err.message || '',
        };
      }
      throw err;
    }
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
