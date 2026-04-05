import api from './api';

export interface TenantSetting {
  id: number;
  tenant_id: number;
  setting_key: string;
  setting_value: string | null;
  setting_type: 'string' | 'number' | 'boolean' | 'json';
  created_at: string;
  updated_at: string;
}

export interface SettingUpsert {
  setting_key: string;
  setting_value: string;
  setting_type?: 'string' | 'number' | 'boolean' | 'json';
}

export const tenantSettingService = {
  async getAll() {
    const response = await api.get<{ data: TenantSetting[] }>('/api/tenant/settings');
    return response.data.data;
  },

  async getByKey(key: string) {
    const response = await api.get<{ data: TenantSetting }>(`/api/tenant/settings/${key}`);
    return response.data.data;
  },

  async upsert(data: SettingUpsert) {
    const response = await api.put<{ data: TenantSetting }>('/api/tenant/settings', data);
    return response.data.data;
  },

  async bulkUpsert(settings: SettingUpsert[]) {
    const response = await api.put<{ data: TenantSetting[] }>('/api/tenant/settings/bulk', { settings });
    return response.data.data;
  },

  async deleteByKey(key: string) {
    await api.delete(`/api/tenant/settings/${key}`);
  },
};
