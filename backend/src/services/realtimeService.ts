import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer, IncomingMessage } from 'http';
import { URL } from 'url';
import { verifyAccessToken } from '../utils/jwt.js';
import { KdsDeviceService } from './kdsDeviceService.js';

/**
 * Realtime Order Sync (TODO 44.16)
 *
 * Lightweight WebSocket hub used to mirror order, item-status, and KDS changes
 * live across POS devices, KDS displays, and the admin/manager views.
 *
 * Channel convention (strings, joined with ":"):
 *   - tenant:{tenantId}                         — tenant-wide broadcasts
 *   - tenant:{tenantId}:store:{storeId}         — per-store (POS floor / KDS)
 *   - tenant:{tenantId}:destination:{destId}    — per-kitchen-destination (KDS)
 *   - tenant:{tenantId}:order:{orderId}         — per-order detail view
 *
 * Event envelope:
 *   { event: string, tenant_id, store_id?, order_id?, payload: any, ts }
 */

type Channel = string;

interface ClientContext {
  tenantId: number;
  adminUserId?: number | null;
  channels: Set<Channel>;
  alive: boolean;
}

export interface RealtimeEvent {
  event: string;
  tenant_id: number;
  store_id?: number | null;
  order_id?: number | null;
  destination_id?: number | null;
  payload?: any;
}

const clients = new Map<WebSocket, ClientContext>();
let wss: WebSocketServer | null = null;
let heartbeat: NodeJS.Timeout | null = null;

function tenantChannel(tenantId: number): Channel {
  return `tenant:${tenantId}`;
}
function storeChannel(tenantId: number, storeId: number): Channel {
  return `tenant:${tenantId}:store:${storeId}`;
}
function destinationChannel(tenantId: number, destId: number): Channel {
  return `tenant:${tenantId}:destination:${destId}`;
}
function orderChannel(tenantId: number, orderId: number): Channel {
  return `tenant:${tenantId}:order:${orderId}`;
}

function sendJson(ws: WebSocket, data: any): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify(data));
  } catch (err) {
    console.error('[realtime] send failed:', err);
  }
}

async function authenticate(req: IncomingMessage): Promise<
  | { tenantId: number; adminUserId?: number; forcedChannels?: string[] }
  | null
> {
  try {
    const url = new URL(req.url || '', 'http://localhost');

    // KDS device auth (45.1): device_token binds to a specific tenant + destination.
    const deviceToken = url.searchParams.get('device_token');
    if (deviceToken) {
      const ctx = await KdsDeviceService.authenticateToken(deviceToken);
      if (!ctx) return null;
      return {
        tenantId: ctx.tenant_id,
        forcedChannels: [
          `tenant:${ctx.tenant_id}`,
          `tenant:${ctx.tenant_id}:store:${ctx.store_id}`,
          `tenant:${ctx.tenant_id}:destination:${ctx.destination_id}`,
        ],
      };
    }

    const token = url.searchParams.get('token');
    const tenantId = Number(url.searchParams.get('tenant_id'));
    if (!token || !tenantId) return null;
    const payload = verifyAccessToken(token);
    return { tenantId, adminUserId: (payload as any)?.id ?? null };
  } catch {
    return null;
  }
}

function handleSubscribe(ws: WebSocket, ctx: ClientContext, msg: any): void {
  const t = ctx.tenantId;
  const add = (ch: Channel) => ctx.channels.add(ch);

  if (msg.all) {
    add(tenantChannel(t));
  }
  if (Array.isArray(msg.store_ids)) {
    for (const sid of msg.store_ids) {
      if (Number.isFinite(Number(sid))) add(storeChannel(t, Number(sid)));
    }
  }
  if (Array.isArray(msg.destination_ids)) {
    for (const did of msg.destination_ids) {
      if (Number.isFinite(Number(did))) add(destinationChannel(t, Number(did)));
    }
  }
  if (Array.isArray(msg.order_ids)) {
    for (const oid of msg.order_ids) {
      if (Number.isFinite(Number(oid))) add(orderChannel(t, Number(oid)));
    }
  }
  sendJson(ws, { event: 'subscribed', channels: Array.from(ctx.channels) });
}

function handleUnsubscribe(ctx: ClientContext, msg: any): void {
  if (Array.isArray(msg.channels)) {
    for (const ch of msg.channels) ctx.channels.delete(String(ch));
  }
  if (msg.all) ctx.channels.clear();
}

export function attachRealtime(server: HttpServer): void {
  if (wss) return;
  wss = new WebSocketServer({ server, path: '/ws/realtime' });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const auth = await authenticate(req);
    if (!auth) {
      sendJson(ws, { event: 'error', message: 'unauthorized' });
      ws.close(1008, 'unauthorized');
      return;
    }

    const initialChannels = auth.forcedChannels && auth.forcedChannels.length > 0
      ? new Set(auth.forcedChannels)
      : new Set([tenantChannel(auth.tenantId)]);
    const ctx: ClientContext = {
      tenantId: auth.tenantId,
      adminUserId: auth.adminUserId ?? null,
      channels: initialChannels,
      alive: true,
    };
    clients.set(ws, ctx);

    sendJson(ws, { event: 'connected', tenant_id: auth.tenantId, channels: Array.from(ctx.channels) });

    ws.on('pong', () => {
      const c = clients.get(ws);
      if (c) c.alive = true;
    });

    ws.on('message', (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        sendJson(ws, { event: 'error', message: 'invalid_json' });
        return;
      }
      switch (msg?.type) {
        case 'subscribe':
          handleSubscribe(ws, ctx, msg);
          break;
        case 'unsubscribe':
          handleUnsubscribe(ctx, msg);
          sendJson(ws, { event: 'unsubscribed', channels: Array.from(ctx.channels) });
          break;
        case 'ping':
          sendJson(ws, { event: 'pong', ts: Date.now() });
          break;
        default:
          sendJson(ws, { event: 'error', message: 'unknown_type' });
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', () => {
      clients.delete(ws);
      try { ws.terminate(); } catch {}
    });
  });

  // Heartbeat — drop dead sockets every 30s
  heartbeat = setInterval(() => {
    for (const [ws, ctx] of clients.entries()) {
      if (!ctx.alive) {
        clients.delete(ws);
        try { ws.terminate(); } catch {}
        continue;
      }
      ctx.alive = false;
      try { ws.ping(); } catch {}
    }
  }, 30000);

  console.log('[realtime] WebSocket server attached at /ws/realtime');
}

export function detachRealtime(): void {
  if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
  if (wss) { wss.close(); wss = null; }
  clients.clear();
}

/**
 * Broadcast an event to every client subscribed to any of the target channels.
 * Called from service-layer code after a successful DB commit.
 */
export function broadcast(event: RealtimeEvent): void {
  if (!wss) return;
  const envelope = { ...event, ts: Date.now() };

  const channels: Channel[] = [tenantChannel(event.tenant_id)];
  if (event.store_id) channels.push(storeChannel(event.tenant_id, event.store_id));
  if (event.destination_id) channels.push(destinationChannel(event.tenant_id, event.destination_id));
  if (event.order_id) channels.push(orderChannel(event.tenant_id, event.order_id));

  const payload = JSON.stringify(envelope);
  for (const [ws, ctx] of clients.entries()) {
    if (ctx.tenantId !== event.tenant_id) continue;
    if (ws.readyState !== WebSocket.OPEN) continue;
    const match = channels.some(ch => ctx.channels.has(ch));
    if (!match) continue;
    try { ws.send(payload); } catch (err) { console.error('[realtime] broadcast send failed:', err); }
  }
}

/**
 * Convenience helpers used by services to emit the canonical event shapes.
 */
export const RealtimeEvents = {
  itemStatus(tenantId: number, orderId: number, storeId: number | null, itemId: number, from: string, to: string, destId?: number | null) {
    broadcast({
      event: 'order.item.status',
      tenant_id: tenantId,
      store_id: storeId,
      order_id: orderId,
      destination_id: destId ?? null,
      payload: { order_item_id: itemId, from, to },
    });
  },
  itemsFired(tenantId: number, orderId: number, storeId: number, payload: any) {
    broadcast({
      event: 'order.items.fired',
      tenant_id: tenantId,
      store_id: storeId,
      order_id: orderId,
      payload,
    });
  },
  itemsVoided(tenantId: number, orderId: number, storeId: number, payload: any) {
    broadcast({
      event: 'order.items.voided',
      tenant_id: tenantId,
      store_id: storeId,
      order_id: orderId,
      payload,
    });
  },
  orderUpdated(tenantId: number, orderId: number, storeId: number | null, payload: any) {
    broadcast({
      event: 'order.updated',
      tenant_id: tenantId,
      store_id: storeId,
      order_id: orderId,
      payload,
    });
  },
  kdsUpserted(tenantId: number, storeId: number, destId: number, payload: any) {
    broadcast({
      event: 'kds.upserted',
      tenant_id: tenantId,
      store_id: storeId,
      destination_id: destId,
      payload,
    });
  },
};
