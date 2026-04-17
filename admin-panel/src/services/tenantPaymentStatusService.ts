import api from './api';

export interface TenantPaymentStatusTranslation {
  language_id: number;
  name: string;
  language_code?: string;
  language_name?: string;
}

export interface TenantPaymentStatus {
  id: number;
  code: string;
  color: string | null;
  master_payment_status_id: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: TenantPaymentStatusTranslation[];
}

export interface MasterPaymentStatusForImport {
  id: number;
  code: string;
  color: string | null;
  is_imported: boolean;
  translations: Array<{ language_code: string; name: string }>;
}

const tenantPaymentStatusService = {
  async getAll(filters?: Record<string, any>): Promise<TenantPaymentStatus[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const response = await api.get(`/api/tenant/payment-statuses?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<TenantPaymentStatus> {
    const response = await api.get(`/api/tenant/payment-statuses/${id}`);
    return response.data.data || response.data;
  },
  async create(data: Partial<TenantPaymentStatus>): Promise<TenantPaymentStatus> {
    const response = await api.post('/api/tenant/payment-statuses', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<TenantPaymentStatus>): Promise<TenantPaymentStatus> {
    const response = await api.put(`/api/tenant/payment-statuses/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/payment-statuses/${id}`);
  },
  async getAvailableMaster(): Promise<MasterPaymentStatusForImport[]> {
    const response = await api.get('/api/tenant/payment-statuses/master/available');
    return response.data.data || response.data;
  },
  async importFromMaster(masterIds: number[]): Promise<{ imported_count: number; imported_ids: number[] }> {
    const response = await api.post('/api/tenant/payment-statuses/import', { master_ids: masterIds });
    return response.data.data || response.data;
  },
};

export default tenantPaymentStatusService;
