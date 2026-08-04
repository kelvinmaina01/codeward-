import { Hono } from 'hono';

export const wsRouter = new Hono();

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
  wsRouter.get('/feed', upgradeWebSocket((c: any) => {
    return {
      onOpen(event: any, ws: any) {
        activeClients.add(ws);
        console.log('[WebSocket] Client connected to /feed');
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
 * Helper to broadcast a message to all connected clients.
 */
export const broadcast = (type: string, payload: any) => {
  const message = JSON.stringify({ type, payload });
  for (const client of activeClients) {
    try {
      client.send(message);
    } catch (e) {
      console.error('[WebSocket] Error sending message to client:', e);
    }
  }
};
