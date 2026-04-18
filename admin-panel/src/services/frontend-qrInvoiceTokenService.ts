import api from './api';

export interface QrInvoiceToken {
  id: number;
  order_id: number;
  table_id: number;
  token: string;
  status: 'active' | 'expired' | 'used';
  expires_at: string;
  metadata: any | null;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  order_number?: string;
  table_name?: string;
}

export interface QrInvoiceTokenInput {
  order_id: number;
  table_id: number;
  token?: string;
  status?: 'active' | 'expired' | 'used';
  expires_at: string;
  metadata?: any | null;
}

const qrInvoiceTokenService = {
  async getAll(filters?: Record<string, any>): Promise<QrInvoiceToken[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.append(k, String(v));
      });
    }
    const response = await api.get(`/api/tenant/qr-invoice-tokens?${params.toString()}`);
    return response.data.data || response.data;
  },

  async getById(id: number): Promise<QrInvoiceToken> {
    const response = await api.get(`/api/tenant/qr-invoice-tokens/${id}`);
    return response.data.data || response.data;
  },

  async create(data: QrInvoiceTokenInput): Promise<QrInvoiceToken> {
    const response = await api.post('/api/tenant/qr-invoice-tokens', data);
    return response.data.data || response.data;
  },

  async update(id: number, data: Partial<QrInvoiceTokenInput>): Promise<QrInvoiceToken> {
    const response = await api.put(`/api/tenant/qr-invoice-tokens/${id}`, data);
    return response.data.data || response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/qr-invoice-tokens/${id}`);
  },
};

export default qrInvoiceTokenService;
