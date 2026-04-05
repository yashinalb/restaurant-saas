import apiClient from './api';

export interface OrderDestinationTranslation {
  language_id: number;
  name: string;
  language_code?: string;
  language_name?: string;
}

export interface OrderDestination {
  id: number;
  code: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: OrderDestinationTranslation[];
}

const orderDestinationService = {
  async getAll(): Promise<OrderDestination[]> {
    const response = await apiClient.get('/api/admin/order-destinations');
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<OrderDestination> {
    const response = await apiClient.get(`/api/admin/order-destinations/${id}`);
    return response.data.data || response.data;
  },
  async create(data: { code: string; icon?: string; sort_order?: number; is_active?: boolean; translations?: OrderDestinationTranslation[] }): Promise<OrderDestination> {
    const response = await apiClient.post('/api/admin/order-destinations', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: { code?: string; icon?: string; sort_order?: number; is_active?: boolean; translations?: OrderDestinationTranslation[] }): Promise<OrderDestination> {
    const response = await apiClient.put(`/api/admin/order-destinations/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/admin/order-destinations/${id}`);
  },
};

export default orderDestinationService;
