import apiClient from './api';

export interface IngredientTranslation {
  language_id: number;
  name: string;
  description?: string;
  language_code?: string;
  language_name?: string;
}

export interface Ingredient {
  id: number;
  code: string;
  allergen_type: string | null;
  icon_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: IngredientTranslation[];
}

const ingredientService = {
  async getAll(): Promise<Ingredient[]> {
    const response = await apiClient.get('/api/admin/ingredients');
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<Ingredient> {
    const response = await apiClient.get(`/api/admin/ingredients/${id}`);
    return response.data.data || response.data;
  },
  async create(data: { code: string; allergen_type?: string; icon_url?: string; sort_order?: number; is_active?: boolean; translations?: IngredientTranslation[] }): Promise<Ingredient> {
    const response = await apiClient.post('/api/admin/ingredients', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: { code?: string; allergen_type?: string; icon_url?: string; sort_order?: number; is_active?: boolean; translations?: IngredientTranslation[] }): Promise<Ingredient> {
    const response = await apiClient.put(`/api/admin/ingredients/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/admin/ingredients/${id}`);
  },
};

export default ingredientService;
