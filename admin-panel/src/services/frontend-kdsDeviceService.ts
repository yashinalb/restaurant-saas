import api from './api';

export interface KdsDeviceListRow {
  id: number;
  tenant_id: number;
  store_id: number;
  tenant_order_destination_id: number;
  name: string | null;
  pairing_code: string | null;
  pairing_code_expires_at: string | null;
  paired_at: string | null;
  last_seen_at: string | null;
  is_active: number;
  created_at: string;
  store_name: string | null;
  destination_name: string | null;
}

export interface CreatedPairingCode {
  device_id: number;
  pairing_code: string;
  expires_at: string;
}

export interface KdsDeviceContext {
  device_id: number;
  tenant_id: number;
  store_id: number;
  store_name: string | null;
  destination_id: number;
  destination_code: string | null;
  destination_name: string | null;
  name: string | null;
  warn_after_minutes: number;
  late_after_minutes: number;
  recall_window_seconds: number;
}

const kdsDeviceService = {
  async list(store_id?: number): Promise<KdsDeviceListRow[]> {
    const response = await api.get('/api/tenant/kds-devices', {
      params: store_id ? { store_id } : {},
    });
    return response.data.data || [];
  },
  async createPairingCode(payload: {
    store_id: number;
    tenant_order_destination_id: number;
    name?: string | null;
  }): Promise<CreatedPairingCode> {
    const response = await api.post('/api/tenant/kds-devices/pairing-code', payload);
    return response.data.data;
  },
  async revoke(deviceId: number): Promise<void> {
    await api.delete(`/api/tenant/kds-devices/${deviceId}`);
  },
};

export default kdsDeviceService;

// --- Runtime (device-authed, used by the /kds app) ---

const KDS_TOKEN_KEY = 'kdsDeviceToken';

function deviceAuthHeaders(token: string): Record<string, string> {
  return { 'X-KDS-Device-Token': token };
}

export interface KdsDisplayItem {
  kds_id: number;
  order_item_id: number;
  menu_item_id: number | null;
  menu_item_name: string | null;
  quantity: number;
  status: 'pending' | 'preparing' | 'ready';
  priority: number;
  seat: number | null;
  course_code: string | null;
  course_order: number;
  notes: string | null;
  selected_addons: Array<{ name?: string; quantity?: number; price?: number }> | null;
  selected_ingredients: Array<{ name?: string; removed?: boolean }> | null;
  created_at: string;
  started_at: string | null;
  completed_at?: string | null;
}

export interface KdsDisplayTicket {
  order_id: number;
  order_number: string;
  order_type_code: string | null;
  table_name: string | null;
  guest_name: string | null;
  created_at: string;
  oldest_item_at: string;
  items: KdsDisplayItem[];
}

export const kdsRuntime = {
  getToken(): string | null {
    return localStorage.getItem(KDS_TOKEN_KEY);
  },
  setToken(token: string): void {
    localStorage.setItem(KDS_TOKEN_KEY, token);
  },
  clearToken(): void {
    localStorage.removeItem(KDS_TOKEN_KEY);
  },
  async pair(code: string): Promise<{ device_token: string; context: KdsDeviceContext }> {
    const response = await api.post('/api/public/kds/pair', { code });
    return response.data.data;
  },
  async me(token: string): Promise<KdsDeviceContext> {
    const response = await api.get('/api/kds/me', { headers: deviceAuthHeaders(token) });
    return response.data.data;
  },
  async unpair(token: string): Promise<void> {
    await api.post('/api/kds/unpair', {}, { headers: deviceAuthHeaders(token) });
  },
  async tickets(token: string, language?: string): Promise<KdsDisplayTicket[]> {
    const response = await api.get('/api/kds/tickets', {
      headers: deviceAuthHeaders(token),
      params: language ? { language } : {},
    });
    return response.data.data || [];
  },
  async bump(token: string, orderItemId: number): Promise<void> {
    await api.post(`/api/kds/items/${orderItemId}/bump`, {}, { headers: deviceAuthHeaders(token) });
  },
  async recall(token: string, orderItemId: number): Promise<void> {
    await api.post(`/api/kds/items/${orderItemId}/recall`, {}, { headers: deviceAuthHeaders(token) });
  },
  async bumpAll(token: string, orderId: number): Promise<void> {
    await api.post(`/api/kds/orders/${orderId}/bump-all`, {}, { headers: deviceAuthHeaders(token) });
  },
};
