import api from './api';

export interface TenantSupplier {
  id: number;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_id: string | null;
  notes: string | null;
  is_active: boolean | number;
  created_at: string;
  updated_at: string;
}

export interface TenantSupplierInput {
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  tax_id?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

const tenantSupplierService = {
  async getAll(filters?: Record<string, any>): Promise<TenantSupplier[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.append(k, String(v));
      });
    }
    const response = await api.get(`/api/tenant/suppliers?${params.toString()}`);
    return response.data.data || response.data;
  },

  async getById(id: number): Promise<TenantSupplier> {
    const response = await api.get(`/api/tenant/suppliers/${id}`);
    return response.data.data || response.data;
  },

  async create(data: TenantSupplierInput): Promise<TenantSupplier> {
    const response = await api.post('/api/tenant/suppliers', data);
    return response.data.data || response.data;
  },

  async update(id: number, data: Partial<TenantSupplierInput>): Promise<TenantSupplier> {
    const response = await api.put(`/api/tenant/suppliers/${id}`, data);
    return response.data.data || response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/suppliers/${id}`);
  },
};

export default tenantSupplierService;
