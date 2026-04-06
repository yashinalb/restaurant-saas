import api from './api';

export interface TenantOrderDestinationTranslation {
  language_id: number;
  name: string;
  language_code?: string;
  language_name?: string;
}

export interface TenantOrderDestination {
  id: number;
  code: string;
  printer_ip: string | null;
  kds_screen_id: number | null;
  master_order_destination_id: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: TenantOrderDestinationTranslation[];
}

export interface MasterOrderDestForImport {
  id: number;
  code: string;
  is_imported: boolean;
  translations: Array<{ language_code: string; name: string }>;
}

const tenantOrderDestinationService = {
  async getAll(filters?: Record<string, any>): Promise<TenantOrderDestination[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const response = await api.get(`/api/tenant/order-destinations?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<TenantOrderDestination> {
    const response = await api.get(`/api/tenant/order-destinations/${id}`);
    return response.data.data || response.data;
  },
  async create(data: Partial<TenantOrderDestination>): Promise<TenantOrderDestination> {
    const response = await api.post('/api/tenant/order-destinations', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<TenantOrderDestination>): Promise<TenantOrderDestination> {
    const response = await api.put(`/api/tenant/order-destinations/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/order-destinations/${id}`);
  },
  async getAvailableMaster(): Promise<MasterOrderDestForImport[]> {
    const response = await api.get('/api/tenant/order-destinations/master/available');
    return response.data.data || response.data;
  },
  async importFromMaster(masterIds: number[]): Promise<{ imported_count: number; imported_ids: number[] }> {
    const response = await api.post('/api/tenant/order-destinations/import', { master_ids: masterIds });
    return response.data.data || response.data;
  },
};

export default tenantOrderDestinationService;
