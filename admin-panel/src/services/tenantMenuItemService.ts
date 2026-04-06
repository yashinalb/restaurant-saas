import api from './api';

export interface TenantMenuItemTranslation {
  language_id: number;
  name: string;
  slug?: string;
  description?: string;
  short_description?: string;
  language_code?: string;
  language_name?: string;
}

export interface TenantMenuItemPrice {
  id?: number;
  store_id: number | null;
  currency_id: number;
  price: number;
  weight_price_per_100g: number | null;
  is_active: boolean;
  currency_code?: string;
  currency_symbol?: string;
  store_name?: string;
}

export interface TenantMenuItemImage {
  id?: number;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface TenantMenuItem {
  id: number;
  tenant_menu_category_id: number | null;
  tenant_order_destination_id: number | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  is_weighted: boolean;
  vat_rate: number | null;
  is_combo: boolean;
  show_ingredients_website: boolean;
  show_ingredients_pos: boolean;
  show_ingredients_kiosk: boolean;
  show_addon_names_website: boolean;
  show_addon_names_pos: boolean;
  show_addon_names_kiosk: boolean;
  show_addon_prices_website: boolean;
  show_addon_prices_kiosk: boolean;
  show_on_website: boolean;
  show_on_pos: boolean;
  show_on_kiosk: boolean;
  created_at: string;
  updated_at: string;
  translations: TenantMenuItemTranslation[];
  prices: TenantMenuItemPrice[];
  images: TenantMenuItemImage[];
}

const tenantMenuItemService = {
  async getAll(filters?: Record<string, any>): Promise<TenantMenuItem[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const response = await api.get(`/api/tenant/menu-items?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<TenantMenuItem> {
    const response = await api.get(`/api/tenant/menu-items/${id}`);
    return response.data.data || response.data;
  },
  async create(data: Partial<TenantMenuItem>): Promise<TenantMenuItem> {
    const response = await api.post('/api/tenant/menu-items', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<TenantMenuItem>): Promise<TenantMenuItem> {
    const response = await api.put(`/api/tenant/menu-items/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/menu-items/${id}`);
  },
};

export default tenantMenuItemService;
