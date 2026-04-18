import api from './api';

export interface CashRegisterSession {
  id: number;
  store_id: number;
  opened_by: number;
  closed_by: number | null;
  opening_amount: number | string;
  closing_amount: number | string | null;
  expected_amount: number | string | null;
  difference: number | string | null;
  currency_id: number;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  store_name?: string;
  currency_code?: string;
  currency_symbol?: string;
  opened_by_email?: string;
  opened_by_first_name?: string | null;
  opened_by_last_name?: string | null;
  closed_by_email?: string;
  closed_by_first_name?: string | null;
  closed_by_last_name?: string | null;
}

export interface OpenSessionInput {
  store_id: number;
  opening_amount: number;
  currency_id: number;
  opened_at?: string;
  notes?: string | null;
}

export interface CloseSessionInput {
  closing_amount: number;
  expected_amount?: number | null;
  notes?: string | null;
}

const cashRegisterSessionService = {
  async getAll(filters?: Record<string, any>): Promise<CashRegisterSession[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v));
    });
    const response = await api.get(`/api/tenant/cash-sessions?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<CashRegisterSession> {
    const response = await api.get(`/api/tenant/cash-sessions/${id}`);
    return response.data.data || response.data;
  },
  async open(data: OpenSessionInput): Promise<CashRegisterSession> {
    const response = await api.post('/api/tenant/cash-sessions', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<CashRegisterSession>): Promise<CashRegisterSession> {
    const response = await api.put(`/api/tenant/cash-sessions/${id}`, data);
    return response.data.data || response.data;
  },
  async close(id: number, data: CloseSessionInput): Promise<CashRegisterSession> {
    const response = await api.post(`/api/tenant/cash-sessions/${id}/close`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/cash-sessions/${id}`);
  },
};

export default cashRegisterSessionService;
