import api from './api';

export interface PosActiveOrder {
  id: number;
  order_number: string;
  table_id: number | null;
  table_name: string | null;
  total: number | string;
  created_at: string;
  item_count: number;
}

const posMoveItemsService = {
  async listActiveOrders(params: { store_id: number; exclude_order_id?: number }): Promise<PosActiveOrder[]> {
    const response = await api.get('/api/tenant/pos/orders/active', { params });
    return response.data.data || [];
  },
  async move(sourceOrderId: number, target_order_id: number, order_item_ids: number[]): Promise<{ moved_count: number; moved_item_ids: number[] }> {
    const response = await api.post(`/api/tenant/pos/orders/${sourceOrderId}/move-items`, {
      target_order_id,
      order_item_ids,
    });
    return response.data.data || response.data;
  },
};

export default posMoveItemsService;
