import api from './api';

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  domain?: string;
  subdomain?: string;
  subscription_plan_id?: number | null;
  tenant_type_id?: number | null;
  logo_url?: string;
  favicon_url?: string;
  primary_color: string;
  secondary_color: string;
  default_language_id?: number | null;
  default_currency_id?: number | null;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  trial_ends_at?: string | null;
  subscription_ends_at?: string | null;
  settings?: any;
  created_at: string;
  updated_at: string;
  
  // Joined data
  subscription_plan_name?: string;
  subscription_plan_slug?: string;
  subscription_plan_price?: number;
  subscription_plan_currency?: string;
  tenant_type_code?: string;
  tenant_type_name?: string;
  default_language_code?: string;
  default_language_name?: string;
  default_currency_code?: string;
  default_currency_symbol?: string;
  languages_count?: number;
  currencies_count?: number;
  languages?: any[];
  currencies?: any[];

  stores?: Store[];
stores_count?: number;
}

export interface CreateTenantData {
  name: string;
  slug: string;
  domain?: string;
  subdomain?: string;
  subscription_plan_id?: number | null;
  tenant_type_id?: number | null;
  logo_url?: string;
  favicon_url?: string;
  primary_color?: string;
  secondary_color?: string;
  default_language_id?: number | null;
  default_currency_id?: number | null;
  contact_email?: string;
  contact_phone?: string;
  is_active?: boolean;
  trial_ends_at?: string | null;
  subscription_ends_at?: string | null;
  settings?: any;
}

export interface Store {
  id: number;
  tenant_id: number;
  name: string;
  slug: string;
  code?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  opening_hours?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateTenantData extends Partial<CreateTenantData> {}

export const tenantService = {
  async getTenants() {
    const response = await api.get<{ data: Tenant[] }>('/api/admin/tenants');
    return response.data.data;
  },

  async getTenantById(id: number) {
    const response = await api.get<{ data: Tenant }>(`/api/admin/tenants/${id}`);
    return response.data.data;
  },

  async createTenant(data: CreateTenantData) {
    const response = await api.post<{ message: string; data: Tenant }>(
      '/api/admin/tenants',
      data
    );
    return response.data;
  },

  async updateTenant(id: number, data: UpdateTenantData) {
    const response = await api.put<{ message: string; data: Tenant }>(
      `/api/admin/tenants/${id}`,
      data
    );
    return response.data;
  },

  async deleteTenant(id: number) {
    const response = await api.delete<{ message: string }>(`/api/admin/tenants/${id}`);
    return response.data;
  },

  async getTenantSubscriptionStatus(id: number) {
    const response = await api.get<{ data: any }>(
      `/api/admin/tenants/${id}/subscription-status`
    );
    return response.data.data;
  },
  async getTenantLanguages(tenantId: number) {
    const response = await api.get<{ data: any[] }>(
      `/api/admin/tenants/${tenantId}/languages`
    );
    return response.data.data;
  },

  async updateTenantLanguages(
    tenantId: number,
    languages: Array<{
      language_id: number;
      is_default: boolean;
      is_active: boolean;
    }>
  ) {
    const response = await api.put<{ message: string }>(
      `/api/admin/tenants/${tenantId}/languages`,
      { languages }
    );
    return response.data;
  },

  async getTenantCurrencies(tenantId: number) {
    const response = await api.get<{ data: any[] }>(
      `/api/admin/tenants/${tenantId}/currencies`
    );
    return response.data.data;
  },

  async updateTenantCurrencies(
    tenantId: number,
    currencies: Array<{
      currency_id: number;
      is_default: boolean;
      is_active: boolean;
    }>
  ) {
    const response = await api.put<{ message: string }>(
      `/api/admin/tenants/${tenantId}/currencies`,
      { currencies }
    );
    return response.data;
  },

  /**
   * Get stores for a tenant
   */
  async getTenantStores(tenantId: number) {
    const response = await api.get<{ data: Store[] }>(
      `/api/admin/tenants/${tenantId}/stores`
    );
    return response.data.data;
  },

  /**
   * Create store for a tenant
   */
  async createTenantStore(tenantId: number, data: any) {
    const response = await api.post<{ message: string; data: Store }>(
      `/api/admin/tenants/${tenantId}/stores`,
      data
    );
    return response.data;
  },

  /**
   * Update store for a tenant
   */
  async updateTenantStore(tenantId: number, storeId: number, data: any) {
    const response = await api.put<{ message: string; data: Store }>(
      `/api/admin/tenants/${tenantId}/stores/${storeId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete store for a tenant
   */
  async deleteTenantStore(tenantId: number, storeId: number) {
    const response = await api.delete<{ message: string }>(
      `/api/admin/tenants/${tenantId}/stores/${storeId}`
    );
    return response.data;
  },
};