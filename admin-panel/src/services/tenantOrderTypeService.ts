import api from './api';

export interface TenantOrderTypeTranslation {
  language_id: number;
  name: string;
  language_code?: string;
  language_name?: string;
}

export interface TenantOrderType {
  id: number;
  code: string;
  master_order_type_id: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: TenantOrderTypeTranslation[];
}

export interface MasterOrderTypeForImport {
  id: number;
  code: string;
  icon: string | null;
  is_imported: boolean;
  translations: Array<{ language_code: string; name: string }>;
}

const tenantOrderTypeService = {
  async getAll(filters?: Record<string, any>): Promise<TenantOrderType[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const response = await api.get(`/api/tenant/order-types?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<TenantOrderType> {
    const response = await api.get(`/api/tenant/order-types/${id}`);
    return response.data.data || response.data;
  },
  async create(data: Partial<TenantOrderType>): Promise<TenantOrderType> {
    const response = await api.post('/api/tenant/order-types', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<TenantOrderType>): Promise<TenantOrderType> {
    const response = await api.put(`/api/tenant/order-types/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/order-types/${id}`);
  },
  async getAvailableMaster(): Promise<MasterOrderTypeForImport[]> {
    const response = await api.get('/api/tenant/order-types/master/available');
    return response.data.data || response.data;
  },
  async importFromMaster(masterIds: number[]): Promise<{ imported_count: number; imported_ids: number[] }> {
    const response = await api.post('/api/tenant/order-types/import', { master_ids: masterIds });
    return response.data.data || response.data;
  },
};

export default tenantOrderTypeService;
