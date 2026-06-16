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
      await this.exec(`git clone ${repoUrl} .`);
      
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
      const { stdout, stderr } = await execAsync(command, { cwd: this.workDir });
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
