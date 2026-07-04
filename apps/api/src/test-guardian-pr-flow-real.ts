import 'dotenv/config';
import { guardianAgent } from './agents/definitions/guardian.agent.js';
import type { SandboxHandle } from './agents/core/provider.js';

const dummySandbox: SandboxHandle = { exec: async () => ({ exitCode: 0, stdout: '', stderr: '' }), destroy: async () => {} };
const REPO_ID = '12'; // kelvinmaina01/compass-project

async function main() {
  const tools: any = guardianAgent.createTools(dummySandbox);

  const { db } = await import('./db/index.js');
  const { repositories } = await import('./db/schema.js');
  const { eq } = await import('drizzle-orm');
  const { getInstallationOctokit } = await import('./lib/github.js');
  const repo = await db.query.repositories.findFirst({ where: eq(repositories.id, Number(REPO_ID)) });
  const octokit: any = await getInstallationOctokit(repo!.installationId!);

  console.log('--- Fetching real default branch + HEAD sha ---');
  const repoInfo = await octokit.request('GET /repos/{owner}/{repo}', { owner: repo!.owner, repo: repo!.name });
  const defaultBranch = repoInfo.data.default_branch;
  const refInfo = await octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', { owner: repo!.owner, repo: repo!.name, ref: `heads/${defaultBranch}` });
  const baseSha = refInfo.data.object.sha;
  console.log(`Default branch: ${defaultBranch}, HEAD sha: ${baseSha}`);

  const branchName = `codeward-test-validation-${Date.now()}`;
  console.log(`\n--- 1. create_branch (real): ${branchName} ---`);
  const branch = await tools.create_branch.execute({ repoId: REPO_ID, branchName, fromSha: baseSha });
  console.log(JSON.stringify(branch));

  console.log('\n--- 2. create_or_update_file (real, trivial test-only file) ---');
  const file = await tools.create_or_update_file.execute({
    repoId: REPO_ID, branch: branchName, filePath: 'CODEWARD_TEST.md',
    content: '# Codeward Agent Validation\n\nThis file was committed by an automated validation run to prove real GitHub write access (branch + commit + PR). Safe to close the PR without merging and delete this branch.\n',
    commitMessage: '[Codeward Test] validate real commit access'
  });
  console.log(JSON.stringify(file));

  console.log('\n--- 3. create_pull_request (real) ---');
  const pr = await tools.create_pull_request.execute({
    repoId: REPO_ID, title: '[Codeward Test] Agent validation — do not merge, safe to close',
    body: 'Automated validation of the Codeward Guardian agent\'s real GitHub PR-flow tools. This PR is throwaway — close it and delete the branch whenever convenient.',
    head: branchName, base: defaultBranch, draft: true
  });
  console.log(JSON.stringify(pr));
  if (!pr.pullRequestNumber) { console.log('ABORT: PR creation failed'); return; }

  console.log('\n--- 4. get_pull_request (real read-back of what we just created) ---');
  const prData = await tools.get_pull_request.execute({ repoId: REPO_ID, pullRequestNumber: pr.pullRequestNumber });
  console.log(JSON.stringify(prData));

  console.log('\n--- 5. submit_pr_review (real, COMMENT event, non-blocking) ---');
  const review = await tools.submit_pr_review.execute({
    repoId: REPO_ID, pullRequestNumber: pr.pullRequestNumber, event: 'COMMENT',
    body: 'Codeward validation: this review confirms real PR-review write access.', comments: []
  });
  console.log(JSON.stringify(review));

  console.log('\n--- 6. add_pull_request_review_comment (real inline comment on the actual diff line) ---');
  const inline = await tools.add_pull_request_review_comment.execute({
    repoId: REPO_ID, pullRequestNumber: pr.pullRequestNumber, commitId: prData.head.sha,
    path: 'CODEWARD_TEST.md', line: 1, body: 'Codeward validation: real inline diff comment.'
  });
  console.log(JSON.stringify(inline));

  console.log('\n=== Result summary ===');
  console.log(`Real PR created: #${pr.pullRequestNumber} — ${pr.htmlUrl}`);
  console.log('Left OPEN and UNMERGED for your review — close/delete branch at your convenience, or tell me to merge it.');
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
