import api from './api';

export interface TenantAddonTypeTranslation {
  language_id: number;
  name: string;
  description?: string;
  language_code?: string;
  language_name?: string;
}

export interface TenantAddonType {
  id: number;
  code: string;
  icon: string | null;
  master_addon_type_id: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: TenantAddonTypeTranslation[];
}

export interface MasterAddonTypeForImport {
  id: number;
  code: string;
  is_imported: boolean;
  translations: Array<{ language_code: string; name: string }>;
}

const tenantAddonTypeService = {
  async getAll(filters?: Record<string, any>): Promise<TenantAddonType[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const response = await api.get(`/api/tenant/addon-types?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<TenantAddonType> {
    const response = await api.get(`/api/tenant/addon-types/${id}`);
    return response.data.data || response.data;
  },
  async create(data: Partial<TenantAddonType>): Promise<TenantAddonType> {
    const response = await api.post('/api/tenant/addon-types', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<TenantAddonType>): Promise<TenantAddonType> {
    const response = await api.put(`/api/tenant/addon-types/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/addon-types/${id}`);
  },
  async getAvailableMaster(): Promise<MasterAddonTypeForImport[]> {
    const response = await api.get('/api/tenant/addon-types/master/available');
    return response.data.data || response.data;
  },
  async importFromMaster(masterIds: number[]): Promise<{ imported_count: number; imported_ids: number[] }> {
    const response = await api.post('/api/tenant/addon-types/import', { master_ids: masterIds });
    return response.data.data || response.data;
  },
};

export default tenantAddonTypeService;
