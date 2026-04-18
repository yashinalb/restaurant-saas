import api from './api';

export interface PosWaiterSession {
  id: number;
  tenant_waiter_id: number;
  store_id: number;
  device_identifier: string | null;
  ip_address: string | null;
  logged_in_at: string;
  logged_out_at: string | null;
  // Joined
  waiter_name?: string;
  waiter_image_url?: string | null;
  store_name?: string;
}

const DEVICE_KEY = 'pos_device_identifier';

export function getDeviceIdentifier(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = (crypto.randomUUID?.() || `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

const posSessionService = {
  async login(data: { pin: string; store_id: number }): Promise<PosWaiterSession> {
    const response = await api.post('/api/tenant/pos/login', {
      ...data,
      device_identifier: getDeviceIdentifier(),
    });
    return response.data.data || response.data;
  },
  async logout(sessionId: number): Promise<void> {
    await api.post(`/api/tenant/pos/session/${sessionId}/logout`);
  },
  async getActiveSession(): Promise<PosWaiterSession | null> {
    const response = await api.get('/api/tenant/pos/session', {
      params: { device_identifier: getDeviceIdentifier() },
    });
    return response.data.data || null;
  },
};

export default posSessionService;
