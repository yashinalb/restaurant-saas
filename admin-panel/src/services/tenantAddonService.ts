import api from './api';

export interface TenantAddonTranslation {
  language_id: number;
  name: string;
  description?: string;
  language_code?: string;
  language_name?: string;
}

export interface TenantAddonPrice {
  id?: number;
  store_id: number | null;
  currency_id: number;
  price: number;
  is_active: boolean;
  currency_code?: string;
  currency_symbol?: string;
  store_name?: string;
}

export interface TenantAddon {
  id: number;
  tenant_addon_type_id: number;
  master_addon_id: number | null;
  addon_type_code: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: TenantAddonTranslation[];
  prices: TenantAddonPrice[];
}

export interface MasterAddonForImport {
  id: number;
  code: string;
  addon_type_code: string;
  is_imported: boolean;
  translations: Array<{ language_code: string; name: string }>;
}

const tenantAddonService = {
  async getAll(filters?: Record<string, any>): Promise<TenantAddon[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const response = await api.get(`/api/tenant/addons?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<TenantAddon> {
    const response = await api.get(`/api/tenant/addons/${id}`);
    return response.data.data || response.data;
  },
  async create(data: Partial<TenantAddon>): Promise<TenantAddon> {
    const response = await api.post('/api/tenant/addons', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<TenantAddon>): Promise<TenantAddon> {
    const response = await api.put(`/api/tenant/addons/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/addons/${id}`);
  },
  async getAvailableMaster(): Promise<MasterAddonForImport[]> {
    const response = await api.get('/api/tenant/addons/master/available');
    return response.data.data || response.data;
  },
  async importFromMaster(masterIds: number[]): Promise<{ imported_count: number; imported_ids: number[] }> {
    const response = await api.post('/api/tenant/addons/import', { master_ids: masterIds });
    return response.data.data || response.data;
  },
};

export default tenantAddonService;
