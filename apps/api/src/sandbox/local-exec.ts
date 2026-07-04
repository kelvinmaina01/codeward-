import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export interface SandboxHandle {
  exec: (cmd: string) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  destroy: () => Promise<void>;
}

export class LocalExecSandbox implements SandboxHandle {
  public workDir: string;
  private destroyed: boolean = false;

  constructor() {
    // Create a temporary directory for this sandbox instance
    const tmpBase = os.tmpdir();
    this.workDir = path.join(tmpBase, `codeward-sandbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  }

  async init(repoUrl: string, commitSHA?: string): Promise<void> {
    await fs.mkdir(this.workDir, { recursive: true });
    console.log(`[LocalSandbox] Created workdir at ${this.workDir}`);

    // Clone the repo
    console.log(`[LocalSandbox] Cloning ${repoUrl}...`);
    try {
      // Use standard clone. If it requires auth, the URL should contain the token, or it's public.
      await this.exec(`GIT_LFS_SKIP_SMUDGE=1 git clone ${repoUrl} .`);
      
      if (commitSHA && commitSHA !== 'baseline') {
        console.log(`[LocalSandbox] Checking out ${commitSHA}...`);
        await this.exec(`git checkout ${commitSHA}`);
      }
    } catch (err: any) {
      console.error(`[LocalSandbox] Failed to clone ${repoUrl}:`, err);
      throw new Error(`Failed to clone repo: ${err.message}`);
    }
  }

  async exec(command: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    if (this.destroyed) {
      throw new Error("Sandbox has been destroyed.");
    }
    
    console.log(`[LocalSandbox] Executing: ${command}`);
    try {
      // Node's child_process.exec defaults maxBuffer to 1MB and silently truncates stdout
      // beyond that (confirmed live: a real repo's `fallow dupes` output was cut off mid-JSON-
      // string at byte 1,047,507). Real analysis tools on real repos routinely exceed 1MB.
      //
      // On Windows, child_process.exec defaults to cmd.exe, which cannot parse POSIX syntax
      // (`2>/dev/null`, `\(...\)`, `-E` regex escapes) that every tool in this codebase is
      // written against — confirmed live: `2>/dev/null` under cmd.exe fails with "The system
      // cannot find the path specified", silently triggering `||` fallbacks and making tools
      // report false "nothing found" results instead of actually running. The production
      // sandbox is a real Linux container (real /bin/sh), so forcing bash here on Windows dev
      // machines makes local behavior match production instead of adding a second bug.
      const shellOverride = process.platform === 'win32' ? { shell: 'bash.exe' } : {};
      const { stdout, stderr } = await execAsync(command, { cwd: this.workDir, maxBuffer: 1024 * 1024 * 100, ...shellOverride });
      return { exitCode: 0, stdout, stderr };
    } catch (err: any) {
      return { 
        exitCode: err.code || 1, 
        stdout: err.stdout || '', 
        stderr: err.stderr || err.message 
      };
    }
  }

  async destroy(): Promise<void> {
    if (this.destroyed) return;
    console.log(`[LocalSandbox] Destroying workdir ${this.workDir}...`);
    try {
      await fs.rm(this.workDir, { recursive: true, force: true });
    } catch (err) {
      console.error(`[LocalSandbox] Cleanup error:`, err);
    }
    this.destroyed = true;
  }
}
