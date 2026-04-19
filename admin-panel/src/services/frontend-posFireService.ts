import api from './api';

export interface FireInput {
  item_ids?: number[] | null;
  refire?: boolean;
  void_item_ids?: number[] | null;
  print?: boolean;
  broadcast_kds?: boolean;
  language?: string;
}

export interface FireResult {
  mode: 'new' | 'refire' | 'void';
  fired_count: number;
  skipped: Array<{ item_id: number; reason: string }>;
  kds_created: number;
  kds_updated: number;
  tickets: Array<{
    destination_id: number | null;
    destination_code: string;
    destination_name: string;
    printer_ip: string | null;
    kind: string;
    printed?: boolean;
    reason?: string;
  }>;
}

const posFireService = {
  async fire(orderId: number, input: FireInput = {}): Promise<FireResult> {
    const response = await api.post(`/api/tenant/pos/orders/${orderId}/fire`, input);
    return response.data.data || response.data;
  },
};

export default posFireService;
