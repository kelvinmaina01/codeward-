import dotenv from 'dotenv';
import { z } from 'zod';
import type { SandboxHandle } from '../src/agents/core/provider.js';
import { createGuardianTools, setGuardianOctokitResolverForTests } from '../src/agents/definitions/guardian/guardian.tools.js';
import { renderGuardianFinalReview } from '../src/agents/guardian/github-renderer.js';
import { reviewFixPR } from '../src/agents/guardian/review.service.js';
import { getInstallationClient } from '../src/github/client.js';

dotenv.config();

const Config = z.object({
  CONFIRM_REAL_GITHUB_WRITE: z.literal('true'),
  GUARDIAN_REAL_INSTALLATION_ID: z.coerce.number().default(139654039),
  GUARDIAN_REAL_REPO_FULL: z.string().default('kelvinmaina01/codeward-'),
  GUARDIAN_REAL_REPO_ID: z.string().default('direct:kelvinmaina01/codeward-'),
});

const parsed = Config.safeParse(process.env);
if (!parsed.success) {
  console.error('Refusing to write to GitHub. Set CONFIRM_REAL_GITHUB_WRITE=true to run this real PR-open harness.');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

process.env.USE_AGENTROUTER_DIRECTLY = 'true';

const dummySandbox: SandboxHandle = {
  exec: async () => ({ exitCode: 0, stdout: '', stderr: '' }),
  destroy: async () => {},
};

async function main() {
  const cfg = parsed.data;
  const [owner, repo] = cfg.GUARDIAN_REAL_REPO_FULL.split('/');
  if (!owner || !repo) throw new Error(`Invalid GUARDIAN_REAL_REPO_FULL: ${cfg.GUARDIAN_REAL_REPO_FULL}`);

  const octokit = await getInstallationClient(cfg.GUARDIAN_REAL_INSTALLATION_ID);
  setGuardianOctokitResolverForTests(async (repoId) => {
    if (repoId !== cfg.GUARDIAN_REAL_REPO_ID) {
      return { error: `Unexpected repoId ${repoId}; expected ${cfg.GUARDIAN_REAL_REPO_ID}` };
    }
    return { octokit, owner, repo };
  });

  try {
    const tools: any = createGuardianTools(dummySandbox);
    const head = await tools.get_repo_head.execute({ repoId: cfg.GUARDIAN_REAL_REPO_ID });
    if ('error' in head) throw new Error(head.error);

    const runId = Date.now();
    const branchName = `codeward/guardian-harness-proof-${runId}`;
    const filePath = 'CODEWARD_GUARDIAN_HARNESS_PROOF.md';
    const content = [
      '# Codeward Guardian Harness Proof',
      '',
      `Run: ${runId}`,
      `Repository: ${cfg.GUARDIAN_REAL_REPO_FULL}`,
      '',
      'This file was created by the guarded Guardian production harness.',
      'It proves the GitHub App can create a branch, commit a file, open a pull request, and run Guardian review flow through AgentRouter.',
      '',
      'Safe to close without merging after validation.',
    ].join('\n');

    await tools.create_branch.execute({ repoId: cfg.GUARDIAN_REAL_REPO_ID, branchName, fromSha: head.headSha });
    await tools.create_or_update_file.execute({
      repoId: cfg.GUARDIAN_REAL_REPO_ID,
      branch: branchName,
      filePath,
      content,
      commitMessage: `[Codeward] Guardian harness proof ${runId}`,
    });

    const body = renderGuardianFinalReview({
      repoFullName: cfg.GUARDIAN_REAL_REPO_FULL,
      runId,
      commitSha: head.headSha,
      gateDecision: 'COMMENT',
      summary: 'Guardian opened this proof PR through the real GitHub App path. No mock GitHub calls were used.',
      findings: [{
        agentId: 'guardian_harness',
        severity: 'INFO',
        title: 'Real PR-open capability verified',
        file: filePath,
        fixStatus: 'pr_opened',
      }],
      checks: [
        { name: 'GitHub App auth', status: 'passed', summary: `Installation ${cfg.GUARDIAN_REAL_INSTALLATION_ID} accessed ${cfg.GUARDIAN_REAL_REPO_FULL}` },
        { name: 'Branch create', status: 'passed', summary: branchName },
        { name: 'File commit', status: 'passed', summary: filePath },
      ],
    });

    const pr = await tools.create_pull_request.execute({
      repoId: cfg.GUARDIAN_REAL_REPO_ID,
      title: `[Codeward] Guardian harness proof run ${runId}`,
      body,
      head: branchName,
      base: head.defaultBranch,
      draft: true,
    });
    if (!pr.success) throw new Error(`create_pull_request failed: ${pr.error ?? 'unknown error'}`);

    console.log(`Opened real Guardian proof PR: ${pr.htmlUrl}`);

    const review = await reviewFixPR({
      sandbox: dummySandbox,
      repoId: cfg.GUARDIAN_REAL_REPO_ID,
      pullRequestNumber: pr.pullRequestNumber,
      runId,
      agentId: 'guardian_harness',
      appliedFixes: [{ filePath, rationale: 'Created proof artifact for production Guardian harness validation' }],
    });

    if (!review.reviewed) {
      console.error(`Guardian review did not complete: ${review.reason}`);
      process.exitCode = 1;
      return;
    }

    console.log(`Guardian reviewed proof PR: ${review.htmlUrl}`);
    console.log(`event=${review.event} formal=${review.viaFormalReview}`);
  } finally {
    setGuardianOctokitResolverForTests(null);
  }
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
