import api from './api';

export interface QrGenerateResult {
  token: string;
  expires_at: string;
  url: string;
  table_id: number | null;
  was_refreshed: boolean;
}

const posQrService = {
  async generate(orderId: number, ttl_minutes?: number): Promise<QrGenerateResult> {
    const response = await api.post(`/api/tenant/pos/orders/${orderId}/qr`, {
      ttl_minutes,
    }, {
      headers: { 'X-Public-Base-Url': window.location.origin },
    });
    return response.data.data || response.data;
  },
};

export default posQrService;
