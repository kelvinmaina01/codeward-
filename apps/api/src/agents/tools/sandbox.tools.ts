/**
 * ============================================================================
 * Sandbox Tools — Generic tools any agent can use
 * ============================================================================
 * 
 * These tools wrap the FlySandbox.exec() method we already built.
 * They give any agent the ability to explore the codebase, run commands,
 * and read files inside the hermetically sealed sandbox VM.
 * 
 * Defined with Zod schemas — works with ANY provider (Anthropic, OpenAI, etc.)
 * ============================================================================
 */

import { z } from 'zod';
import type { SandboxHandle } from '../core/provider.js';

/**
 * Create the generic sandbox tools for a given sandbox instance.
 */
export function createSandboxTools(sandbox: SandboxHandle) {
  return {

    exec_command: {
      description: 'Execute a shell command inside the isolated sandbox VM. Use this to run scripts, install dependencies, or inspect the system. The sandbox has no network access.',
      parameters: z.object({
        command: z.string().describe('The shell command to execute'),
      }),
      execute: async ({ command }: { command: string }) => {
        const result = await sandbox.exec(command);
        return {
          exitCode: result.exitCode,
          stdout: result.stdout.substring(0, 8000),
          stderr: result.stderr.substring(0, 4000),
        };
      },
    },

    read_file: {
      description: 'Read the full contents of a file from the cloned repository.',
      parameters: z.object({
        path: z.string().describe('Relative path from repo root, e.g. "src/auth/session.ts"'),
      }),
      execute: async ({ path }: { path: string }) => {
        const result = await sandbox.exec(`cat /repo/${path}`);
        if (result.exitCode !== 0) {
          return { error: `File not found: ${path}`, stderr: result.stderr };
        }
        return { content: result.stdout.substring(0, 12000) };
      },
    },

    list_files: {
      description: 'List all files and directories at the given path.',
      parameters: z.object({
        path: z.string().describe('Relative directory path from repo root'),
        recursive: z.boolean().optional().describe('If true, list recursively. Default: false.'),
      }),
      execute: async ({ path, recursive }: { path: string; recursive?: boolean }) => {
        const cmd = recursive
          ? `find /repo/${path} -type f | head -200`
          : `ls -la /repo/${path}`;
        const result = await sandbox.exec(cmd);
        return { listing: result.stdout.substring(0, 6000) };
      },
    },

    grep_search: {
      description: 'Search for a text pattern across all files in the repository. Returns matching lines with file paths and line numbers.',
      parameters: z.object({
        pattern: z.string().describe('The search pattern (supports grep regex)'),
        path: z.string().optional().describe('Subdirectory to search in. Default: entire repo.'),
        flags: z.string().optional().describe('Additional grep flags. Default: "-rn"'),
      }),
      execute: async ({ pattern, path, flags }: { pattern: string; path?: string; flags?: string }) => {
        const searchPath = path ? `/repo/${path}` : '/repo';
        const grepFlags = flags || '-rn';
        const cmd = `grep ${grepFlags} "${pattern.replace(/"/g, '\\"')}" ${searchPath} --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" --include="*.go" --include="*.rs" --include="*.java" --include="*.rb" --include="*.env*" --include="*.yml" --include="*.yaml" --include="*.json" | head -100`;
        const result = await sandbox.exec(cmd);
        return {
          matches: result.stdout.substring(0, 8000),
          matchCount: result.stdout.split('\n').filter(Boolean).length,
        };
      },
    },

    get_project_summary: {
      description: 'Get a high-level summary of the repository: package.json, file count, lines of code. Call this first.',
      parameters: z.object({}),
      execute: async () => {
        const [pkgJson, fileCount, loc] = await Promise.all([
          sandbox.exec('cat /repo/package.json 2>/dev/null || echo "No package.json"'),
          sandbox.exec('find /repo -type f -not -path "*/node_modules/*" -not -path "*/.git/*" | wc -l'),
          sandbox.exec('find /repo -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.go" | xargs wc -l 2>/dev/null | tail -1'),
        ]);
        return {
          packageJson: pkgJson.stdout.substring(0, 4000),
          totalFiles: fileCount.stdout.trim(),
          linesOfCode: loc.stdout.trim(),
        };
      },
    },
  };
}
