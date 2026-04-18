import api from './api';

export interface ExpensePayment {
  id?: number;
  expense_id?: number;
  tenant_payment_type_id?: number | null;
  currency_id: number;
  amount: number | string;
  payment_date: string;
  reference_number?: string | null;
  notes?: string | null;
  paid_by: number;
  created_at?: string;
  // Joined
  payment_type_code?: string;
  payment_currency_code?: string;
  payment_currency_symbol?: string;
  paid_by_email?: string;
  paid_by_first_name?: string;
  paid_by_last_name?: string;
}

export interface Expense {
  id: number;
  store_id: number | null;
  tenant_expense_source_id: number;
  invoice_number: string | null;
  description: string;
  amount: number | string;
  currency_id: number;
  due_date: string | null;
  payment_status: 'unpaid' | 'partially_paid' | 'paid';
  attachment_url: string | null;
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  // Joined
  store_name?: string;
  currency_code?: string;
  currency_symbol?: string;
  category_id?: number | null;
  amount_paid?: number | string;
  balance?: number | string;
  payment_count?: number;
  source_translations?: Array<{ language_code: string; name: string }>;
  payments?: ExpensePayment[];
}

export interface ExpenseInput {
  store_id?: number | null;
  tenant_expense_source_id: number;
  invoice_number?: string | null;
  description: string;
  amount: number;
  currency_id: number;
  due_date?: string | null;
  attachment_url?: string | null;
  notes?: string | null;
  payments?: Array<Omit<ExpensePayment, 'id' | 'expense_id' | 'created_at'>>;
}

const expenseService = {
  async getAll(filters?: Record<string, any>): Promise<Expense[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v));
    });
    const response = await api.get(`/api/tenant/expenses?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<Expense> {
    const response = await api.get(`/api/tenant/expenses/${id}`);
    return response.data.data || response.data;
  },
  async create(data: ExpenseInput): Promise<Expense> {
    const response = await api.post('/api/tenant/expenses', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<ExpenseInput>): Promise<Expense> {
    const response = await api.put(`/api/tenant/expenses/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/expenses/${id}`);
  },
  async addPayment(expenseId: number, payment: Omit<ExpensePayment, 'id' | 'expense_id' | 'created_at'>): Promise<Expense> {
    const response = await api.post(`/api/tenant/expenses/${expenseId}/payments`, payment);
    return response.data.data || response.data;
  },
  async deletePayment(paymentId: number): Promise<void> {
    await api.delete(`/api/tenant/expenses/payments/${paymentId}`);
  },
};

export default expenseService;
