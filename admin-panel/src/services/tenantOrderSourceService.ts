import api from './api';

export interface TenantOrderSourceTranslation {
  language_id: number;
  name: string;
  language_code?: string;
  language_name?: string;
}

export interface TenantOrderSource {
  id: number;
  code: string;
  master_order_source_id: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: TenantOrderSourceTranslation[];
}

export interface MasterOrderSourceForImport {
  id: number;
  code: string;
  icon: string | null;
  is_imported: boolean;
  translations: Array<{ language_code: string; name: string }>;
}

const tenantOrderSourceService = {
  async getAll(filters?: Record<string, any>): Promise<TenantOrderSource[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const response = await api.get(`/api/tenant/order-sources?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<TenantOrderSource> {
    const response = await api.get(`/api/tenant/order-sources/${id}`);
    return response.data.data || response.data;
  },
  async create(data: Partial<TenantOrderSource>): Promise<TenantOrderSource> {
    const response = await api.post('/api/tenant/order-sources', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<TenantOrderSource>): Promise<TenantOrderSource> {
    const response = await api.put(`/api/tenant/order-sources/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/order-sources/${id}`);
  },
  async getAvailableMaster(): Promise<MasterOrderSourceForImport[]> {
    const response = await api.get('/api/tenant/order-sources/master/available');
    return response.data.data || response.data;
  },
  async importFromMaster(masterIds: number[]): Promise<{ imported_count: number; imported_ids: number[] }> {
    const response = await api.post('/api/tenant/order-sources/import', { master_ids: masterIds });
    return response.data.data || response.data;
  },
};

export default tenantOrderSourceService;
