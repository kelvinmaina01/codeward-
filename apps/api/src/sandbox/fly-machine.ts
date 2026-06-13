import dns from 'node:dns';
// Fix for Node.js 18+ fetch throwing ConnectTimeoutError on IPv6 default networks
dns.setDefaultResultOrder('ipv4first');

export interface FlySandboxConfig {
  image: string; // The full registry path e.g. registry.fly.io/codeward-sandboxes-v2:node
  appName?: string;
}

export class FlySandbox {
  private machineId: string | null = null;
  private config: FlySandboxConfig;
  private apiBase: string;
  private token: string;

  constructor(config: FlySandboxConfig) {
    this.config = config;
    this.config.appName = config.appName || 'codeward-sandboxes-v2';
    this.apiBase = `https://api.machines.dev/v1/apps/${this.config.appName}`;
    
    let rawToken = process.env.FLY_API_TOKEN || '';
    if (!rawToken) {
      throw new Error("FLY_API_TOKEN is not set in environment.");
    }
    
    // FlyV1 Macaroons use commas to append third-party discharge tokens. 
    // We MUST use the entire string exactly as provided.
    this.token = rawToken.trim();
  }

  /**
   * Spins up a new isolated VM in the cloud
   */
  async start(env: Record<string, string> = {}) {
    console.log(`[FlySandbox] Creating machine from image: ${this.config.image}`);
    
    // Auto-destroy the machine when the process exits or stops
    const res = await fetch(`${this.apiBase}/machines`, {
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
    });
    
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
   * Executes a command inside the running VM
   */
  async exec(command: string) {
    if (!this.machineId) throw new Error("Machine is not running");
    
    console.log(`[FlySandbox Exec] ${command}`);
    const res = await fetch(`${this.apiBase}/machines/${this.machineId}/exec`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cmd: `/bin/sh -c "${command.replace(/"/g, '\\"')}"`,
        timeout: 600
      })
    });

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
      const res = await fetch(`${this.apiBase}/machines/${this.machineId}?force=true`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        }
      });
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
      const res = await fetch(`${this.apiBase}/machines/${id}`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (res.ok) {
        const data = await res.json() as any;
        if (data.state === desiredState) return;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error(`Machine did not reach state '${desiredState}' in time.`);
  }
}
