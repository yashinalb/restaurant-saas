/**
 * Realtime client for the admin panel (44.16).
 * Connects to /ws/realtime, auto-reconnects with backoff, dispatches events to listeners.
 */

type Listener = (event: RealtimeEvent) => void;

export interface RealtimeEvent {
  event: string;
  tenant_id?: number;
  store_id?: number | null;
  order_id?: number | null;
  destination_id?: number | null;
  payload?: any;
  ts?: number;
  [k: string]: any;
}

export interface SubscribeOptions {
  all?: boolean;
  store_ids?: number[];
  destination_ids?: number[];
  order_ids?: number[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3006';

function toWsUrl(base: string): string {
  return base.replace(/^http/, 'ws').replace(/\/$/, '');
}

class RealtimeClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private desiredSubscription: SubscribeOptions = { all: true };
  private reconnectAttempts = 0;
  private manualClose = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  connect(): void {
    this.manualClose = false;
    const token = localStorage.getItem('accessToken');
    const tenantId = localStorage.getItem('selectedTenantId');
    if (!token || !tenantId) return;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const url = `${toWsUrl(API_BASE_URL)}/ws/realtime?token=${encodeURIComponent(token)}&tenant_id=${encodeURIComponent(tenantId)}`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.addEventListener('open', () => {
      this.reconnectAttempts = 0;
      this.send({ type: 'subscribe', ...this.desiredSubscription });
      this.heartbeat = setInterval(() => this.send({ type: 'ping' }), 25000);
    });

    ws.addEventListener('message', (ev) => {
      try {
        const msg: RealtimeEvent = JSON.parse(ev.data);
        this.listeners.forEach(l => {
          try { l(msg); } catch (err) { console.error('[realtime] listener error:', err); }
        });
      } catch (err) {
        console.error('[realtime] bad message:', err);
      }
    });

    ws.addEventListener('close', () => {
      this.clearHeartbeat();
      this.ws = null;
      if (!this.manualClose) this.scheduleReconnect();
    });

    ws.addEventListener('error', () => {
      // close handler will fire next and trigger reconnect
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private clearHeartbeat(): void {
    if (this.heartbeat) { clearInterval(this.heartbeat); this.heartbeat = null; }
  }

  private send(obj: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  subscribe(opts: SubscribeOptions): void {
    this.desiredSubscription = { ...this.desiredSubscription, ...opts };
    this.send({ type: 'subscribe', ...opts });
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  disconnect(): void {
    this.manualClose = true;
    this.clearHeartbeat();
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.ws) { try { this.ws.close(); } catch {} }
    this.ws = null;
  }
}

export const realtimeClient = new RealtimeClient();
