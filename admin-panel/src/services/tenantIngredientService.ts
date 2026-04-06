import api from './api';

export interface TenantIngredientTranslation {
  language_id: number;
  name: string;
  description?: string;
  language_code?: string;
  language_name?: string;
}

export interface TenantIngredient {
  id: number;
  code: string;
  allergen_type: string | null;
  icon_url: string | null;
  master_ingredient_id: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: TenantIngredientTranslation[];
}

export interface MasterIngredientForImport {
  id: number;
  code: string;
  allergen_type: string | null;
  is_imported: boolean;
  translations: Array<{ language_code: string; name: string }>;
}

const tenantIngredientService = {
  async getAll(filters?: Record<string, any>): Promise<TenantIngredient[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const response = await api.get(`/api/tenant/ingredients?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<TenantIngredient> {
    const response = await api.get(`/api/tenant/ingredients/${id}`);
    return response.data.data || response.data;
  },
  async create(data: Partial<TenantIngredient>): Promise<TenantIngredient> {
    const response = await api.post('/api/tenant/ingredients', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<TenantIngredient>): Promise<TenantIngredient> {
    const response = await api.put(`/api/tenant/ingredients/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/ingredients/${id}`);
  },
  async getAvailableMaster(): Promise<MasterIngredientForImport[]> {
    const response = await api.get('/api/tenant/ingredients/master/available');
    return response.data.data || response.data;
  },
  async importFromMaster(masterIds: number[]): Promise<{ imported_count: number; imported_ids: number[] }> {
    const response = await api.post('/api/tenant/ingredients/import', { master_ids: masterIds });
    return response.data.data || response.data;
  },
};

export default tenantIngredientService;
