import api from './api';

export interface SupplierPaymentRecord {
  id?: number;
  supplier_credit_id?: number;
  tenant_payment_type_id: number;
  paid_by: number;
  payment_amount: number | string;
  payment_date: string;
  currency_id: number;
  reference_number?: string | null;
  notes?: string | null;
  created_at?: string;
  // Joined
  payment_type_code?: string;
  paid_by_email?: string;
  paid_by_first_name?: string;
  paid_by_last_name?: string;
  payment_currency_code?: string;
  payment_currency_symbol?: string;
}

export interface SupplierCredit {
  id: number;
  tenant_supplier_id: number;
  supplier_invoice_id: number | null;
  credit_amount: number | string;
  amount_paid: number | string;
  balance: number | string;
  currency_id: number;
  created_at: string;
  updated_at: string;
  // Joined
  supplier_name?: string;
  invoice_number?: string;
  currency_code?: string;
  currency_symbol?: string;
  payment_count?: number;
  payments?: SupplierPaymentRecord[];
}

export interface SupplierCreditInput {
  tenant_supplier_id: number;
  supplier_invoice_id?: number | null;
  credit_amount: number;
  currency_id: number;
  payments?: Array<Omit<SupplierPaymentRecord, 'id' | 'supplier_credit_id' | 'created_at'>>;
}

const supplierCreditService = {
  async getAll(filters?: Record<string, any>): Promise<SupplierCredit[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.append(k, String(v));
      });
    }
    const response = await api.get(`/api/tenant/supplier-credits?${params.toString()}`);
    return response.data.data || response.data;
  },

  async getById(id: number): Promise<SupplierCredit> {
    const response = await api.get(`/api/tenant/supplier-credits/${id}`);
    return response.data.data || response.data;
  },

  async create(data: SupplierCreditInput): Promise<SupplierCredit> {
    const response = await api.post('/api/tenant/supplier-credits', data);
    return response.data.data || response.data;
  },

  async update(id: number, data: Partial<SupplierCreditInput>): Promise<SupplierCredit> {
    const response = await api.put(`/api/tenant/supplier-credits/${id}`, data);
    return response.data.data || response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/supplier-credits/${id}`);
  },

  async addPayment(creditId: number, payment: Omit<SupplierPaymentRecord, 'id' | 'supplier_credit_id' | 'created_at'>): Promise<SupplierCredit> {
    const response = await api.post(`/api/tenant/supplier-credits/${creditId}/payments`, payment);
    return response.data.data || response.data;
  },

  async deletePayment(paymentId: number): Promise<void> {
    await api.delete(`/api/tenant/supplier-credits/payments/${paymentId}`);
  },
};

export default supplierCreditService;
