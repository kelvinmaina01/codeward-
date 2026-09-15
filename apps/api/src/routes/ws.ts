import { Hono } from 'hono';
import { auth } from '../auth/index.js';
import { db } from '../db/index.js';
import { repositories, organizationMember } from '../db/schema.js';
import { eq, or, inArray } from 'drizzle-orm';

export const wsRouter = new Hono();

export interface ClientMeta {
  userId: string;
  orgIds: Set<number>;
  repoIds: Set<number>;
  repoNames: Set<string>;
}

// We will store all active WebSocket connections in a Set
export const activeClients = new Set<any>();

// For presence: Map<workspaceId, Map<WebSocket, userId>>
export const workspacePresence = new Map<string, Map<any, string>>();

const broadcastPresence = (workspaceId: string) => {
  const wsMap = workspacePresence.get(workspaceId);
  if (!wsMap) return;

  const onlineUsers = Array.from(new Set(wsMap.values()));
  const message = JSON.stringify({ type: 'presence_update', payload: onlineUsers });

  for (const client of wsMap.keys()) {
    try {
      client.send(message);
    } catch (e) {
      // ignore
    }
  }
};

export const setupWs = (upgradeWebSocket: any) => {
  wsRouter.get('/feed', upgradeWebSocket(async (c: any) => {
    let session: any = null;
    try {
      session = await auth.api.getSession({ headers: c.req.raw.headers });
    } catch (e) {
      console.warn('[WebSocket] Session lookup failed during handshake:', e);
    }

    return {
      async onOpen(event: any, ws: any) {
        // Enforce authentication on socket upgrade
        if (!session?.user) {
          console.warn('[WebSocket] Unauthenticated connection attempt to /feed rejected.');
          try {
            ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
            ws.close(4401, 'Unauthorized');
          } catch {
            // ignore
          }
          return;
        }

        const userId = session.user.id;
        try {
          // Load tenant repositories for isolation
          const userOrgs = await db.select({ orgId: organizationMember.orgId })
            .from(organizationMember)
            .where(eq(organizationMember.userId, userId));
          const orgIds = userOrgs.map((o) => o.orgId);

          const accessConditions = [eq(repositories.userId, userId)];
          if (orgIds.length > 0) accessConditions.push(inArray(repositories.orgId, orgIds));

          const accessibleRepos = await db.select({ id: repositories.id, fullName: repositories.fullName })
            .from(repositories)
            .where(or(...accessConditions));

          ws.clientMeta = {
            userId,
            orgIds: new Set(orgIds),
            repoIds: new Set(accessibleRepos.map((r) => r.id)),
            repoNames: new Set(accessibleRepos.map((r) => r.fullName.toLowerCase())),
          } as ClientMeta;
        } catch (dbErr) {
          console.error('[WebSocket] Error loading tenant metadata for client:', dbErr);
          ws.clientMeta = {
            userId,
            orgIds: new Set(),
            repoIds: new Set(),
            repoNames: new Set(),
          };
        }

        activeClients.add(ws);
        console.log(`[WebSocket] Authenticated client connected to /feed (User: ${userId})`);
      },
      onClose(event: any, ws: any) {
        activeClients.delete(ws);
        console.log('[WebSocket] Client disconnected from /feed');
      }
    };
  }));

  wsRouter.get('/presence', upgradeWebSocket((c: any) => {
    return {
      onMessage(event: any, ws: any) {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'join' && data.workspaceId && data.userId) {
            const { workspaceId, userId } = data;

            // Store connection
            if (!workspacePresence.has(workspaceId)) {
              workspacePresence.set(workspaceId, new Map());
            }
            workspacePresence.get(workspaceId)!.set(ws, userId);

            // Store workspaceId on the websocket instance so we know what to remove on close
            ws.workspaceId = workspaceId;
            ws.userId = userId;

            console.log(`[WebSocket] User ${userId} joined presence for workspace ${workspaceId}`);

            // Broadcast update
            broadcastPresence(workspaceId);
          }
        } catch (err) {
          console.error('[WebSocket] Presence error:', err);
        }
      },
      onClose(event: any, ws: any) {
        if (ws.workspaceId) {
          const wsMap = workspacePresence.get(ws.workspaceId);
          if (wsMap) {
            wsMap.delete(ws);
            if (wsMap.size === 0) {
              workspacePresence.delete(ws.workspaceId);
            } else {
              broadcastPresence(ws.workspaceId);
            }
          }
          console.log(`[WebSocket] User ${ws.userId} left presence for workspace ${ws.workspaceId}`);
        }
      }
    };
  }));
};

/**
 * Helper to broadcast a message to connected clients, filtered by tenant isolation rules.
 */
export const broadcast = (type: string, payload: any) => {
  const message = JSON.stringify({ type, payload });
  for (const client of activeClients) {
    // Check tenant isolation: If payload target is specific to a repo or user, only broadcast to authorized clients
    if (client.clientMeta) {
      const { repoNames, repoIds, userId } = client.clientMeta as ClientMeta;

      // Filter by user ID if payload is user-scoped
      if (payload.userId && payload.userId !== userId) {
        continue;
      }

      // Filter by repo fullName if payload has repo
      if (payload.repo && !repoNames.has(String(payload.repo).toLowerCase())) {
        continue;
      }

      // Filter by repoId if payload has repoId
      if (payload.repoId && !repoIds.has(Number(payload.repoId))) {
        continue;
      }
    }

    try {
      client.send(message);
    } catch (e) {
      console.error('[WebSocket] Error sending message to client:', e);
    }
  }
};
