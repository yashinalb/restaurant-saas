import api from './api';

export interface TenantExpenseCategoryTranslation {
  language_id: number;
  name: string;
  description?: string | null;
  language_code?: string;
  language_name?: string;
}

export interface TenantExpenseCategory {
  id: number;
  code: string;
  icon: string | null;
  master_expense_category_id: number | null;
  sort_order: number;
  is_active: boolean | number;
  created_at: string;
  updated_at: string;
  translations: TenantExpenseCategoryTranslation[];
}

export interface MasterExpenseCategoryForImport {
  id: number;
  code: string;
  is_imported: boolean | number;
  translations: Array<{ language_code: string; name: string; description?: string }>;
}

const tenantExpenseCategoryService = {
  async getAll(filters?: Record<string, any>): Promise<TenantExpenseCategory[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v));
    });
    const response = await api.get(`/api/tenant/expense-categories?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<TenantExpenseCategory> {
    const response = await api.get(`/api/tenant/expense-categories/${id}`);
    return response.data.data || response.data;
  },
  async create(data: Partial<TenantExpenseCategory>): Promise<TenantExpenseCategory> {
    const response = await api.post('/api/tenant/expense-categories', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<TenantExpenseCategory>): Promise<TenantExpenseCategory> {
    const response = await api.put(`/api/tenant/expense-categories/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/expense-categories/${id}`);
  },
  async getAvailableMaster(): Promise<MasterExpenseCategoryForImport[]> {
    const response = await api.get('/api/tenant/expense-categories/master/available');
    return response.data.data || response.data;
  },
  async importFromMaster(masterIds: number[]): Promise<{ imported_count: number; imported_ids: number[] }> {
    const response = await api.post('/api/tenant/expense-categories/import', { master_ids: masterIds });
    return response.data.data || response.data;
  },
};

export default tenantExpenseCategoryService;
