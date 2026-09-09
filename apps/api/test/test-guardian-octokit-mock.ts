import assert from 'node:assert/strict';
import { guardianAgent } from '../src/agents/definitions/guardian.agent.js';
import type { SandboxHandle } from '../src/agents/core/provider.js';
import { setGuardianOctokitResolverForTests } from '../src/agents/definitions/guardian/guardian.tools.js';

type Call = { route: string; params: any };

class MockOctokit {
  calls: Call[] = [];
  rejectOwnReview = false;

  async request(route: string, params: any = {}) {
    this.calls.push({ route, params: JSON.parse(JSON.stringify(params)) });

    if (route === 'POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews') {
      if (this.rejectOwnReview) throw new Error('Can not approve your own pull request');
      return { data: { id: 9001, html_url: 'https://github.test/acme/widget/pull/42#pullrequestreview-9001' } };
    }

    if (route === 'POST /repos/{owner}/{repo}/issues/{issue_number}/comments') {
      return { data: { id: 7001, html_url: `https://github.test/acme/widget/issues/${params.issue_number}#issuecomment-7001` } };
    }

    if (route === 'PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}') {
      return { data: { id: params.comment_id, html_url: `https://github.test/acme/widget/issues/comments/${params.comment_id}` } };
    }

    if (route === 'GET /repos/{owner}/{repo}/pulls/{pull_number}') {
      return {
        data: {
          title: 'Tighten auth flow',
          body: 'Human PR body',
          state: 'open',
          head: { sha: 'head-sha-from-github', ref: 'feature/auth' },
          base: { sha: 'base-sha', ref: 'main' },
          changed_files: 2,
        },
      };
    }

    if (route === 'POST /repos/{owner}/{repo}/pulls/{pull_number}/comments') {
      return { data: { id: 8001, html_url: 'https://github.test/acme/widget/pull/42#discussion_r8001' } };
    }

    if (route === 'POST /repos/{owner}/{repo}/issues') {
      return { data: { number: 77, html_url: 'https://github.test/acme/widget/issues/77' } };
    }

    if (route === 'POST /repos/{owner}/{repo}/issues/{issue_number}/labels') {
      return { data: [{ name: 'codeward' }] };
    }

    if (route === 'POST /repos/{owner}/{repo}/git/refs') {
      return { data: { ref: params.ref, object: { sha: params.sha } } };
    }

    if (route === 'PUT /repos/{owner}/{repo}/contents/{path}') {
      return { data: { commit: { sha: 'commit-sha-123' } } };
    }

    if (route === 'POST /repos/{owner}/{repo}/pulls') {
      return { data: { number: 42, html_url: 'https://github.test/acme/widget/pull/42' } };
    }

    if (route === 'GET /repos/{owner}/{repo}/pulls/{pull_number}/files') {
      return {
        data: [
          { filename: 'src/auth.ts', status: 'modified', additions: 3, deletions: 1, patch: '@@ -1 +1 @@' },
          { filename: 'assets/logo.png', status: 'modified', additions: 0, deletions: 0 },
        ],
      };
    }

    if (route === 'GET /repos/{owner}/{repo}/contents/{path}') {
      return {
        data: {
          type: 'file',
          size: 12,
          sha: 'file-sha-1',
          content: Buffer.from('hello world\n', 'utf8').toString('base64'),
        },
      };
    }

    if (route === 'GET /repos/{owner}/{repo}') {
      return { data: { default_branch: 'main' } };
    }

    if (route === 'GET /repos/{owner}/{repo}/git/refs/heads/{branch}') {
      return { data: { object: { sha: 'main-head-sha' } } };
    }

    if (route === 'GET /repos/{owner}/{repo}/issues') {
      return {
        data: [
          { number: 1, title: 'Open issue', labels: [{ name: 'bug' }] },
          { number: 2, title: 'PR disguised as issue', labels: [], pull_request: {} },
        ],
      };
    }

    if (route === 'PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge') {
      return { data: { merged: true, sha: 'merge-sha' } };
    }

    throw new Error(`Unhandled mock route: ${route}`);
  }
}

const dummySandbox: SandboxHandle = {
  exec: async () => ({ exitCode: 0, stdout: '', stderr: '' }),
  destroy: async () => {},
};

function installMock() {
  const octokit = new MockOctokit();
  setGuardianOctokitResolverForTests(async (repoId) => {
    assert.equal(repoId, 'repo-1');
    return { octokit, owner: 'acme', repo: 'widget' };
  });
  return octokit;
}

function lastCall(octokit: MockOctokit): Call {
  const call = octokit.calls.at(-1);
  assert.ok(call, 'expected at least one GitHub call');
  return call;
}

async function main() {
  try {
    const tools: any = guardianAgent.createTools(dummySandbox);

    {
      const octokit = installMock();
      const res = await tools.post_initial_status_comment.execute({
        repoId: 'repo-1',
        pullRequestNumber: 42,
        commitSha: 'abcdef1234567890',
        estimatedDurationSeconds: 90,
      });
      assert.deepEqual(res, {
        success: true,
        commentId: 7001,
        htmlUrl: 'https://github.test/acme/widget/issues/42#issuecomment-7001',
      });
      assert.deepEqual(lastCall(octokit), {
        route: 'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
        params: {
          owner: 'acme',
          repo: 'widget',
          issue_number: 42,
          body: '🛡️ Codeward is analyzing commit `abcdef1` — estimated 90s.',
        },
      });
    }

    {
      const octokit = installMock();
      const res = await tools.submit_pr_review.execute({
        repoId: 'repo-1',
        pullRequestNumber: 42,
        event: 'REQUEST_CHANGES',
        body: 'Blocking because the sandbox reproduced the auth bypass.',
        comments: [{ path: 'src/auth.ts', line: 37, body: 'Verified finding from security agent.' }],
      });
      assert.equal(res.success, true);
      assert.equal(res.viaFormalReview, true);
      assert.deepEqual(lastCall(octokit), {
        route: 'POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews',
        params: {
          owner: 'acme',
          repo: 'widget',
          pull_number: 42,
          event: 'REQUEST_CHANGES',
          body: 'Blocking because the sandbox reproduced the auth bypass.',
          comments: [{ path: 'src/auth.ts', line: 37, body: 'Verified finding from security agent.' }],
        },
      });
    }

    {
      const octokit = installMock();
      octokit.rejectOwnReview = true;
      const res = await tools.submit_pr_review.execute({
        repoId: 'repo-1',
        pullRequestNumber: 42,
        event: 'APPROVE',
        body: 'Auto-fix is narrow and verified.',
        comments: [],
      });
      assert.equal(res.success, true);
      assert.equal(res.viaFormalReview, false);
      assert.equal(octokit.calls[0].route, 'POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews');
      assert.deepEqual(octokit.calls[1], {
        route: 'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
        params: {
          owner: 'acme',
          repo: 'widget',
          issue_number: 42,
          body: '**Guardian assessment: APPROVE**\n\nAuto-fix is narrow and verified.\n\n_Posted as a comment, not a formal review — GitHub does not allow this bot identity to formally approve/request-changes on its own PR. A human reviewer\'s formal approval is still required to merge._',
        },
      });
    }

    {
      const octokit = installMock();
      const res = await tools.add_pull_request_review_comment.execute({
        repoId: 'repo-1',
        pullRequestNumber: 42,
        commitId: 'model-supplied-stale-sha',
        path: 'src/auth.ts',
        line: 37,
        body: 'Inline finding.',
      });
      assert.equal(res.success, true);
      assert.equal(octokit.calls[0].route, 'GET /repos/{owner}/{repo}/pulls/{pull_number}');
      assert.deepEqual(octokit.calls[1], {
        route: 'POST /repos/{owner}/{repo}/pulls/{pull_number}/comments',
        params: {
          owner: 'acme',
          repo: 'widget',
          pull_number: 42,
          commit_id: 'head-sha-from-github',
          path: 'src/auth.ts',
          line: 37,
          body: 'Inline finding.',
        },
      });
    }

    {
      const octokit = installMock();
      const issue = await tools.create_issue.execute({
        repoId: 'repo-1',
        title: '[Codeward] HIGH: Auth bypass',
        body: 'Evidence from sandbox.',
        labels: ['codeward', 'high'],
        assignees: ['maintainer'],
      });
      assert.equal(issue.issueNumber, 77);
      assert.deepEqual(lastCall(octokit), {
        route: 'POST /repos/{owner}/{repo}/issues',
        params: {
          owner: 'acme',
          repo: 'widget',
          title: '[Codeward] HIGH: Auth bypass',
          body: 'Evidence from sandbox.',
          labels: ['codeward', 'high'],
          assignees: ['maintainer'],
        },
      });
    }

    {
      const octokit = installMock();
      await tools.add_labels_to_issue.execute({ repoId: 'repo-1', issueNumber: 77, labels: ['codeward'] });
      assert.deepEqual(lastCall(octokit), {
        route: 'POST /repos/{owner}/{repo}/issues/{issue_number}/labels',
        params: { owner: 'acme', repo: 'widget', issue_number: 77, labels: ['codeward'] },
      });
    }

    {
      const octokit = installMock();
      await tools.update_existing_comment.execute({ repoId: 'repo-1', commentId: 7001, newBody: 'Updated final report.' });
      assert.deepEqual(lastCall(octokit), {
        route: 'PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}',
        params: { owner: 'acme', repo: 'widget', comment_id: 7001, body: 'Updated final report.' },
      });
    }

    {
      const octokit = installMock();
      await tools.create_branch.execute({ repoId: 'repo-1', branchName: 'codeward/auto-fix-1', fromSha: 'main-head-sha' });
      assert.deepEqual(lastCall(octokit), {
        route: 'POST /repos/{owner}/{repo}/git/refs',
        params: { owner: 'acme', repo: 'widget', ref: 'refs/heads/codeward/auto-fix-1', sha: 'main-head-sha' },
      });
    }

    {
      const octokit = installMock();
      await tools.create_or_update_file.execute({
        repoId: 'repo-1',
        branch: 'codeward/auto-fix-1',
        filePath: 'src/auth.ts',
        content: 'export const ok = true;\n',
        commitMessage: 'fix(auto): src/auth.ts',
        sha: 'file-sha-1',
      });
      assert.deepEqual(lastCall(octokit), {
        route: 'PUT /repos/{owner}/{repo}/contents/{path}',
        params: {
          owner: 'acme',
          repo: 'widget',
          path: 'src/auth.ts',
          message: 'fix(auto): src/auth.ts',
          content: Buffer.from('export const ok = true;\n', 'utf8').toString('base64'),
          branch: 'codeward/auto-fix-1',
          sha: 'file-sha-1',
        },
      });
    }

    {
      const octokit = installMock();
      await tools.create_pull_request.execute({
        repoId: 'repo-1',
        title: '[Codeward] Auto-fix',
        body: 'Verified fix body.',
        head: 'codeward/auto-fix-1',
        base: 'main',
        draft: true,
      });
      assert.deepEqual(lastCall(octokit), {
        route: 'POST /repos/{owner}/{repo}/pulls',
        params: {
          owner: 'acme',
          repo: 'widget',
          title: '[Codeward] Auto-fix',
          body: 'Verified fix body.',
          head: 'codeward/auto-fix-1',
          base: 'main',
          draft: true,
        },
      });
    }

    {
      const octokit = installMock();
      const refused = await tools.merge_pull_request.execute({
        repoId: 'repo-1',
        pullRequestNumber: 42,
        commitTitle: 'Merge',
        commitMessage: 'Merge',
        mergeMethod: 'squash',
        humanApproved: false,
      });
      assert.equal(refused.success, false);
      assert.equal(octokit.calls.length, 0, 'merge refusal must happen before any GitHub call');
    }

    {
      const octokit = installMock();
      const files = await tools.get_pull_request_files.execute({ repoId: 'repo-1', pullRequestNumber: 42 });
      assert.deepEqual(files.files, [
        { filename: 'src/auth.ts', status: 'modified', additions: 3, deletions: 1, patch: '@@ -1 +1 @@' },
        { filename: 'assets/logo.png', status: 'modified', additions: 0, deletions: 0, patch: '(no textual diff available — binary or too large)' },
      ]);
      assert.equal(lastCall(octokit).route, 'GET /repos/{owner}/{repo}/pulls/{pull_number}/files');
    }

    {
      const octokit = installMock();
      const issues = await tools.list_issues.execute({ repoId: 'repo-1', state: 'open' });
      assert.deepEqual(issues.issues, [{ number: 1, title: 'Open issue', labels: [{ name: 'bug' }] }]);
      assert.equal(lastCall(octokit).route, 'GET /repos/{owner}/{repo}/issues');
    }

    console.log('PASS: Guardian mocked Octokit harness verified PRs, issues, reviews, comments, and self-review fallback.');
  } finally {
    setGuardianOctokitResolverForTests(null);
  }
}

main().catch((e) => {
  console.error('FAIL: Guardian mocked Octokit harness failed.');
  console.error(e);
  process.exit(1);
});
