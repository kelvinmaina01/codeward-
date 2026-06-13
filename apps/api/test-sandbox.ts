import 'dotenv/config';
import { runSandbox } from './src/sandbox/runner';

async function main() {
  console.log('Testing Sandbox Runner (Fly.io Cloud)...');
  
  const result = await runSandbox({
    repoUrl: 'https://github.com/kelvinmaina01/codeward-', // Sample repo
    files: ['package.json', 'src/index.ts', 'jest.config.js'], // Mock files to trigger node detection
    githubToken: process.env.GITHUB_TOKEN || 'mock-token'
  });

  console.log('\n--- Sandbox Result ---');
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
