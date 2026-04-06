import api from './api';

export interface TenantSeatingAreaTranslation {
  language_id: number;
  name: string;
  language_code?: string;
  language_name?: string;
}

export interface TenantSeatingArea {
  id: number;
  store_id: number;
  store_name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: TenantSeatingAreaTranslation[];
}

const tenantSeatingAreaService = {
  async getAll(filters?: Record<string, any>): Promise<TenantSeatingArea[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const response = await api.get(`/api/tenant/seating-areas?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<TenantSeatingArea> {
    const response = await api.get(`/api/tenant/seating-areas/${id}`);
    return response.data.data || response.data;
  },
  async create(data: Partial<TenantSeatingArea>): Promise<TenantSeatingArea> {
    const response = await api.post('/api/tenant/seating-areas', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<TenantSeatingArea>): Promise<TenantSeatingArea> {
    const response = await api.put(`/api/tenant/seating-areas/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/seating-areas/${id}`);
  },
};

export default tenantSeatingAreaService;
