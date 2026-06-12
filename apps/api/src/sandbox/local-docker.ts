import { exec } from 'child_process';
import { promisify } from 'util';
import { randomBytes } from 'crypto';

const execAsync = promisify(exec);

export interface SandboxOptions {
  image: string;
  env?: Record<string, string>;
}

export class LocalSandbox {
  public id: string;
  private image: string;

  constructor(options: SandboxOptions) {
    this.id = `sandbox-${randomBytes(4).toString('hex')}`;
    this.image = options.image;
  }

  /**
   * Starts a detached Docker container that sleeps forever,
   * allowing us to `docker exec` into it multiple times.
   */
  async start(env: Record<string, string> = {}): Promise<void> {
    const envArgs = Object.entries(env)
      .map(([k, v]) => `-e ${k}="${v.replace(/"/g, '\\"')}"`)
      .join(' ');

    const cmd = `docker run -d --name ${this.id} ${envArgs} ${this.image}`;
    console.log(`[Sandbox ${this.id}] Starting: ${cmd}`);
    await execAsync(cmd);
  }

  /**
   * Executes a command inside the running container.
   */
  async exec(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    console.log(`[Sandbox ${this.id}] Executing: ${command}`);
    try {
      // Using /bin/sh -c to allow complex bash commands
      const escapedCmd = command.replace(/"/g, '\\"');
      const { stdout, stderr } = await execAsync(`docker exec ${this.id} /bin/sh -c "${escapedCmd}"`);
      return { stdout, stderr, exitCode: 0 };
    } catch (err: any) {
      // If execAsync fails, it usually means the command returned a non-zero exit code
      return { 
        stdout: err.stdout || '', 
        stderr: err.stderr || err.message, 
        exitCode: err.code || 1 
      };
    }
  }

  /**
   * Destroys the container forcefully.
   */
  async destroy(): Promise<void> {
    console.log(`[Sandbox ${this.id}] Destroying...`);
    try {
      await execAsync(`docker rm -f ${this.id}`);
    } catch (e) {
      console.error(`[Sandbox ${this.id}] Failed to destroy:`, e);
    }
  }
}
