import apiClient from './api';

export interface OrderTypeTranslation {
  language_id: number;
  name: string;
  language_code?: string;
  language_name?: string;
}

export interface OrderType {
  id: number;
  code: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: OrderTypeTranslation[];
}

const orderTypeService = {
  async getAll(): Promise<OrderType[]> {
    const response = await apiClient.get('/api/admin/order-types');
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<OrderType> {
    const response = await apiClient.get(`/api/admin/order-types/${id}`);
    return response.data.data || response.data;
  },
  async create(data: { code: string; icon?: string; sort_order?: number; is_active?: boolean; translations?: OrderTypeTranslation[] }): Promise<OrderType> {
    const response = await apiClient.post('/api/admin/order-types', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: { code?: string; icon?: string; sort_order?: number; is_active?: boolean; translations?: OrderTypeTranslation[] }): Promise<OrderType> {
    const response = await apiClient.put(`/api/admin/order-types/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/admin/order-types/${id}`);
  },
};

export default orderTypeService;
