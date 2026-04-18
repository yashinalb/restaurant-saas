import api from './api';

export interface StockIntake {
  id: number;
  store_id: number;
  tenant_supplier_id: number;
  supplier_invoice_id: number | null;
  tenant_inventory_product_id: number;
  quantity_ordered: number | string | null;
  quantity_received: number | string;
  is_carton: boolean | number;
  units_in_carton: number | null;
  total_units_received: number | string | null;
  notes: string | null;
  received_by: number | null;
  received_at: string;
  status: 'complete' | 'partial' | 'pending';
  created_at: string;
  updated_at: string;
  // Joined
  store_name?: string;
  supplier_name?: string;
  product_name?: string;
  product_code?: string;
  invoice_number?: string;
}

export interface StockIntakeInput {
  store_id: number;
  tenant_supplier_id: number;
  supplier_invoice_id?: number | null;
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

const stockIntakeService = {
  async getAll(filters?: Record<string, any>): Promise<StockIntake[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.append(k, String(v));
      });
    }
    const response = await api.get(`/api/tenant/stock-intakes?${params.toString()}`);
    return response.data.data || response.data;
  },

  async getById(id: number): Promise<StockIntake> {
    const response = await api.get(`/api/tenant/stock-intakes/${id}`);
    return response.data.data || response.data;
  },

  async create(data: StockIntakeInput): Promise<StockIntake> {
    const response = await api.post('/api/tenant/stock-intakes', data);
    return response.data.data || response.data;
  },

  async update(id: number, data: Partial<StockIntakeInput>): Promise<StockIntake> {
    const response = await api.put(`/api/tenant/stock-intakes/${id}`, data);
    return response.data.data || response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/stock-intakes/${id}`);
  },
};

export default stockIntakeService;
