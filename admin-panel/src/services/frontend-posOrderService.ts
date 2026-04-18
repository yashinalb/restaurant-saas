import api from './api';
import { Order } from './orderService';

interface StartOrderInput {
  session_id: number;
  table_id?: number | null;
  order_type_code?: 'dine_in' | 'takeaway' | 'delivery' | null;
  tenant_customer_id?: number | null;
  guest_name?: string | null;
  guest_phone?: string | null;
}

const posOrderService = {
  async start(data: StartOrderInput): Promise<Order> {
    const response = await api.post('/api/tenant/pos/orders/start', data);
    return response.data.data || response.data;
  },
};

export default posOrderService;
