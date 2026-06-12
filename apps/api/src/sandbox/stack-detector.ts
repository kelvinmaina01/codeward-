export type Runtime = 'node' | 'python' | 'unknown';

export interface StackConfig {
  runtime: Runtime;
  version: string;
  testRunner?: string;
  packageManager?: string;
}

/**
 * Given a list of files in a repository (or a local path),
 * detects the technology stack and returns the necessary environment config.
 */
export async function detectStack(files: string[]): Promise<StackConfig> {
  // Simple heuristic based on filenames
  const hasPackageJson = files.some(f => f.includes('package.json'));
  const hasRequirementsTxt = files.some(f => f.includes('requirements.txt'));
  const hasPipfile = files.some(f => f.includes('Pipfile'));
  const hasPyprojectToml = files.some(f => f.includes('pyproject.toml'));

  if (hasPackageJson) {
    let testRunner = 'npm test';
    if (files.some(f => f.includes('jest.config'))) testRunner = 'npx jest';
    if (files.some(f => f.includes('vitest.config'))) testRunner = 'npx vitest run';

    let pkgManager = 'npm';
    if (files.some(f => f.includes('yarn.lock'))) pkgManager = 'yarn';
    if (files.some(f => f.includes('pnpm-lock.yaml'))) pkgManager = 'pnpm';

    return {
      runtime: 'node',
      version: '20',
      testRunner,
      packageManager: pkgManager,
    };
  }

  if (hasRequirementsTxt || hasPipfile || hasPyprojectToml) {
    return {
      runtime: 'python',
      version: '3.11',
      testRunner: 'pytest',
      packageManager: hasPipfile ? 'pipenv' : 'pip',
    };
  }

  return {
    runtime: 'unknown',
    version: 'latest',
  };
}
