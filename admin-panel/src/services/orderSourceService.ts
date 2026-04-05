import apiClient from './api';

export interface OrderSourceTranslation {
  language_id: number;
  name: string;
  language_code?: string;
  language_name?: string;
}

export interface OrderSource {
  id: number;
  code: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: OrderSourceTranslation[];
}

const orderSourceService = {
  async getAll(): Promise<OrderSource[]> {
    const response = await apiClient.get('/api/admin/order-sources');
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<OrderSource> {
    const response = await apiClient.get(`/api/admin/order-sources/${id}`);
    return response.data.data || response.data;
  },
  async create(data: { code: string; icon?: string; sort_order?: number; is_active?: boolean; translations?: OrderSourceTranslation[] }): Promise<OrderSource> {
    const response = await apiClient.post('/api/admin/order-sources', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: { code?: string; icon?: string; sort_order?: number; is_active?: boolean; translations?: OrderSourceTranslation[] }): Promise<OrderSource> {
    const response = await apiClient.put(`/api/admin/order-sources/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/admin/order-sources/${id}`);
  },
};

export default orderSourceService;
