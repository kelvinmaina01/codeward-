// This used to be a second, drifted copy of the GitHub App client — it read
// GITHUB_APP_PRIVATE_KEY, which doesn't exist in .env (the real var is GITHUB_PRIVATE_KEY,
// used correctly by github/client.ts), and skipped the \n-escape-to-newline PEM conversion
// that RSA key parsing needs. Every caller of getInstallationOctokit was silently broken.
// Delegating to the one working implementation instead of maintaining two.
export { githubApp, getInstallationClient as getInstallationOctokit } from '../github/client.js';
