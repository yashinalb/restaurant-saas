import api from './api';

export interface TenantOrderItemStatusTranslation {
  language_id: number;
  name: string;
  language_code?: string;
  language_name?: string;
}

export interface TenantOrderItemStatus {
  id: number;
  code: string;
  color: string | null;
  master_order_item_status_id: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: TenantOrderItemStatusTranslation[];
}

export interface MasterOrderItemStatusForImport {
  id: number;
  code: string;
  color: string | null;
  is_imported: boolean;
  translations: Array<{ language_code: string; name: string }>;
}

const tenantOrderItemStatusService = {
  async getAll(filters?: Record<string, any>): Promise<TenantOrderItemStatus[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const response = await api.get(`/api/tenant/order-item-statuses?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<TenantOrderItemStatus> {
    const response = await api.get(`/api/tenant/order-item-statuses/${id}`);
    return response.data.data || response.data;
  },
  async create(data: Partial<TenantOrderItemStatus>): Promise<TenantOrderItemStatus> {
    const response = await api.post('/api/tenant/order-item-statuses', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<TenantOrderItemStatus>): Promise<TenantOrderItemStatus> {
    const response = await api.put(`/api/tenant/order-item-statuses/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/order-item-statuses/${id}`);
  },
  async getAvailableMaster(): Promise<MasterOrderItemStatusForImport[]> {
    const response = await api.get('/api/tenant/order-item-statuses/master/available');
    return response.data.data || response.data;
  },
  async importFromMaster(masterIds: number[]): Promise<{ imported_count: number; imported_ids: number[] }> {
    const response = await api.post('/api/tenant/order-item-statuses/import', { master_ids: masterIds });
    return response.data.data || response.data;
  },
};

export default tenantOrderItemStatusService;
