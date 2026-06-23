import { App } from 'octokit';
import * as dotenv from 'dotenv';
dotenv.config();

export async function getInstallationToken(installationId: number): Promise<string> {
  if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_PRIVATE_KEY) {
    throw new Error('Missing GitHub App configuration (GITHUB_APP_ID, GITHUB_PRIVATE_KEY)');
  }

  // Format private key correctly if it's passed as a single line in .env
  const privateKey = process.env.GITHUB_PRIVATE_KEY.includes('\\n') 
    ? process.env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n')
    : process.env.GITHUB_PRIVATE_KEY;

  const app = new App({
    appId: process.env.GITHUB_APP_ID,
    privateKey,
  });

  try {
    const { data } = await app.octokit.request('POST /app/installations/{installation_id}/access_tokens', {
      installation_id: installationId
    });
    return data.token;
  } catch (err: any) {
    console.error(`Failed to generate installation token for ${installationId}:`, err.message);
    throw new Error(`Failed to authenticate with GitHub App for installation ${installationId}`);
  }
}
