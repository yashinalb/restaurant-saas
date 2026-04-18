import api from './api';

export interface PosMenuCategory {
  id: number;
  slug: string;
  image_url: string | null;
  sort_order: number;
  item_count: number;
  translations: Array<{ language_code: string; name: string }>;
}

export interface PosMenuItem {
  id: number;
  tenant_menu_category_id: number | null;
  name: string;
  is_weighted: boolean | number;
  is_combo: boolean | number;
  is_active: boolean | number;
  image_url: string | null;
  primary_image_url: string | null;
  vat_rate: number | string | null;
  price: number | string | null;
  weight_price_per_100g: number | string | null;
  addon_count: number;
  requires_customization: boolean;
  translations: Array<{ language_code: string; name: string; description?: string | null }>;
}

const posMenuService = {
  async getCategories(store_id: number): Promise<PosMenuCategory[]> {
    const response = await api.get('/api/tenant/pos/menu/categories', { params: { store_id } });
    return response.data.data || [];
  },
  async getItems(params: { store_id: number; currency_id: number; category_id?: number | null; search?: string }): Promise<PosMenuItem[]> {
    const query: Record<string, any> = {
      store_id: params.store_id,
      currency_id: params.currency_id,
    };
    if (params.category_id) query.category_id = params.category_id;
    if (params.search && params.search.trim()) query.search = params.search.trim();
    const response = await api.get('/api/tenant/pos/menu/items', { params: query });
    return response.data.data || [];
  },
  async quickAdd(orderId: number, data: { tenant_menu_item_id: number; quantity?: number; notes?: string | null }): Promise<{ order_item_id: number }> {
    const response = await api.post(`/api/tenant/pos/orders/${orderId}/quick-add`, data);
    return response.data.data || response.data;
  },
};

export default posMenuService;
