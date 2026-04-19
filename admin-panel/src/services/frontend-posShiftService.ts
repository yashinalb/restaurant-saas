import api from './api';

export interface PosShiftSession {
  id: number;
  store_id: number;
  currency_id: number;
  opening_amount: number | string;
  opened_at: string;
  opened_by_first_name?: string | null;
  opened_by_last_name?: string | null;
  opened_by_email?: string;
  currency_code?: string;
  currency_symbol?: string;
  store_name?: string;
  receipt_printer_ip?: string | null;
  notes?: string | null;
}

export interface PosShiftReconciliation {
  opening: number;
  cash_received: number;
  expected: number;
}

export interface PosShiftStatus {
  session: PosShiftSession | null;
  reconciliation: PosShiftReconciliation | null;
}

export interface PosShiftCloseResult {
  session_id: number;
  opening: number;
  cash_received: number;
  expected: number;
  closing: number;
  difference: number;
}

const posShiftService = {
  async getActive(store_id: number, currency_id: number): Promise<PosShiftStatus> {
    const response = await api.get('/api/tenant/pos/shift', { params: { store_id, currency_id } });
    return response.data.data || { session: null, reconciliation: null };
  },
  async open(data: { store_id: number; currency_id: number; opening_amount: number; notes?: string | null }): Promise<PosShiftStatus> {
    const response = await api.post('/api/tenant/pos/shift/open', data);
    return response.data.data || { session: null, reconciliation: null };
  },
  async close(data: {
    store_id: number;
    currency_id: number;
    closing_amount: number;
    expected_amount?: number | null;
    notes?: string | null;
  }): Promise<PosShiftCloseResult> {
    const response = await api.post('/api/tenant/pos/shift/close', data);
    return response.data.data || response.data;
  },
};

export default posShiftService;
