import api from './api';

export type ItemStatusCode = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';

export interface TransitionResult {
  from: ItemStatusCode;
  to: ItemStatusCode;
  order_id: number;
  skipped?: string;
}

const posItemStatusService = {
  async patch(orderItemId: number, status: ItemStatusCode, language?: string): Promise<TransitionResult> {
    const response = await api.patch(`/api/tenant/pos/order-items/${orderItemId}/status`, {
      status,
      ...(language ? { language } : {}),
    });
    return response.data.data || response.data;
  },
};

export default posItemStatusService;
