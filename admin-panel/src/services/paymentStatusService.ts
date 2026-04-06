import apiClient from './api';

export interface PaymentStatusTranslation {
  language_id: number;
  name: string;
  language_code?: string;
  language_name?: string;
}

export interface PaymentStatus {
  id: number;
  code: string;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: PaymentStatusTranslation[];
}

const paymentStatusService = {
  async getAll(): Promise<PaymentStatus[]> {
    const response = await apiClient.get('/api/admin/payment-statuses');
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<PaymentStatus> {
    const response = await apiClient.get(`/api/admin/payment-statuses/${id}`);
    return response.data.data || response.data;
  },
  async create(data: { code: string; color?: string; sort_order?: number; is_active?: boolean; translations?: PaymentStatusTranslation[] }): Promise<PaymentStatus> {
    const response = await apiClient.post('/api/admin/payment-statuses', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: { code?: string; color?: string; sort_order?: number; is_active?: boolean; translations?: PaymentStatusTranslation[] }): Promise<PaymentStatus> {
    const response = await apiClient.put(`/api/admin/payment-statuses/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/admin/payment-statuses/${id}`);
  },
};

export default paymentStatusService;
