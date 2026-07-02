import 'dotenv/config';
import { guardianAgent } from './agents/definitions/guardian.agent.js';
import type { SandboxHandle } from './agents/core/provider.js';

const dummySandbox: SandboxHandle = { exec: async () => ({ exitCode: 0, stdout: '', stderr: '' }), destroy: async () => {} };
const REPO_ID = '12'; // kelvinmaina01/compass-project — real installation (139654039)

async function main() {
  const tools: any = guardianAgent.createTools(dummySandbox);

  console.log('--- 1. create_issue (real, clearly labeled test) ---');
  const issue = await tools.create_issue.execute({
    repoId: REPO_ID,
    title: '[Codeward Test] Agent validation — safe to close',
    body: 'This issue was created by an automated validation run of the Codeward Guardian agent to prove real GitHub write access works end-to-end. Safe to close/delete at any time.',
    labels: [],
    assignees: []
  });
  console.log(JSON.stringify(issue));
  if (!issue.issueNumber) { console.log('ABORT: issue creation failed'); return; }

  console.log('\n--- 2. add_labels_to_issue (creating a throwaway label) ---');
  const labels = await tools.add_labels_to_issue.execute({ repoId: REPO_ID, issueNumber: issue.issueNumber, labels: ['codeward-test'] });
  console.log(JSON.stringify(labels));

  console.log('\n--- 3. post_initial_status_comment (comment on the test issue) ---');
  const comment = await tools.post_initial_status_comment.execute({ repoId: REPO_ID, pullRequestNumber: issue.issueNumber, commitSha: 'abcdef1234567890', estimatedDurationSeconds: 42 });
  console.log(JSON.stringify(comment));

  console.log('\n--- 4. update_existing_comment (edit that same comment) ---');
  if (comment.commentId) {
    const updated = await tools.update_existing_comment.execute({ repoId: REPO_ID, commentId: comment.commentId, newBody: '✅ Codeward validation comment — updated successfully. This confirms edit access works.' });
    console.log(JSON.stringify(updated));
  }

  console.log('\n--- 5. list_issues (confirm the test issue is visible via real API) ---');
  const listed = await tools.list_issues.execute({ repoId: REPO_ID, state: 'open' });
  console.log(JSON.stringify(listed).slice(0, 500));

  console.log('\n--- 6. merge_pull_request refusal gate (humanApproved:false, should be REFUSED, zero side effects) ---');
  const refused = await tools.merge_pull_request.execute({ repoId: REPO_ID, pullRequestNumber: 999999, commitTitle: 'x', commitMessage: 'x', mergeMethod: 'merge', humanApproved: false });
  console.log(JSON.stringify(refused));

  console.log('\n=== Result summary ===');
  console.log(`Real issue created: #${issue.issueNumber} — ${issue.htmlUrl}`);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
