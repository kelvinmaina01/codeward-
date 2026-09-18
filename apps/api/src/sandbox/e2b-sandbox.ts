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

    // `git clone <url> <dir>` fails with exit 128 ("destination path already exists and is not an
    // empty directory") whenever the target has any content. The previous `mkdir -p` created the
    // directory up-front, which is harmless while it stays empty but turns a retry — or any base
    // template that ships something at this path — into a guaranteed 128. Let git create the
    // directory itself, and clear any leftovers first so init() is idempotent.
    await this.runRaw(`rm -rf ${this.workDir}`);

    const authedUrl = installationToken
      ? repoUrl.replace('https://', `https://x-access-token:${installationToken}@`)
      : repoUrl;

    const cloneCmd = `GIT_LFS_SKIP_SMUDGE=1 git clone --depth 50 "${authedUrl}" ${this.workDir}`;

    // The E2B SDK THROWS `CommandExitError` on any non-zero exit — it does not return a result with
    // a non-zero exitCode. The old `if (cloneRes.exitCode !== 0)` branch below was therefore
    // unreachable dead code: its token-redaction never ran, and the raw error propagated as a bare
    // "CommandExitError: exit status 128" with git's actual stderr nowhere in the logs. Catching it
    // is the only way to surface why the clone really failed.
    try {
      await this.sandbox.commands.run(cloneCmd);
    } catch (err: any) {
      const stderr = String(err?.stderr ?? '').trim();
      const stdout = String(err?.stdout ?? '').trim();
      const exitCode = err?.exitCode ?? 'unknown';
      const detail = this.redact(stderr || stdout || err?.message || 'no output captured', installationToken);

      // Exit 128 is git's generic fatal. These are the three that actually happen in a fresh microVM.
      let hint = '';
      if (/already exists and is not an empty directory/i.test(detail)) {
        hint = ' — the working directory was not empty before cloning.';
      } else if (/Authentication failed|could not read Username|Invalid username or password|403/i.test(detail)) {
        hint = ' — the GitHub installation token is missing, expired, or lacks access to this repository.';
      } else if (/not found|Repository not found|does not exist/i.test(detail)) {
        hint = ' — the repository does not exist or the App installation cannot see it.';
      } else if (/could not resolve host|Could not resolve proxy|unable to access/i.test(detail)) {
        hint = ' — the sandbox has no outbound network access to github.com.';
      }

      throw new Error(`Failed to clone repo into E2B sandbox (git exit ${exitCode})${hint}\n${detail}`);
    }

    if (commitSHA && commitSHA !== 'baseline') {
      console.log(`[E2BSandbox] Checking out commit ${commitSHA}...`);
      // Non-fatal by design: a shallow --depth 50 clone legitimately may not contain the SHA.
      const checkoutRes = await this.exec(`git checkout ${commitSHA}`);
      if (checkoutRes.exitCode !== 0) {
        console.warn(`[E2BSandbox] Warning during checkout of ${commitSHA}:`, this.redact(checkoutRes.stderr, installationToken));
      }
    }

    console.log(`[E2BSandbox] Repository initialized successfully at ${this.workDir}`);
  }

  /** Strips an installation token out of any text before it reaches a log or an error message. */
  private redact(text: string, token?: string): string {
    if (!text) return '';
    let out = text;
    if (token) out = out.split(token).join('[REDACTED]');
    // Also catch the embedded-credential form in case the URL is echoed back by git.
    return out.replace(/https:\/\/[^@\s]*:?[^@\s]*@/g, 'https://[REDACTED]@');
  }

  /** Runs a command outside the repo directory, tolerating a non-zero exit. */
  private async runRaw(command: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    try {
      const res = await this.sandbox!.commands.run(command);
      return { exitCode: res.exitCode ?? 0, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
    } catch (err: any) {
      return { exitCode: err?.exitCode ?? 1, stdout: String(err?.stdout ?? ''), stderr: String(err?.stderr ?? err?.message ?? '') };
    }
  }

  async exec(command: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    if (this.destroyed || !this.sandbox) {
      throw new Error('E2B Sandbox is not running or has been destroyed.');
    }

    // SandboxHandle's contract is to RETURN a non-zero exitCode, not to throw — every agent tool
    // relies on that (a grep with no matches exits 1, `test -f` exits 1, npm audit exits non-zero
    // when it finds advisories). Since the E2B SDK throws on any non-zero exit, an uncaught call
    // here turned each of those ordinary outcomes into a crashed agent run.
    const fullCmd = `cd ${this.workDir} && ${command}`;
    return this.runRaw(fullCmd);
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
