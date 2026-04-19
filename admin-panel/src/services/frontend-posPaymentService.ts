import api from './api';

export interface PaymentSplitInput {
  tenant_payment_type_id: number;
  currency_id: number;
  amount: number;
  payment_mode?: 'full' | 'partial' | 'per_item' | 'mixed';
  exchange_rate?: number | null;
  reference_number?: string | null;
  notes?: string | null;
}

export interface PayInput {
  payments: PaymentSplitInput[];
  tip_amount?: number;
  item_ids?: number[];
}

export interface PayResult {
  transaction_id: number;
  order_status: string;
  total_paid: number;
  change: number;
  store_id?: number;
  has_cash_payment?: boolean;
  drawer?: { pulsed: boolean; printer_ip: string | null; reason?: string } | null;
}

const posPaymentService = {
  async pay(orderId: number, data: PayInput): Promise<PayResult> {
    const response = await api.post(`/api/tenant/pos/orders/${orderId}/pay`, data);
    return response.data.data || response.data;
  },
};

export default posPaymentService;
