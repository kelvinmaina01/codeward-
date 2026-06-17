import { Hono } from 'hono';
import { auth } from '../auth/index.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, or, inArray } from 'drizzle-orm';

export const reposRouter = new Hono();

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

    return c.json({ repos: connectedRepos, orgs });
  } catch (err) {
    console.error('Error fetching connected repos:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
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
    
    for (const inst of installationsData.installations || []) {
      if (inst.account && inst.account.login) {
        installedAccountLogins.add(inst.account.login);
      }
    }

    // Build the enriched orgs array
    const orgs = Object.entries(orgRoles).map(([login, details]) => ({
      name: login,
      role: details.role,
      accountId: details.id,
      isInstalled: installedAccountLogins.has(login)
    }));

    // 3. Fetch repos
    const ghResponse = await fetch('https://api.github.com/user/repos?sort=pushed&per_page=100&type=all', {
      headers: {
        'Authorization': `Bearer ${githubAccount.accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Codeward-App',
      },
    });

    if (!ghResponse.ok) {
      const errText = await ghResponse.text();
      return c.json({ error: 'Failed to fetch repos from GitHub', details: errText }, ghResponse.status as any);
    }

    const ghRepos = await ghResponse.json() as any[];

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
      await db.insert(schema.repositories).values({
        userId: session.user.id,
        orgId: finalOrgId,
        fullName: repo.full,
        owner: repo.owner,
        name: repo.name,
        description: repo.desc || null,
        language: repo.lang || null,
        isPrivate: repo.isPrivate,
        config: repo.config || {
          agents: {
            security: true,
            bloat: true,
            broken_code: true,
            architecture: true,
            ai_era: true,
            compliance: true,
            data_dx: true
          }
        }
      }).onConflictDoNothing();
      connected.push(repo.full);

      // 6. Trigger Baseline Audit via BullMQ
      try {
        const { agentQueue } = await import('../agents/queue/agent.queue.js');
        await agentQueue.add('baseline-audit', {
          owner: repo.owner,
          repo: repo.name,
          installationId: 0, // We would pull this from the DB in a real app
          pull_number: 0,
          sha: 'baseline',
          patch: '',
          branch: 'main',
          diffs: []
        });
      } catch (queueErr) {
        console.error(`Failed to trigger baseline audit for ${repo.full}:`, queueErr);
      }

    } catch (err) {
      console.error(`Failed to connect repo ${repo.full}:`, err);
    }
  }

  return c.json({ connected });
});
