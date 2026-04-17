import api from './api';

export type OrderStatus = 'open' | 'closed' | 'cancelled' | 'void';

export interface OrderItem {
  id: number;
  order_id: number;
  original_order_id: number | null;
  tenant_menu_item_id: number;
  tenant_order_item_status_id: number;
  quantity: number;
  unit_price: number | string;
  total_price: number | string;
  weighted_portion: number | string | null;
  selected_addons: any[] | null;
  selected_ingredients: any[] | null;
  is_paid: boolean;
  amount_paid: number | string;
  payment_history: any[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  menu_item_name?: string;
  status_code?: string;
}

export interface OrderItemInput {
  id?: number;
  tenant_menu_item_id: number;
  tenant_order_item_status_id: number;
  quantity: number;
  unit_price: number;
  weighted_portion?: number | null;
  selected_addons?: any | null;
  selected_ingredients?: any | null;
  notes?: string | null;
}

export interface Order {
  id: number;
  tenant_id: number;
  store_id: number;
  order_number: string;
  tenant_customer_id: number | null;
  tenant_waiter_id: number | null;
  table_id: number | null;
  tenant_order_source_id: number;
  tenant_order_type_id: number;
  tenant_payment_status_id: number | null;
  order_status: OrderStatus;
  subtotal: number | string;
  tax_amount: number | string;
  service_charge: number | string;
  discount_amount: number | string;
  total: number | string;
  currency_id: number;
  is_joined: boolean;
  joined_tables: number[] | null;
  guest_name: string | null;
  guest_phone: string | null;
  delivery_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  store_name?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  waiter_name?: string;
  table_name?: string;
  currency_code?: string;
  currency_symbol?: string;
  item_count?: number;
  items?: OrderItem[];
}

export interface OrderInput {
  store_id: number;
  tenant_order_source_id: number;
  tenant_order_type_id: number;
  currency_id: number;
  tenant_customer_id?: number | null;
  tenant_waiter_id?: number | null;
  table_id?: number | null;
  tenant_payment_status_id?: number | null;
  order_status?: OrderStatus;
  service_charge?: number;
  discount_amount?: number;
  tax_amount?: number;
  is_joined?: boolean;
  joined_tables?: number[] | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  delivery_address?: string | null;
  notes?: string | null;
  items?: OrderItemInput[];
}

const orderService = {
  async getAll(filters?: Record<string, any>): Promise<Order[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const response = await api.get(`/api/tenant/orders?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<Order> {
    const response = await api.get(`/api/tenant/orders/${id}`);
    return response.data.data || response.data;
  },
  async create(data: OrderInput): Promise<Order> {
    const response = await api.post('/api/tenant/orders', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<OrderInput>): Promise<Order> {
    const response = await api.put(`/api/tenant/orders/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/orders/${id}`);
  },
};

export default orderService;
