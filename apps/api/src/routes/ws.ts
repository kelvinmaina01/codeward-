import { Hono } from 'hono';

export const wsRouter = new Hono();

// We will store all active WebSocket connections in a Set
export const activeClients = new Set<any>();

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
