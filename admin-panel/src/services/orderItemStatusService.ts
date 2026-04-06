import apiClient from './api';

export interface OrderItemStatusTranslation {
  language_id: number;
  name: string;
  language_code?: string;
  language_name?: string;
}

export interface OrderItemStatus {
  id: number;
  code: string;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: OrderItemStatusTranslation[];
}

const orderItemStatusService = {
  async getAll(): Promise<OrderItemStatus[]> {
    const response = await apiClient.get('/api/admin/order-item-statuses');
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<OrderItemStatus> {
    const response = await apiClient.get(`/api/admin/order-item-statuses/${id}`);
    return response.data.data || response.data;
  },
  async create(data: { code: string; color?: string; sort_order?: number; is_active?: boolean; translations?: OrderItemStatusTranslation[] }): Promise<OrderItemStatus> {
    const response = await apiClient.post('/api/admin/order-item-statuses', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: { code?: string; color?: string; sort_order?: number; is_active?: boolean; translations?: OrderItemStatusTranslation[] }): Promise<OrderItemStatus> {
    const response = await apiClient.put(`/api/admin/order-item-statuses/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/admin/order-item-statuses/${id}`);
  },
};

export default orderItemStatusService;
