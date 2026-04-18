import api from './api';

export interface StockIntakeInput {
  id?: number;
  store_id: number;
  tenant_inventory_product_id: number;
  quantity_ordered?: number | null;
  quantity_received: number;
  is_carton?: boolean;
  units_in_carton?: number | null;
  total_units_received?: number | null;
  notes?: string | null;
  received_by?: number | null;
  received_at: string;
  status?: 'complete' | 'partial' | 'pending';
}

export interface StockIntakeRow extends StockIntakeInput {
  id: number;
  store_name?: string;
  product_name?: string;
  product_code?: string;
}

export interface SupplierInvoice {
  id: number;
  tenant_supplier_id: number;
  invoice_number: string;
  invoice_date: string;
  total_amount_before_vat: number | string | null;
  total_vat_amount: number | string | null;
  total_amount: number | string;
  currency_id: number;
  stock_status: 'pending' | 'partial' | 'received';
  notes: string | null;
  received_by: number | null;
  created_at: string;
  updated_at: string;
  // Joined
  supplier_name?: string;
  currency_code?: string;
  currency_symbol?: string;
  intake_count?: number;
  intakes?: StockIntakeRow[];
}

export interface SupplierInvoiceInput {
  tenant_supplier_id: number;
  invoice_number: string;
  invoice_date: string;
  total_amount_before_vat?: number | null;
  total_vat_amount?: number | null;
  total_amount: number;
  currency_id: number;
  stock_status?: 'pending' | 'partial' | 'received';
  notes?: string | null;
  received_by?: number | null;
  intakes?: StockIntakeInput[];
}

const supplierInvoiceService = {
  async getAll(filters?: Record<string, any>): Promise<SupplierInvoice[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.append(k, String(v));
      });
    }
    const response = await api.get(`/api/tenant/supplier-invoices?${params.toString()}`);
    return response.data.data || response.data;
  },

  async getById(id: number): Promise<SupplierInvoice> {
    const response = await api.get(`/api/tenant/supplier-invoices/${id}`);
    return response.data.data || response.data;
  },

  async create(data: SupplierInvoiceInput): Promise<SupplierInvoice> {
    const response = await api.post('/api/tenant/supplier-invoices', data);
    return response.data.data || response.data;
  },

  async update(id: number, data: Partial<SupplierInvoiceInput>): Promise<SupplierInvoice> {
    const response = await api.put(`/api/tenant/supplier-invoices/${id}`, data);
    return response.data.data || response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/supplier-invoices/${id}`);
  },
};

export default supplierInvoiceService;
