// src/services/tenantDataService.ts
import api from './api';

export interface Language {
  id: number;
  code: string;
  name: string;
  native_name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  is_default?: boolean;
  tenant_is_active?: boolean;
  flag_emoji?: string | null; // ✅ add this
}

export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_default?: boolean;
  tenant_is_active?: boolean;
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

export interface UnitType {
  id: number;
  tenant_id: number;
  code: string;
  category: string;
  is_active: boolean;
  name?: string; // From translation
  name_short?: string;
  name_long?: string;
}

export const tenantDataService = {
  /**
   * Get languages configured for current tenant
   * Use this in tenant forms instead of admin languageService
   */
  async getTenantLanguages() {
    const response = await api.get<{ data: Language[] }>('/api/tenant/languages');
    return response.data.data;
  },

  /**
   * Get currencies configured for current tenant
   * Use this in tenant forms instead of admin currencyService
   */
  async getTenantCurrencies() {
    const response = await api.get<{ data: Currency[] }>('/api/tenant/currencies');
    return response.data.data;
  },

  /**
   * Get stores configured for current tenant
   * Use this in pricing and inventory forms
   */
  async getTenantStores() {
    const response = await api.get<{ data: Store[] }>('/api/tenant/stores');
    return response.data.data;
  },

  /**
   * Get unit types configured for current tenant
   * Use this in product pricing and forms for unit pricing
   */
  async getTenantUnitTypes() {
    const response = await api.get<{ data: UnitType[] }>('/api/tenant/unit-types');
    return response.data.data;
  },

  async getTenantCategories() {
    const response = await api.get<{ data: any[] }>('/api/tenant/categories');
    return response.data.data;
  },

  async getTenantProducts() {
    const response = await api.get<{ data: any[] }>('/api/tenant/products');
    return response.data.data;
  },
};

export default tenantDataService;