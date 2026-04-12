import api from './api';

export interface TenantCustomer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  password_hash: string | null;
  is_registered: boolean;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  postal_code: string | null;
  country_code: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const tenantCustomerService = {
  async getAll(filters?: Record<string, any>): Promise<TenantCustomer[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const response = await api.get(`/api/tenant/customers?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<TenantCustomer> {
    const response = await api.get(`/api/tenant/customers/${id}`);
    return response.data.data || response.data;
  },
  async create(data: Partial<TenantCustomer>): Promise<TenantCustomer> {
    const response = await api.post('/api/tenant/customers', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<TenantCustomer>): Promise<TenantCustomer> {
    const response = await api.put(`/api/tenant/customers/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/customers/${id}`);
  },
};

export default tenantCustomerService;
