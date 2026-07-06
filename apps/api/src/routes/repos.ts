import { Hono } from 'hono';
import { auth } from '../auth/index.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, or, inArray, desc } from 'drizzle-orm';
import { triggerComprehensiveAudit } from '../agents/audit-trigger.js';

export const reposRouter = new Hono();

/**
 * Follows GitHub's real Link header across pages — a full user-journey audit found both
 * repo-listing calls below capped at a single page (per_page=100, no follow-up), silently
 * hiding any repos beyond the first 100 for an active user/org. Capped at 10 pages (1000
 * repos) as a sane real ceiling, not an artificial one.
 */
async function fetchAllPages(url: string, headers: Record<string, string>): Promise<any[]> {
  const results: any[] = [];
  let nextUrl: string | null = url;
  for (let pageNum = 0; pageNum < 10 && nextUrl !== null; pageNum++) {
    const res: Response = await fetch(nextUrl, { headers });
    if (!res.ok) break;
    const page: any = await res.json();
    const items: any[] = Array.isArray(page) ? page : (page.repositories ?? []);
    results.push(...items);
    const linkHeader: string = res.headers.get('link') ?? '';
    const nextMatch: RegExpMatchArray | null = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    nextUrl = nextMatch ? nextMatch[1] : null;
  }
  return results;
}

/**
 * GET /api/repos/connected
 * Returns the user's connected repos directly from the database (fast).
 */
reposRouter.get('/connected', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  try {
    // Get orgs the user is a member of
    const userOrgs = await db.select({ orgId: schema.organizationMember.orgId })
      .from(schema.organizationMember)
      .where(eq(schema.organizationMember.userId, session.user.id));
    
    const orgIds = userOrgs.map(o => o.orgId);
    
    let conditions = [eq(schema.repositories.userId, session.user.id)];
    if (orgIds.length > 0) {
      conditions.push(inArray(schema.repositories.orgId, orgIds));
    }

    const connectedRepos = await db.select()
      .from(schema.repositories)
      .where(or(...conditions));

    // Real health data per repo — a full user-journey audit found Repositories.tsx was
    // fabricating this with a hash of the repo name ("fake health data for the dashboard
    // demo") even though real scores exist. Attach the real latest completed run's score, or
    // fall back to the real baselineScore from the first scan if no later run exists yet.
    const reposWithHealth = await Promise.all(connectedRepos.map(async (repo) => {
      const [latestRun] = await db.select().from(schema.runs)
        .where(and(eq(schema.runs.repoId, repo.id), eq(schema.runs.status, 'completed')))
        .orderBy(desc(schema.runs.createdAt))
        .limit(1);
      return {
        ...repo,
        healthScore: latestRun?.score ?? repo.baselineScore ?? null,
        lastScanAt: latestRun?.createdAt ?? repo.auditCompletedAt ?? null,
      };
    }));

    // Also return user's organizations so the global UI can populate the workspace switcher
    const accounts = await db.select().from(schema.account).where(and(eq(schema.account.userId, session.user.id), eq(schema.account.providerId, 'github')));
    let orgs: string[] = [];
    if (accounts.length > 0 && accounts[0].accessToken) {
      try {
        const uRes = await fetch('https://api.github.com/user', { headers: { 'Authorization': `Bearer ${accounts[0].accessToken}`, 'User-Agent': 'Codeward-App' }});
        const oRes = await fetch('https://api.github.com/user/orgs', { headers: { 'Authorization': `Bearer ${accounts[0].accessToken}`, 'User-Agent': 'Codeward-App' }});
        const uData = uRes.ok ? await uRes.json() as any : null;
        const oData = oRes.ok ? await oRes.json() as any[] : [];
        if (uData?.login) {
          orgs = [uData.login, ...oData.map(o => o.login)];
        }
      } catch (e) { console.error('Failed to fetch orgs for connected repos', e); }
    }

    return c.json({ repos: reposWithHealth, orgs });
  } catch (err) {
    console.error('Error fetching connected repos:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * PATCH /api/repos/:id/pause
 * Real pause/resume — persists to repositories.paused, which the push webhook and pushWorker
 * both honor (real analysis is actually skipped while paused, not just a UI label).
 */
reposRouter.patch('/:id/pause', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const repoId = Number(c.req.param('id'));
  if (!Number.isFinite(repoId)) return c.json({ error: 'Invalid repo id' }, 400);

  const [repo] = await db.select().from(schema.repositories).where(eq(schema.repositories.id, repoId));
  if (!repo) return c.json({ error: 'Repository not found' }, 404);
  if (repo.userId !== session.user.id) {
    if (!repo.orgId) return c.json({ error: 'Forbidden' }, 403);
    const [membership] = await db.select().from(schema.organizationMember)
      .where(and(eq(schema.organizationMember.userId, session.user.id), eq(schema.organizationMember.orgId, repo.orgId)));
    if (!membership) return c.json({ error: 'Forbidden' }, 403);
  }

  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }
  const paused = !!body?.paused;

  await db.update(schema.repositories).set({ paused }).where(eq(schema.repositories.id, repoId));
  return c.json({ paused });
});

/**
 * PATCH /api/repos/:id/autofix
 * Per-repo opt-out of automated fixing. Analysis still runs; when disabled, the fixer never
 * opens an auto-fix PR for this repo (enforced in agent.queue.ts).
 */
reposRouter.patch('/:id/autofix', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const repoId = Number(c.req.param('id'));
  if (!Number.isFinite(repoId)) return c.json({ error: 'Invalid repo id' }, 400);

  const [repo] = await db.select().from(schema.repositories).where(eq(schema.repositories.id, repoId));
  if (!repo) return c.json({ error: 'Repository not found' }, 404);
  if (repo.userId !== session.user.id) {
    if (!repo.orgId) return c.json({ error: 'Forbidden' }, 403);
    const [membership] = await db.select().from(schema.organizationMember)
      .where(and(eq(schema.organizationMember.userId, session.user.id), eq(schema.organizationMember.orgId, repo.orgId)));
    if (!membership) return c.json({ error: 'Forbidden' }, 403);
  }

  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }
  const autoFixEnabled = !!body?.autoFixEnabled;

  await db.update(schema.repositories).set({ autoFixEnabled }).where(eq(schema.repositories.id, repoId));
  return c.json({ autoFixEnabled });
});


/**
 * GET /api/repos
 * Lists the authenticated user's GitHub repos using their stored OAuth token.
 */
reposRouter.get('/', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const accounts = await db.select()
    .from(schema.account)
    .where(
      and(
        eq(schema.account.userId, session.user.id),
        eq(schema.account.providerId, 'github')
      )
    );

  const githubAccount = accounts[0];
  if (!githubAccount?.accessToken) {
    return c.json({ error: 'No GitHub account linked' }, 400);
  }

  try {
    // 1. Fetch user's profile
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${githubAccount.accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Codeward-App',
      },
    });
    const ghUser = userResponse.ok ? await userResponse.json() as any : null;
    const personalLogin = ghUser?.login || 'personal';

    // 2. Fetch user's org memberships to get roles
    const orgsResponse = await fetch('https://api.github.com/user/memberships/orgs', {
      headers: {
        'Authorization': `Bearer ${githubAccount.accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Codeward-App',
      },
    });

    const ghOrgs = orgsResponse.ok ? (await orgsResponse.json() as any[]) : [];
    const orgRoles: Record<string, { role: string; id: number }> = { 
      [personalLogin]: { role: 'admin', id: ghUser?.id || 0 } 
    };
    
    for (const membership of ghOrgs) {
      if (membership.state === 'active') {
        orgRoles[membership.organization.login] = {
          role: membership.role,
          id: membership.organization.id
        };
      }
    }
    
    // 2.5 Fetch user's GitHub App installations
    const installationsResponse = await fetch('https://api.github.com/user/installations', {
      headers: {
        'Authorization': `Bearer ${githubAccount.accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Codeward-App',
      },
    });

    const installationsData = installationsResponse.ok ? (await installationsResponse.json() as any) : { installations: [] };
    const installedAccountLogins = new Set<string>();
    const grantedRepoIds = new Set<number>();
    
    for (const inst of installationsData.installations || []) {
      if (inst.account && inst.account.login) {
        installedAccountLogins.add(inst.account.login);
        
        // Fetch repositories granted to this installation
        try {
          const instRepos = await fetchAllPages(`https://api.github.com/user/installations/${inst.id}/repositories?per_page=100`, {
            'Authorization': `Bearer ${githubAccount.accessToken}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'Codeward-App',
          });
          for (const repo of instRepos) {
            grantedRepoIds.add(repo.id);
          }
        } catch (e) {
          console.error(`Failed to fetch repos for installation ${inst.id}`, e);
        }
      }
    }

    // Build the enriched orgs array
    const orgs = Object.entries(orgRoles).map(([login, details]) => ({
      name: login,
      role: details.role,
      accountId: details.id,
      isInstalled: installedAccountLogins.has(login)
    }));

    // 3. Fetch repos — real pagination follows GitHub's Link header rather than trusting the
    // first 100 to be everything (a full user-journey audit found this was silently truncated).
    const reposHeaders = {
      'Authorization': `Bearer ${githubAccount.accessToken}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Codeward-App',
    };
    const firstPageCheck = await fetch('https://api.github.com/user/repos?sort=pushed&per_page=100&type=all', { headers: reposHeaders });
    if (!firstPageCheck.ok) {
      const errText = await firstPageCheck.text();
      return c.json({ error: 'Failed to fetch repos from GitHub', details: errText }, firstPageCheck.status as any);
    }
    const ghRepos = await fetchAllPages('https://api.github.com/user/repos?sort=pushed&per_page=100&type=all', reposHeaders);

    // 4. Check connected repos
    // We check against all repos visible to the user across their orgs
    const userOrgs = await db.select({ orgId: schema.organizationMember.orgId })
      .from(schema.organizationMember)
      .where(eq(schema.organizationMember.userId, session.user.id));
    const orgIds = userOrgs.map(o => o.orgId);
    
    let conditions = [eq(schema.repositories.userId, session.user.id)];
    if (orgIds.length > 0) {
      conditions.push(inArray(schema.repositories.orgId, orgIds));
    }

    const connectedRepos = await db.select()
      .from(schema.repositories)
      .where(or(...conditions));
      
    const connectedReposMap = new Map(connectedRepos.map(r => [r.fullName, r.status]));

    // 5. Map to our API shape
    const repos = ghRepos.map((r: any) => ({
      name: r.name,
      full: r.full_name,
      desc: r.description || '',
      lang: r.language || 'Unknown',
      stars: r.stargazers_count,
      forks: r.forks_count,
      issues: r.open_issues_count,
      size: r.size,
      topics: r.topics || [],
      defaultBranch: r.default_branch,
      archived: r.archived,
      isFork: r.fork,
      private: r.private,
      pushed: r.pushed_at,
      owner: r.owner.login,
      connected: connectedReposMap.has(r.full_name),
      auditStatus: connectedReposMap.get(r.full_name) || 'unconnected',
      grantedToApp: grantedRepoIds.has(r.id), // True if the GitHub App has explicit access
    }));

    return c.json({ repos, orgs, orgRoles });
  } catch (err) {
    console.error('Error fetching GitHub repos:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /api/repos/connect
 * Saves the user's selected repos to the repositories table, enforcing admin checks.
 */
reposRouter.post('/connect', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json() as { 
    repos: Array<{ 
      full: string; 
      name: string; 
      owner: string; 
      desc: string; 
      lang: string; 
      isPrivate: boolean;
      defaultBranch?: string;
      config?: any;
    }> 
  };
  
  if (!body.repos || !Array.isArray(body.repos) || body.repos.length === 0) {
    return c.json({ error: 'No repos provided' }, 400);
  }

  if (body.repos.length > 2) {
    return c.json({ error: 'Free tier allows a maximum of 2 repositories' }, 400);
  }

  const accounts = await db.select()
    .from(schema.account)
    .where(
      and(
        eq(schema.account.userId, session.user.id),
        eq(schema.account.providerId, 'github')
      )
    );

  const githubAccount = accounts[0];
  if (!githubAccount?.accessToken) {
    return c.json({ error: 'No GitHub account linked' }, 400);
  }

  // 1. Fetch personal login to distinguish from orgs
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${githubAccount.accessToken}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Codeward-App',
    },
  });
  const ghUser = userResponse.ok ? await userResponse.json() as any : null;
  const personalLogin = ghUser?.login || 'personal';

  // 1.5 Fetch installations so we can get the installationId for each repo
  const instResponse = await fetch('https://api.github.com/user/installations', {
    headers: {
      'Authorization': `Bearer ${githubAccount.accessToken}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Codeward-App',
    },
  });
  const instData = instResponse.ok ? await instResponse.json() as any : { installations: [] };
  const ownerToInstallationId: Record<string, number> = {};
  for (const inst of instData.installations || []) {
    if (inst.account && inst.account.login) {
      ownerToInstallationId[inst.account.login] = inst.id;
    }
  }

  const connected: string[] = [];

  for (const repo of body.repos) {
    let finalOrgId: number | null = null;

    try {
      // 2. Org check
      if (repo.owner !== personalLogin) {
        // Ping github for membership role in this org
        const membershipRes = await fetch(`https://api.github.com/user/memberships/orgs/${repo.owner}`, {
          headers: {
            'Authorization': `Bearer ${githubAccount.accessToken}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'Codeward-App',
          },
        });
        
        if (membershipRes.ok) {
          const membership = await membershipRes.json() as any;
          if (membership.role !== 'admin') {
            return c.json({ error: `You must be an organization admin to connect repositories for ${repo.owner}.` }, 403);
          }
        } else {
          return c.json({ error: `Could not verify admin status for ${repo.owner}.` }, 403);
        }

        // 3. Upsert Organization
        const existingOrg = await db.select().from(schema.organization).where(eq(schema.organization.githubLogin, repo.owner));
        let orgRecord = existingOrg[0];

        if (!orgRecord) {
          const insertedOrg = await db.insert(schema.organization)
            .values({ githubLogin: repo.owner })
            .returning();
          orgRecord = insertedOrg[0];
        }
        finalOrgId = orgRecord.id;

        // 4. Upsert OrganizationMember
        const existingMember = await db.select().from(schema.organizationMember)
          .where(and(
            eq(schema.organizationMember.orgId, finalOrgId),
            eq(schema.organizationMember.userId, session.user.id)
          ));
        
        if (existingMember.length === 0) {
          await db.insert(schema.organizationMember)
            .values({
              orgId: finalOrgId,
              userId: session.user.id,
              role: 'admin'
            });
        }
      }

      // 5. Connect the repo
      const repoInstallationId = ownerToInstallationId[repo.owner] || 0;

      const inserted = await db.insert(schema.repositories).values({
        userId: session.user.id,
        orgId: finalOrgId,
        fullName: repo.full,
        owner: repo.owner,
        name: repo.name,
        description: repo.desc || null,
        language: repo.lang || null,
        isPrivate: repo.isPrivate,
        installationId: repoInstallationId,
        status: 'pending_audit',
        auditTriggeredAt: new Date(),
        config: repo.config || {
          agents: { security: true, bloat: true, broken_code: true, architecture: true, ai_era: true, compliance: true, data_dx: true },
          alerts: { slack: true, email: true, whatsapp: false, calendar: false }
        }
      }).onConflictDoNothing().returning();
      connected.push(repo.full);

      // 6. Trigger the REAL comprehensive audit — a full user-journey audit found the previous
      // 'baseline-audit' job here was silently broken (wrong payload shape for the real
      // worker), so no repo connected through this endpoint ever got a real first scan.
      let repoRow = inserted[0];
      if (!repoRow) {
        // onConflictDoNothing means this repo already existed — look it up so we still have a
        // real id to trigger against (e.g. reconnecting, or a race with the install webhook).
        [repoRow] = await db.select().from(schema.repositories).where(eq(schema.repositories.fullName, repo.full));
      }
      if (repoRow) {
        try {
          await triggerComprehensiveAudit(repoRow.id, repo.full);
        } catch (auditErr) {
          console.error(`Failed to trigger comprehensive audit for ${repo.full}:`, auditErr);
        }
      } else {
        console.error(`Could not resolve a real repositories row for ${repo.full} — audit not triggered.`);
      }

    } catch (err) {
      console.error(`Failed to connect repo ${repo.full}:`, err);
    }
  }

  return c.json({ connected });
});
