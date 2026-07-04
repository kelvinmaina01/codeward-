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
  // No API param sets a working directory for Machines exec — every command is run fresh
  // relative to the image's default cwd. Confirmed live: a boot-and-exec smoke test returned
  // `pwd` == "/". Every real tool in this codebase (sandbox.tools.ts, bloat.tools.ts, etc.)
  // assumes a persistent cwd the way LocalExecSandbox provides via child_process's `cwd`
  // option — so exec() below prepends `cd <workDir> &&` once init() has cloned the repo.
  public workDir = '/app/repo';

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
   * Boots the machine (if not already running) and clones the target repo into workDir —
   * mirroring LocalExecSandbox.init()'s contract so the two are interchangeable behind the
   * same SandboxHandle-shaped interface.
   */
  async init(repoUrl: string, commitSHA?: string, env: Record<string, string> = {}): Promise<void> {
    if (!this.machineId) {
      await this.start(env);
    }
    console.log(`[FlySandbox] Cloning ${repoUrl} into ${this.workDir}...`);
    const cloneRes = await this.execRaw(`mkdir -p "${this.workDir}" && GIT_LFS_SKIP_SMUDGE=1 git clone "${repoUrl}" "${this.workDir}"`);
    if (cloneRes.exitCode !== 0) {
      throw new Error(`Failed to clone repo into Fly sandbox: ${cloneRes.stderr || cloneRes.stdout}`);
    }
    if (commitSHA && commitSHA !== 'baseline') {
      console.log(`[FlySandbox] Checking out ${commitSHA}...`);
      const checkoutRes = await this.exec(`git checkout ${commitSHA}`);
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
   * Executes a command inside the running VM, relative to the cloned repo's workDir.
   * Use execRaw() instead for commands (like the clone itself) that must run before
   * workDir exists.
   */
  async exec(command: string) {
    return this.execRaw(`cd "${this.workDir}" && ${command}`);
  }

  private async execRaw(command: string) {
    if (!this.machineId) throw new Error("Machine is not running");

    console.log(`[FlySandbox Exec] ${command}`);
    // Three real, empirically-tested findings here, in order — the first two verified only by
    // exit code/line count, which was itself the mistake the third one caught:
    // 1. cmd as an array fails outright — Fly's Go handler rejects it: "cannot unmarshal
    //    array into Go struct field machineExecRequestRaw.cmd of type string". cmd MUST be a
    //    plain string.
    // 2. As a hand-escaped string (`/bin/sh -c "${command.replace(/"/g,'\\"')}"`), real grep
    //    commands with nested quotes/backticks broke with "body is missing command: EOF found
    //    when expecting closing quote" — Fly tokenizes the cmd string itself (quote-aware,
    //    shlex-style) before executing, so nested-quote escaping doesn't survive that pass.
    // 3. A bare `echo <b64> | base64 -d | /bin/sh` as cmd does NOT get real pipe behavior —
    //    Fly's tokenizer splits it into argv (`echo`, the b64 string, `|`, `base64`, `-d`,
    //    `|`, `/bin/sh`) and execve's `echo` directly with all of that as literal arguments,
    //    no shell in between to interpret the pipes. echo dutifully echoed everything back —
    //    caught only by actually reading stdout content instead of trusting a non-empty,
    //    non-erroring response as success.
    // Real fix: force a genuine shell invocation via explicit argv (`/bin/sh -c <script>`),
    // with the whole pipeline as ONE single-quoted token so Fly's tokenizer treats it as one
    // opaque string (single quotes are safe here — the base64 alphabet never contains one) —
    // the real /bin/sh THAT single-quoted `-c` argument invokes is what interprets the pipes.
    const encoded = Buffer.from(command, 'utf8').toString('base64');
    const wrapped = `/bin/sh -c 'echo ${encoded} | base64 -d | /bin/sh'`;
    const res = await fetch(`${this.apiBase}/machines/${this.machineId}/exec`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cmd: wrapped,
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
