import api from './api';

export interface ReceiptPayment {
  amount: number | string;
  currency_id: number;
  exchange_rate: number | string | null;
  reference_number: string | null;
  payment_mode: string | null;
  payment_type_code: string | null;
  currency_code: string | null;
  currency_symbol: string | null;
}

export interface ReceiptData {
  tenant: { name: string | null };
  store: {
    name: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    country_code: string | null;
    phone: string | null;
    email: string | null;
    receipt_printer_ip: string | null;
  };
  order: {
    id: number;
    order_number: string;
    order_status: string;
    created_at: string;
    table_name: string | null;
    waiter_name: string | null;
    guest_name: string | null;
    notes: string | null;
    currency: { code: string | null; symbol: string | null };
  };
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    weighted_portion: number | null;
    is_comp: boolean;
    notes: string | null;
    selected_addons: any[] | null;
    selected_ingredients: any[] | null;
    vat_rate: number;
    is_paid: boolean;
  }>;
  totals: {
    subtotal: number;
    discount_amount: number;
    service_charge: number;
    tax_amount: number;
    total: number;
    ikram_lines: number;
  };
  vat_breakdown: Array<{ rate: number; subtotal: number; vat: number }>;
  payments: ReceiptPayment[];
  payment_status_code: string | null;
  qr: { token: string; url: string } | null;
}

export interface ReceiptResponse {
  receipt: ReceiptData;
  esc_pos: string;
}

const posReceiptService = {
  async get(orderId: number, language?: string): Promise<ReceiptResponse> {
    const response = await api.get(`/api/tenant/pos/orders/${orderId}/receipt`, {
      params: language ? { language } : undefined,
      headers: { 'X-Public-Base-Url': window.location.origin },
    });
    return response.data.data;
  },
  async printThermal(orderId: number, language?: string): Promise<{ printed: boolean; printer_ip: string | null; reason?: string }> {
    const response = await api.post(`/api/tenant/pos/orders/${orderId}/print-receipt`, language ? { language } : {}, {
      headers: { 'X-Public-Base-Url': window.location.origin },
    });
    return response.data.data || response.data;
  },
};

export default posReceiptService;
