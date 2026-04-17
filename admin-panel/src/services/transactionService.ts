import api from './api';

export type PaymentMode = 'full' | 'partial' | 'per_item' | 'mixed';

export interface TransactionPayment {
  id: number;
  transaction_id: number;
  tenant_payment_type_id: number;
  currency_id: number;
  amount: number | string;
  amount_due: number | string | null;
  payment_mode: PaymentMode;
  paid_items: any[] | null;
  exchange_rate: number | string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  payment_type_code?: string;
  payment_currency_code?: string;
  payment_currency_symbol?: string;
}

export interface PaymentInput {
  id?: number;
  tenant_payment_type_id: number;
  currency_id: number;
  amount: number;
  amount_due?: number | null;
  payment_mode?: PaymentMode;
  paid_items?: any | null;
  exchange_rate?: number | null;
  reference_number?: string | null;
  notes?: string | null;
}

export interface Transaction {
  id: number;
  tenant_id: number;
  store_id: number;
  order_id: number;
  tenant_payment_status_id: number;
  currency_id: number;
  amount_before_vat: number | string;
  vat_amount: number | string;
  service_charge: number | string;
  total_amount: number | string;
  total_paid: number | string;
  amount_remaining: number | string | null;
  is_joined: boolean;
  joined_to_transaction_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  store_name?: string;
  order_number?: string;
  currency_code?: string;
  currency_symbol?: string;
  payment_status_code?: string;
  payment_count?: number;
  payments?: TransactionPayment[];
}

export interface TransactionInput {
  store_id: number;
  order_id: number;
  tenant_payment_status_id: number;
  currency_id: number;
  amount_before_vat: number;
  vat_amount: number;
  service_charge?: number;
  total_amount: number;
  is_joined?: boolean;
  joined_to_transaction_id?: number | null;
  notes?: string | null;
  payments?: PaymentInput[];
}

const transactionService = {
  async getAll(filters?: Record<string, any>): Promise<Transaction[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const response = await api.get(`/api/tenant/transactions?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<Transaction> {
    const response = await api.get(`/api/tenant/transactions/${id}`);
    return response.data.data || response.data;
  },
  async create(data: TransactionInput): Promise<Transaction> {
    const response = await api.post('/api/tenant/transactions', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<TransactionInput>): Promise<Transaction> {
    const response = await api.put(`/api/tenant/transactions/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/transactions/${id}`);
  },
};

export default transactionService;
