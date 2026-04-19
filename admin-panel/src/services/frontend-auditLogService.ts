import api from './api';

export interface AuditLogEntry {
  id: number;
  tenant_id: number;
  store_id: number | null;
  admin_user_id: number | null;
  tenant_waiter_id: number | null;
  action: string;
  target_type: string | null;
  target_id: number | null;
  reason: string | null;
  before_json: any | null;
  after_json: any | null;
  ip_address: string | null;
  created_at: string;
  admin_user_email?: string | null;
  admin_user_first_name?: string | null;
  admin_user_last_name?: string | null;
  waiter_name?: string | null;
  store_name?: string | null;
}

const auditLogService = {
  async getAll(filters: Record<string, any> = {}): Promise<AuditLogEntry[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
    });
    const response = await api.get(`/api/tenant/audit-logs?${params.toString()}`);
    return response.data.data || [];
  },
  async getActions(): Promise<string[]> {
    const response = await api.get('/api/tenant/audit-logs/actions');
    return response.data.data || [];
  },
};

export default auditLogService;
