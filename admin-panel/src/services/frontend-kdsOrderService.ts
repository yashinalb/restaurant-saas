import api from './api';

export type KdsStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';

export interface KdsOrder {
  id: number;
  store_id: number;
  order_id: number;
  order_item_id: number;
  tenant_order_destination_id: number;
  status: KdsStatus;
  priority: number;
  started_at: string | null;
  completed_at: string | null;
  estimated_prep_time: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  store_name?: string;
  order_number?: string;
  item_quantity?: number | string;
  item_notes?: string | null;
  menu_item_name?: string;
  menu_item_slug?: string;
}

export interface KdsOrderInput {
  store_id: number;
  order_id: number;
  order_item_id: number;
  tenant_order_destination_id: number;
  status?: KdsStatus;
  priority?: number;
  estimated_prep_time?: number | null;
  notes?: string | null;
}

const kdsOrderService = {
  async getAll(filters?: Record<string, any>): Promise<KdsOrder[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v));
    });
    const response = await api.get(`/api/tenant/kds-orders?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<KdsOrder> {
    const response = await api.get(`/api/tenant/kds-orders/${id}`);
    return response.data.data || response.data;
  },
  async create(data: KdsOrderInput): Promise<KdsOrder> {
    const response = await api.post('/api/tenant/kds-orders', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<KdsOrderInput>): Promise<KdsOrder> {
    const response = await api.put(`/api/tenant/kds-orders/${id}`, data);
    return response.data.data || response.data;
  },
  async updateStatus(id: number, status: KdsStatus): Promise<KdsOrder> {
    const response = await api.patch(`/api/tenant/kds-orders/${id}/status`, { status });
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/kds-orders/${id}`);
  },
};

export default kdsOrderService;
