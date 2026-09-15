import dns from 'node:dns';
// Fix for Node.js 18+ fetch throwing ConnectTimeoutError on IPv6 default networks
dns.setDefaultResultOrder('ipv4first');

export interface FlySandboxConfig {
  image?: string; // The full registry path e.g. registry.fly.io/codeward-sandboxes-v2:node
  appName?: string;
}

export class FlySandbox {
  private machineId: string | null = null;
  private config: FlySandboxConfig;
  private apiBase: string;
  private token: string;
  // No API param sets a working directory for Machines exec — every command is run fresh
  // relative to the image's default cwd. Confirmed live: a boot-and-exec smoke test returned
  // `pwd` == "/". Every real tool in this codebase (sandbox.tools.ts, bloat.tools.ts, etc.)
  // assumes a persistent cwd the way LocalExecSandbox provides via child_process's `cwd`
  // option — so exec() below prepends `cd <workDir> &&` once init() has cloned the repo.
  public workDir = '/app/repo';

  constructor(config: FlySandboxConfig = {}) {
    this.config = config || {};
    this.config.image = this.config.image || 'registry.fly.io/codeward-sandboxes-v2:node';
    this.config.appName = this.config.appName || 'codeward-sandboxes-v2';
    this.apiBase = `https://api.machines.dev/v1/apps/${this.config.appName}`;

    let rawToken = process.env.FLY_API_TOKEN || (config as any)?.token || '';
    this.token = rawToken.trim();
  }

  /**
   * Performs fetch requests with an AbortController deadline to prevent worker deadlocks.
   */
  public async fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      return res;
    } catch (err: any) {
      if (err.name === 'AbortError' || err.code === 20) {
        throw new Error(`Fly.io API request timed out after ${timeoutMs}ms (${url})`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Boots the machine (if not already running) and clones the target repo into workDir —
   * mirroring LocalExecSandbox.init()'s contract so the two are interchangeable behind the
   * same SandboxHandle-shaped interface.
   */
  async init(repoUrl: string, commitSHA?: string, env: Record<string, string> = {}, installationToken?: string): Promise<void> {
    if (!this.machineId) {
      await this.start(env);
    }
    // A fresh Fly Machine has NO git credentials of its own. A real test caught this: a plain
    // `git clone https://github.com/...` on a PRIVATE repo fails here with "could not read
    // Username" — it only ever appeared to work in earlier local-sandbox testing because the
    // local dev machine had its own cached credentials, which a real customer's clean sandbox
    // never has. Embed the real GitHub App installation token when the caller has one (any
    // repo the app is actually installed on, private or public); fall back to a bare clone for
    // genuinely public/no-installation cases.
    const authedUrl = installationToken
      ? repoUrl.replace('https://', `https://x-access-token:${installationToken}@`)
      : repoUrl;
    console.log(`[FlySandbox] Cloning ${repoUrl} into ${this.workDir}${installationToken ? ' (authenticated)' : ''}...`);
    const cloneRes = await this.execRaw(`mkdir -p "${this.workDir}" && GIT_LFS_SKIP_SMUDGE=1 git clone "${authedUrl}" "${this.workDir}"`);
    if (cloneRes.exitCode !== 0) {
      // Never let a real token leak into an error message/log.
      const sanitized = (cloneRes.stderr || cloneRes.stdout).replace(new RegExp(installationToken ?? '(?!)', 'g'), '[REDACTED]');
      throw new Error(`Failed to clone repo into Fly sandbox: ${sanitized}`);
    }
    if (commitSHA && commitSHA !== 'baseline') {
      console.log(`[FlySandbox] Checking out ${commitSHA}...`);
      const checkoutRes = await this.exec(`GIT_LFS_SKIP_SMUDGE=1 git checkout ${commitSHA}`);
      if (checkoutRes.exitCode !== 0) {
        throw new Error(`Failed to checkout ${commitSHA} in Fly sandbox: ${checkoutRes.stderr || checkoutRes.stdout}`);
      }
    }
  }

  /**
   * Spins up a new isolated VM in the cloud
   */
  async start(env: Record<string, string> = {}) {
    console.log(`[FlySandbox] Creating machine from image: ${this.config.image}`);
    
    // Auto-destroy the machine when the process exits or stops
    const res = await this.fetchWithTimeout(`${this.apiBase}/machines`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        config: {
          image: this.config.image,
          env: env,
          guest: {
            cpu_kind: "shared",
            cpus: 2,
            memory_mb: 1024
          },
          auto_destroy: true, // Fly feature to destroy machine if it exits
          init: {
            exec: ["sleep", "infinity"] // Keep it running so we can exec into it
          }
        }
      })
    }, 15000);
    
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to create Fly machine: ${res.status} ${res.statusText} - ${err}`);
    }

    const data = await res.json() as any;
    this.machineId = data.id;
    console.log(`[FlySandbox] Machine created with ID: ${this.machineId}`);

    // Wait for the machine to be fully started
    await this.waitForMachine(this.machineId!, 'started');
    console.log(`[FlySandbox] Machine ${this.machineId} is fully booted and ready.`);
  }

  /**
   * Executes a command inside the running VM, relative to the cloned repo's workDir.
   * Use execRaw() instead for commands (like the clone itself) that must run before
   * workDir exists.
   */
  async exec(command: string) {
    return this.execRaw(`cd "${this.workDir}" && ${command}`);
  }

  private async execRaw(command: string) {
    if (!this.machineId) throw new Error("Machine is not running");

    // Never log a real installation token embedded in an authenticated clone URL.
    console.log(`[FlySandbox Exec] ${command.replace(/x-access-token:[^@]+@/g, 'x-access-token:[REDACTED]@')}`);
    const encoded = Buffer.from(command, 'utf8').toString('base64');
    const wrapped = `/bin/sh -c 'echo ${encoded} | base64 -d | /bin/sh'`;
    const res = await this.fetchWithTimeout(`${this.apiBase}/machines/${this.machineId}/exec`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cmd: wrapped,
        timeout: 600
      })
    }, 610000);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to exec command: ${err}`);
    }

    const data = await res.json() as any;
    return {
      exitCode: data.exit_code,
      stdout: data.stdout || '',
      stderr: data.stderr || ''
    };
  }

  /**
   * Destroys the VM
   */
  async destroy() {
    if (!this.machineId) return;
    
    console.log(`[FlySandbox] Tearing down machine ${this.machineId}...`);
    try {
      const res = await this.fetchWithTimeout(`${this.apiBase}/machines/${this.machineId}?force=true`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        }
      }, 15000);
      if (!res.ok) {
        console.error(`[FlySandbox] Failed to destroy machine ${this.machineId}: ${await res.text()}`);
      } else {
        console.log(`[FlySandbox] Machine ${this.machineId} destroyed successfully.`);
      }
    } catch (err) {
      console.error(`[FlySandbox] Error destroying machine:`, err);
    } finally {
      this.machineId = null;
    }
  }

  private async waitForMachine(id: string, desiredState: string) {
    for (let i = 0; i < 30; i++) {
      const res = await this.fetchWithTimeout(`${this.apiBase}/machines/${id}`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      }, 15000);
      if (res.ok) {
        const data = await res.json() as any;
        if (data.state === desiredState) return;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error(`Machine did not reach state '${desiredState}' in time.`);
  }
}
