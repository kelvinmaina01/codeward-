import { App } from '@octokit/app';

const appId = process.env.GITHUB_APP_ID;
const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

if (!appId || !privateKey) {
  console.warn('[GitHub App] GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY missing. Octokit app features will not work.');
}

export const githubApp = new App({
  appId: appId || '0',
  privateKey: privateKey || 'missing',
});

export async function getInstallationOctokit(installationId: number) {
  return await githubApp.getInstallationOctokit(installationId);
}
