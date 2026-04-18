import api from './api';

export interface InventoryProductSupplier {
  id?: number;
  tenant_inventory_product_id?: number;
  tenant_supplier_id: number;
  is_primary?: boolean | number;
  supplier_sku?: string | null;
  supplier_name?: string;
}

export interface TenantInventoryProduct {
  id: number;
  product_code: string | null;
  name: string;
  unit_in_stock: number | string;
  is_weighted: boolean | number;
  has_carton: boolean | number;
  units_per_carton: number | null;
  buying_price_excl_vat: number | string | null;
  vat_type: 'percentage' | 'exempt';
  vat_percentage: number | string;
  buying_price_incl_vat: number | string | null;
  low_stock_threshold: number | string;
  is_active: boolean | number;
  created_at: string;
  updated_at: string;
  supplier_count?: number;
  suppliers?: InventoryProductSupplier[];
}

export interface TenantInventoryProductInput {
  product_code?: string | null;
  name: string;
  unit_in_stock?: number;
  is_weighted?: boolean;
  has_carton?: boolean;
  units_per_carton?: number | null;
  buying_price_excl_vat?: number | null;
  vat_type?: 'percentage' | 'exempt';
  vat_percentage?: number;
  buying_price_incl_vat?: number | null;
  low_stock_threshold?: number;
  is_active?: boolean;
  suppliers?: InventoryProductSupplier[];
}

const tenantInventoryProductService = {
  async getAll(filters?: Record<string, any>): Promise<TenantInventoryProduct[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.append(k, String(v));
      });
    }
    const response = await api.get(`/api/tenant/inventory-products?${params.toString()}`);
    return response.data.data || response.data;
  },

  async getById(id: number): Promise<TenantInventoryProduct> {
    const response = await api.get(`/api/tenant/inventory-products/${id}`);
    return response.data.data || response.data;
  },

  async create(data: TenantInventoryProductInput): Promise<TenantInventoryProduct> {
    const response = await api.post('/api/tenant/inventory-products', data);
    return response.data.data || response.data;
  },

  async update(id: number, data: Partial<TenantInventoryProductInput>): Promise<TenantInventoryProduct> {
    const response = await api.put(`/api/tenant/inventory-products/${id}`, data);
    return response.data.data || response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/inventory-products/${id}`);
  },
};

export default tenantInventoryProductService;
