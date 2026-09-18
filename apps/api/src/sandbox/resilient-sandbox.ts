import { FlySandbox, type FlySandboxConfig } from './fly-machine.js';
import { E2BSandbox } from './e2b-sandbox.js';
import { LocalExecSandbox, type SandboxHandle } from './local-exec.js';

export interface ResilientSandboxConfig {
  preferredProvider?: 'fly' | 'e2b' | 'local';
  flyConfig?: FlySandboxConfig;
}

/**
 * ResilientSandbox: Production-grade multi-cloud sandbox coordinator.
 * Tries the primary cloud sandbox provider (Fly.io microVMs).
 * If Fly encounters capacity exhaustion, rate limits, or boot timeouts,
 * it seamlessly fails over to E2B Firecracker sandboxes (or local dev environment).
 */
export class ResilientSandbox implements SandboxHandle {
  private activeHandle: SandboxHandle | null = null;
  private config: ResilientSandboxConfig;
  public workDir: string = '/app/repo';

  constructor(config?: ResilientSandboxConfig) {
    this.config = config || {};
  }

  async init(
    repoUrl: string,
    commitSHA?: string,
    env: Record<string, string> = {},
    installationToken?: string,
    onProgress?: (msg: string) => void
  ): Promise<void> {
    const provider = this.config.preferredProvider || (process.env.SANDBOX_PROVIDER as any) || 'fly';

    // 1. If explicitly set to E2B or E2B is preferred
    if (provider === 'e2b' && process.env.E2B_API_KEY) {
      console.log('[ResilientSandbox] 🚀 Initializing primary sandbox via E2B Cloud...');
      const e2b = new E2BSandbox();
      await e2b.init(repoUrl, commitSHA, env, installationToken, onProgress);
      this.activeHandle = e2b;
      this.workDir = e2b.workDir;
      return;
    }

    // 2. If configured for Fly.io
    if (provider === 'fly' && process.env.FLY_API_TOKEN) {
      try {
        console.log('[ResilientSandbox] 🚀 Initializing primary sandbox via Fly.io Machines...');
        const image =
          this.config.flyConfig?.image ||
          process.env.FLY_SANDBOX_IMAGE ||
          'registry.fly.io/codeward-sandboxes-v2:deployment-01KV13ANZ9AJNNPAXN4A75G44Y';
        const fly = new FlySandbox({ image, appName: this.config.flyConfig?.appName });
        await fly.init(repoUrl, commitSHA, env, installationToken);
        this.activeHandle = fly;
        this.workDir = fly.workDir;
        return;
      } catch (flyErr: any) {
        console.warn(`[ResilientSandbox] ⚠️ Fly.io sandbox failed to initialize: ${flyErr.message}`);

        // Failover to E2B if key is available
        if (process.env.E2B_API_KEY) {
          console.log('[ResilientSandbox] 🔄 Failing over to E2B Cloud Sandbox...');
          const e2b = new E2BSandbox();
          await e2b.init(repoUrl, commitSHA, env, installationToken, onProgress);
          this.activeHandle = e2b;
          this.workDir = e2b.workDir;
          console.log('[ResilientSandbox] ✅ Failover to E2B successful!');
          return;
        }

        // If in development and local execution allowed
        if (process.env.NODE_ENV !== 'production') {
          console.log('[ResilientSandbox] 🔄 Falling back to LocalExecSandbox for dev testing...');
          const local = new LocalExecSandbox();
          await local.init(repoUrl, commitSHA, env, installationToken);
          this.activeHandle = local;
          this.workDir = local.workDir;
          return;
        }

        throw flyErr;
      }
    }

    // 3. Fallback to LocalExecSandbox if in development
    if (process.env.NODE_ENV !== 'production') {
      const local = new LocalExecSandbox();
      await local.init(repoUrl, commitSHA, env, installationToken);
      this.activeHandle = local;
      this.workDir = local.workDir;
      return;
    }

    throw new Error('No available cloud sandbox provider configured (set FLY_API_TOKEN or E2B_API_KEY).');
  }

  async exec(command: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    if (!this.activeHandle) {
      throw new Error('No sandbox is currently initialized.');
    }
    return this.activeHandle.exec(command);
  }

  async destroy(): Promise<void> {
    if (this.activeHandle) {
      await this.activeHandle.destroy();
      this.activeHandle = null;
    }
  }
}
