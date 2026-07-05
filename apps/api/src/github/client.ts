import { App } from '@octokit/app';
import dotenv from 'dotenv';

dotenv.config();

const appId = process.env.GITHUB_APP_ID || '';
const privateKey = process.env.GITHUB_PRIVATE_KEY || '';

// Replace escaped \n characters with actual newlines for the PEM format to work
const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

export const githubApp = new App({
  appId,
  privateKey: formattedPrivateKey,
});

/**
 * Get an authenticated Octokit client for a specific repository installation.
 * This client has the permissions we granted the GitHub App.
 */
export async function getInstallationClient(installationId: number) {
  const octokit = await githubApp.getInstallationOctokit(installationId);
  return octokit;
}

/**
 * Real, short-lived GitHub App installation access token — needed to `git clone` a PRIVATE repo
 * inside a sandbox. Discovered via a real Fly.io test: LocalExecSandbox's plain
 * `git clone https://github.com/...` was silently succeeding all session on a private test repo
 * only because the local dev machine happened to have its own cached git credentials — a clean
 * Fly Machine (or any real customer's private repo, which is the common case) has none, and the
 * clone correctly failed with "could not read Username". This returns the real installation
 * token so callers can build an authenticated clone URL:
 * `https://x-access-token:<token>@github.com/owner/repo.git`.
 */
export async function getInstallationToken(installationId: number): Promise<string> {
  const auth: any = await githubApp.octokit.auth({ type: 'installation', installationId });
  if (!auth?.token) throw new Error(`Could not obtain a real installation token for installationId ${installationId}.`);
  return auth.token as string;
}
