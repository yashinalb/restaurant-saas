import apiClient from './api';

export interface MenuCategoryTranslation {
  language_id: number;
  name: string;
  description?: string;
  language_code?: string;
  language_name?: string;
}

export interface MenuCategory {
  id: number;
  code: string;
  parent_id: number | null;
  icon_url: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: MenuCategoryTranslation[];
}

const menuCategoryService = {
  async getAll(): Promise<MenuCategory[]> {
    const response = await apiClient.get('/api/admin/menu-categories');
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<MenuCategory> {
    const response = await apiClient.get(`/api/admin/menu-categories/${id}`);
    return response.data.data || response.data;
  },
  async create(data: { code: string; parent_id?: number | null; icon_url?: string; image_url?: string; sort_order?: number; is_active?: boolean; translations?: MenuCategoryTranslation[] }): Promise<MenuCategory> {
    const response = await apiClient.post('/api/admin/menu-categories', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: { code?: string; parent_id?: number | null; icon_url?: string; image_url?: string; sort_order?: number; is_active?: boolean; translations?: MenuCategoryTranslation[] }): Promise<MenuCategory> {
    const response = await apiClient.put(`/api/admin/menu-categories/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/admin/menu-categories/${id}`);
  },
};

export default menuCategoryService;
