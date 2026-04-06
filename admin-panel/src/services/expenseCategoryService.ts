import apiClient from './api';

export interface ExpenseCategoryTranslation {
  language_id: number;
  name: string;
  description?: string;
  language_code?: string;
  language_name?: string;
}

export interface ExpenseCategory {
  id: number;
  code: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: ExpenseCategoryTranslation[];
}

const expenseCategoryService = {
  async getAll(): Promise<ExpenseCategory[]> {
    const response = await apiClient.get('/api/admin/expense-categories');
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<ExpenseCategory> {
    const response = await apiClient.get(`/api/admin/expense-categories/${id}`);
    return response.data.data || response.data;
  },
  async create(data: { code: string; icon?: string; sort_order?: number; is_active?: boolean; translations?: ExpenseCategoryTranslation[] }): Promise<ExpenseCategory> {
    const response = await apiClient.post('/api/admin/expense-categories', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: { code?: string; icon?: string; sort_order?: number; is_active?: boolean; translations?: ExpenseCategoryTranslation[] }): Promise<ExpenseCategory> {
    const response = await apiClient.put(`/api/admin/expense-categories/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/admin/expense-categories/${id}`);
  },
};

export default expenseCategoryService;
