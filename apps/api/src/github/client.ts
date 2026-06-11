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
