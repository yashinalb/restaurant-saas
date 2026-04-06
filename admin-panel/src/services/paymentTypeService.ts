import apiClient from './api';

export interface PaymentTypeTranslation {
  language_id: number;
  name: string;
  language_code?: string;
  language_name?: string;
}

export interface PaymentType {
  id: number;
  code: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations: PaymentTypeTranslation[];
}

const paymentTypeService = {
  async getAll(): Promise<PaymentType[]> {
    const response = await apiClient.get('/api/admin/payment-types');
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<PaymentType> {
    const response = await apiClient.get(`/api/admin/payment-types/${id}`);
    return response.data.data || response.data;
  },
  async create(data: { code: string; icon?: string; sort_order?: number; is_active?: boolean; translations?: PaymentTypeTranslation[] }): Promise<PaymentType> {
    const response = await apiClient.post('/api/admin/payment-types', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: { code?: string; icon?: string; sort_order?: number; is_active?: boolean; translations?: PaymentTypeTranslation[] }): Promise<PaymentType> {
    const response = await apiClient.put(`/api/admin/payment-types/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/admin/payment-types/${id}`);
  },
};

export default paymentTypeService;
