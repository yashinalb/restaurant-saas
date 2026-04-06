import api from './api';

export interface TenantMenuCategoryTranslation {
  language_id: number;
  name: string;
  description?: string;
  language_code?: string;
  language_name?: string;
}

export interface TenantMenuCategoryImage {
  id?: number;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface TenantMenuCategory {
  id: number;
  tenant_id: number;
  store_id: number | null;
  parent_id: number | null;
  master_menu_category_id: number | null;
  slug: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  show_on_website: boolean;
  show_on_pos: boolean;
  show_on_kiosk: boolean;
  vat_rate: number | null;
  created_at: string;
  updated_at: string;
  translations: TenantMenuCategoryTranslation[];
  images: TenantMenuCategoryImage[];
}

export interface MasterCategoryForImport {
  id: number;
  code: string;
  is_imported: boolean;
  translations: Array<{ language_code: string; name: string }>;
}

const tenantMenuCategoryService = {
  async getAll(filters?: Record<string, any>): Promise<TenantMenuCategory[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.append(k, String(v));
      });
    }
    const response = await api.get(`/api/tenant/menu-categories?${params.toString()}`);
    return response.data.data || response.data;
  },

  async getById(id: number): Promise<TenantMenuCategory> {
    const response = await api.get(`/api/tenant/menu-categories/${id}`);
    return response.data.data || response.data;
  },

  async create(data: Partial<TenantMenuCategory>): Promise<TenantMenuCategory> {
    const response = await api.post('/api/tenant/menu-categories', data);
    return response.data.data || response.data;
  },

  async update(id: number, data: Partial<TenantMenuCategory>): Promise<TenantMenuCategory> {
    const response = await api.put(`/api/tenant/menu-categories/${id}`, data);
    return response.data.data || response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/menu-categories/${id}`);
  },

  async getAvailableMaster(): Promise<MasterCategoryForImport[]> {
    const response = await api.get('/api/tenant/menu-categories/master/available');
    return response.data.data || response.data;
  },

  async importFromMaster(masterIds: number[]): Promise<{ imported_count: number; imported_ids: number[] }> {
    const response = await api.post('/api/tenant/menu-categories/import', { master_ids: masterIds });
    return response.data.data || response.data;
  },
};

export default tenantMenuCategoryService;
