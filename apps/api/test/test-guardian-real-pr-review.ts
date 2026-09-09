import dotenv from 'dotenv';
import { z } from 'zod';
import { getInstallationClient } from '../src/github/client.js';
import type { SandboxHandle } from '../src/agents/core/provider.js';
import { reviewHumanPR } from '../src/agents/guardian/review.service.js';
import { renderGuardianStatusComment } from '../src/agents/guardian/github-renderer.js';
import { setGuardianOctokitResolverForTests } from '../src/agents/definitions/guardian/guardian.tools.js';

dotenv.config();

const Config = z.object({
  CONFIRM_REAL_GITHUB_WRITE: z.literal('true'),
  GUARDIAN_REAL_INSTALLATION_ID: z.coerce.number().default(139654039),
  GUARDIAN_REAL_REPO_FULL: z.string().default('kelvinmaina01/codeward-'),
  GUARDIAN_REAL_PR: z.coerce.number().default(3),
  GUARDIAN_REAL_REPO_ID: z.string().default('direct:kelvinmaina01/codeward-'),
});

const parsed = Config.safeParse(process.env);
if (!parsed.success) {
  console.error('Refusing to write to GitHub. Set CONFIRM_REAL_GITHUB_WRITE=true to run this real PR review harness.');
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
    const pr: any = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
      owner,
      repo,
      pull_number: cfg.GUARDIAN_REAL_PR,
    });

    const statusBody = renderGuardianStatusComment({
      repoFullName: cfg.GUARDIAN_REAL_REPO_FULL,
      commitSha: pr.data.head.sha,
      estimatedDurationSeconds: 90,
    });
    const statusComment: any = await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner,
      repo,
      issue_number: cfg.GUARDIAN_REAL_PR,
      body: statusBody,
    });
    console.log(`Posted real Guardian status comment: ${statusComment.data.html_url}`);

    const review = await reviewHumanPR({
      sandbox: dummySandbox,
      repoId: cfg.GUARDIAN_REAL_REPO_ID,
      pullRequestNumber: cfg.GUARDIAN_REAL_PR,
      runId: Date.now(),
      gateDecision: 'BLOCK',
      findings: [
        {
          agentId: 'guardian_harness',
          severity: 'HIGH',
          title: 'Sandbox checkout can still trigger Git LFS smudge after clone',
          file: 'apps/api/src/sandbox/fly-machine.ts',
          line: null,
        },
        {
          agentId: 'guardian_harness',
          severity: 'HIGH',
          title: 'Local sandbox init must fail fast when clone or checkout fails',
          file: 'apps/api/src/sandbox/local-exec.ts',
          line: null,
        },
      ],
    });

    if (!review.reviewed) {
      console.error(`Guardian did not complete a real review: ${review.reason}`);
      process.exitCode = 1;
      return;
    }

    console.log(`Posted real Guardian review: ${review.htmlUrl}`);
    console.log(`event=${review.event} formal=${review.viaFormalReview} inlineComments=${review.comments?.length ?? 0}`);
    console.log('Review body preview:');
    console.log(review.body.slice(0, 1200));
  } finally {
    setGuardianOctokitResolverForTests(null);
  }
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
