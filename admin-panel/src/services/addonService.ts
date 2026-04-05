import apiClient from './api';

export interface AddonTranslation {
  language_id: number;
  name: string;
  description?: string;
  language_code?: string;
  language_name?: string;
}

export interface Addon {
  id: number;
  master_addon_type_id: number;
  addon_type_code: string;
  code: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: AddonTranslation[];
}

const addonService = {
  async getAll(filters?: { master_addon_type_id?: number }): Promise<Addon[]> {
    const params = new URLSearchParams();
    if (filters?.master_addon_type_id) params.append('master_addon_type_id', String(filters.master_addon_type_id));
    const response = await apiClient.get(`/api/admin/addons?${params.toString()}`);
    return response.data.data || response.data;
  },

  async getById(id: number): Promise<Addon> {
    const response = await apiClient.get(`/api/admin/addons/${id}`);
    return response.data.data || response.data;
  },

  async create(data: {
    master_addon_type_id: number;
    code: string;
    sort_order?: number;
    is_active?: boolean;
    translations?: AddonTranslation[];
  }): Promise<Addon> {
    const response = await apiClient.post('/api/admin/addons', data);
    return response.data.data || response.data;
  },

  async update(id: number, data: {
    master_addon_type_id?: number;
    code?: string;
    sort_order?: number;
    is_active?: boolean;
    translations?: AddonTranslation[];
  }): Promise<Addon> {
    const response = await apiClient.put(`/api/admin/addons/${id}`, data);
    return response.data.data || response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/admin/addons/${id}`);
  },
};

export default addonService;
