import { Hono } from 'hono';
import { auth } from '../auth/index.js';
import { db } from '../db/index.js';
import { repositories, organizationMember } from '../db/schema.js';
import { eq, or, inArray } from 'drizzle-orm';
import { createRedisConnection } from '../lib/redis.js';

export const wsRouter = new Hono();

/**
 * Cross-task fan-out channel.
 *
 * A WebSocket lives on exactly one process, so `activeClients` is necessarily local. Behind an
 * ALB with more than one ECS task that made `broadcast()` reach only the clients attached to the
 * task that emitted it — and it failed silently, because a dropped event is indistinguishable
 * from an idle run. Events are now published to Redis and every task delivers to its own
 * sockets, so the agent worker (a separate service that owns no sockets at all) can still reach
 * every connected user.
 *
 * Tenant filtering is unchanged and still applied per-socket at delivery time.
 */
const WS_EVENT_CHANNEL = 'codeward:ws:events';

let publisher: any = null;
let subscriber: any = null;

/** Lazily created so processes that never broadcast (and tests) open no connection. */
function getPublisher(): any {
  if (publisher) return publisher;
  try {
    publisher = createRedisConnection();
  } catch (err) {
    console.warn('[WebSocket] Redis publisher unavailable — falling back to local-only delivery:', (err as Error).message);
    publisher = null;
  }
  return publisher;
}

/**
 * Subscribes this process to the fan-out channel. Called when the first socket connects, so a
 * worker process — which publishes but holds no sockets — never opens a subscriber.
 * An ioredis connection in subscriber mode cannot issue normal commands, hence the second client.
 */
export function ensureWsSubscriber(): void {
  if (subscriber) return;
  try {
    subscriber = createRedisConnection();
    subscriber.subscribe(WS_EVENT_CHANNEL, (err: Error | null) => {
      if (err) console.error('[WebSocket] Failed to subscribe to fan-out channel:', err.message);
      else console.log(`[WebSocket] Subscribed to "${WS_EVENT_CHANNEL}" for cross-task fan-out.`);
    });
    subscriber.on('message', (channel: string, raw: string) => {
      if (channel !== WS_EVENT_CHANNEL) return;
      try {
        const { type, payload } = JSON.parse(raw);
        deliverLocally(type, payload);
      } catch (err) {
        console.error('[WebSocket] Malformed fan-out message dropped:', (err as Error).message);
      }
    });
  } catch (err) {
    console.warn('[WebSocket] Redis subscriber unavailable — this task will only receive locally published events:', (err as Error).message);
    subscriber = null;
  }
}

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

        // This task now holds a socket, so it must receive the cross-task fan-out.
        ensureWsSubscriber();
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
  // Deny by default: without a scoping field there is no way to tell which tenants may see
  // this payload, so it is dropped rather than fanned out to every connected client.
  if (!payload?.userId && !payload?.repo && !payload?.repoId ) {
    console.warn(`[WebSocket] Dropped unscoped broadcast of type "${type}" — no userId, repo or repoId on the payload to scope it by.`);
    return;
  }

  // Publish for every task to deliver. Redis echoes the message back to this process's own
  // subscriber, so the publisher must NOT also deliver locally or sockets here would see it
  // twice. If Redis is unreachable we deliver locally instead, which preserves exactly the
  // single-process behaviour this function had before.
  const pub = getPublisher();
  if (!pub) {
    deliverLocally(type, payload);
    return;
  }

  pub.publish(WS_EVENT_CHANNEL, JSON.stringify({ type, payload })).catch((err: Error) => {
    console.warn(`[WebSocket] Fan-out publish failed for "${type}" — delivering locally only:`, err.message);
    deliverLocally(type, payload);
  });
};

/** Applies tenant isolation and writes to the sockets held by THIS process. */
function deliverLocally(type: string, payload: any) {
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
}
