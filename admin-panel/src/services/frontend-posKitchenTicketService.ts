import api from './api';

export type TicketKind = 'new' | 'refire' | 'void';

export interface KitchenTicketItem {
  id: number;
  name: string;
  quantity: number;
  notes: string | null;
  selected_addons: any[] | null;
  selected_ingredients: any[] | null;
  status_code: string | null;
  weighted_portion: number | null;
  is_paid: boolean;
}

export interface KitchenTicket {
  destination_id: number | null;
  destination_code: string;
  destination_name: string;
  printer_ip: string | null;
  kind: TicketKind;
  items: KitchenTicketItem[];
  header: {
    order_number: string;
    table_name: string | null;
    waiter_name: string | null;
    guest_name: string | null;
    created_at: string;
    now: string;
  };
  esc_pos?: string; // stripped on print responses
  printed?: boolean; // present on print responses
  reason?: string;
}

export interface TicketRequest {
  language?: string;
  destination_id?: number;
  refire?: boolean;
  item_ids?: number[] | null;
  void_item_ids?: number[] | null;
}

const posKitchenTicketService = {
  async get(orderId: number, opts: TicketRequest = {}): Promise<KitchenTicket[]> {
    const response = await api.get(`/api/tenant/pos/orders/${orderId}/kitchen-tickets`, {
      params: {
        language: opts.language,
        destination_id: opts.destination_id,
        refire: opts.refire ? 'true' : undefined,
      },
    });
    return response.data.data || [];
  },
  async print(orderId: number, opts: TicketRequest = {}): Promise<{ tickets: KitchenTicket[] }> {
    const response = await api.post(`/api/tenant/pos/orders/${orderId}/print-kitchen-tickets`, opts);
    return response.data.data || { tickets: [] };
  },
};

export default posKitchenTicketService;
