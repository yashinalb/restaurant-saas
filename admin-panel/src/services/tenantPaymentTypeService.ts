import api from './api';

export interface TenantPaymentTypeTranslation {
  language_id: number;
  name: string;
  language_code?: string;
  language_name?: string;
}

export interface TenantPaymentType {
  id: number;
  code: string;
  icon: string | null;
  master_payment_type_id: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: TenantPaymentTypeTranslation[];
}

export interface MasterPaymentTypeForImport {
  id: number;
  code: string;
  icon: string | null;
  is_imported: boolean;
  translations: Array<{ language_code: string; name: string }>;
}

const tenantPaymentTypeService = {
  async getAll(filters?: Record<string, any>): Promise<TenantPaymentType[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const response = await api.get(`/api/tenant/payment-types?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<TenantPaymentType> {
    const response = await api.get(`/api/tenant/payment-types/${id}`);
    return response.data.data || response.data;
  },
  async create(data: Partial<TenantPaymentType>): Promise<TenantPaymentType> {
    const response = await api.post('/api/tenant/payment-types', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<TenantPaymentType>): Promise<TenantPaymentType> {
    const response = await api.put(`/api/tenant/payment-types/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/payment-types/${id}`);
  },
  async getAvailableMaster(): Promise<MasterPaymentTypeForImport[]> {
    const response = await api.get('/api/tenant/payment-types/master/available');
    return response.data.data || response.data;
  },
  async importFromMaster(masterIds: number[]): Promise<{ imported_count: number; imported_ids: number[] }> {
    const response = await api.post('/api/tenant/payment-types/import', { master_ids: masterIds });
    return response.data.data || response.data;
  },
};

export default tenantPaymentTypeService;
