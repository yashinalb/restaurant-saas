import api from './api';

export interface TenantWaiterSession {
  id: number;
  store_id: number;
  store_name: string;
  device_identifier: string | null;
  ip_address: string | null;
  logged_in_at: string;
  logged_out_at: string | null;
}

export interface TenantWaiter {
  id: number;
  store_id: number | null;
  store_name: string | null;
  name: string;
  pin: string;
  phone_1: string | null;
  phone_2: string | null;
  address: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sessions?: TenantWaiterSession[];
}

const tenantWaiterService = {
  async getAll(filters?: Record<string, any>): Promise<TenantWaiter[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const response = await api.get(`/api/tenant/waiters?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<TenantWaiter> {
    const response = await api.get(`/api/tenant/waiters/${id}`);
    return response.data.data || response.data;
  },
  async create(data: Partial<TenantWaiter>): Promise<TenantWaiter> {
    const response = await api.post('/api/tenant/waiters', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<TenantWaiter>): Promise<TenantWaiter> {
    const response = await api.put(`/api/tenant/waiters/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/waiters/${id}`);
  },
};

export default tenantWaiterService;
