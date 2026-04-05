import apiClient from './api';

export interface AddonTypeTranslation {
  language_id: number;
  name: string;
  description?: string;
  language_code?: string;
  language_name?: string;
}

export interface AddonType {
  id: number;
  code: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: AddonTypeTranslation[];
}

const addonTypeService = {
  async getAll(): Promise<AddonType[]> {
    const response = await apiClient.get('/api/admin/addon-types');
    return response.data.data || response.data;
  },

  async getById(id: number): Promise<AddonType> {
    const response = await apiClient.get(`/api/admin/addon-types/${id}`);
    return response.data.data || response.data;
  },

  async create(data: {
    code: string;
    icon?: string;
    sort_order?: number;
    is_active?: boolean;
    translations?: AddonTypeTranslation[];
  }): Promise<AddonType> {
    const response = await apiClient.post('/api/admin/addon-types', data);
    return response.data.data || response.data;
  },

  async update(id: number, data: {
    code?: string;
    icon?: string;
    sort_order?: number;
    is_active?: boolean;
    translations?: AddonTypeTranslation[];
  }): Promise<AddonType> {
    const response = await apiClient.put(`/api/admin/addon-types/${id}`, data);
    return response.data.data || response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/admin/addon-types/${id}`);
  },
};

export default addonTypeService;
