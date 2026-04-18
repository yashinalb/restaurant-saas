import api from './api';

export interface TenantExpenseSourceTranslation {
  language_id: number;
  name: string;
  description?: string | null;
  language_code?: string;
  language_name?: string;
}

export interface TenantExpenseSource {
  id: number;
  tenant_expense_category_id: number;
  is_active: boolean | number;
  created_at: string;
  updated_at: string;
  translations: TenantExpenseSourceTranslation[];
  category_code?: string;
  category_translations?: Array<{ language_code: string; name: string }>;
}

const tenantExpenseSourceService = {
  async getAll(filters?: Record<string, any>): Promise<TenantExpenseSource[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v));
    });
    const response = await api.get(`/api/tenant/expense-sources?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<TenantExpenseSource> {
    const response = await api.get(`/api/tenant/expense-sources/${id}`);
    return response.data.data || response.data;
  },
  async create(data: Partial<TenantExpenseSource>): Promise<TenantExpenseSource> {
    const response = await api.post('/api/tenant/expense-sources', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<TenantExpenseSource>): Promise<TenantExpenseSource> {
    const response = await api.put(`/api/tenant/expense-sources/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/expense-sources/${id}`);
  },
};

export default tenantExpenseSourceService;
