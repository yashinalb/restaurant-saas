import api from './api';

export interface DailyReportSnapshot {
  id: number;
  store_id: number;
  report_date: string;
  total_orders: number;
  total_revenue: number | string;
  total_tax: number | string;
  total_tips: number | string;
  total_discounts: number | string;
  total_refunds: number | string;
  total_expenses: number | string;
  order_count_by_type: Record<string, number> | null;
  payment_breakdown: Record<string, number> | null;
  currency_id: number;
  generated_at: string;
  created_at: string;
  // Joined
  store_name?: string;
  currency_code?: string;
  currency_symbol?: string;
}

export interface DailyReportInput {
  store_id: number;
  report_date: string;
  currency_id: number;
  total_orders?: number;
  total_revenue?: number;
  total_tax?: number;
  total_tips?: number;
  total_discounts?: number;
  total_refunds?: number;
  total_expenses?: number;
  order_count_by_type?: Record<string, number>;
  payment_breakdown?: Record<string, number>;
}

const dailyReportSnapshotService = {
  async getAll(filters?: Record<string, any>): Promise<DailyReportSnapshot[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v));
    });
    const response = await api.get(`/api/tenant/daily-reports?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<DailyReportSnapshot> {
    const response = await api.get(`/api/tenant/daily-reports/${id}`);
    return response.data.data || response.data;
  },
  async create(data: DailyReportInput): Promise<DailyReportSnapshot> {
    const response = await api.post('/api/tenant/daily-reports', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<DailyReportInput>): Promise<DailyReportSnapshot> {
    const response = await api.put(`/api/tenant/daily-reports/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/daily-reports/${id}`);
  },
  async generate(params: { store_id: number; report_date: string; currency_id: number }): Promise<DailyReportSnapshot> {
    const response = await api.post('/api/tenant/daily-reports/generate', params);
    return response.data.data || response.data;
  },
};

export default dailyReportSnapshotService;
