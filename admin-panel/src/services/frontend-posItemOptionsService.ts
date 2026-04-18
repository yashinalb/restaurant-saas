import api from './api';

export interface PosAddonOption {
  id: number;
  name: string;
  translations: Array<{ language_code: string; name: string }>;
  price: number;
  is_default: boolean;
  is_required: boolean;
  max_quantity: number;
  sort_order: number;
}

export interface PosAddonGroup {
  tenant_addon_type_id: number;
  code: string;
  name: string;
  translations: Array<{ language_code: string; name: string }>;
  is_portion: boolean;
  addons: PosAddonOption[];
}

export interface PosItemIngredient {
  id: number;
  name: string;
  translations: Array<{ language_code: string; name: string }>;
  is_removable: boolean;
}

export interface PosItemOptions {
  item: {
    id: number;
    name: string;
    translations: Array<{ language_code: string; name: string; description?: string }>;
    is_weighted: boolean;
    is_combo: boolean;
    vat_rate: number | null;
    base_price: number;
    weight_price_per_100g: number | null;
    image_url: string | null;
  };
  addon_groups: PosAddonGroup[];
  ingredients: PosItemIngredient[];
  combo_items: any[];
}

export interface SelectedAddonPayload {
  tenant_addon_id: number;
  quantity?: number;
}

export interface AddItemPayload {
  tenant_menu_item_id: number;
  quantity?: number;
  weight_grams?: number | null;
  selected_addons?: SelectedAddonPayload[];
  removed_ingredient_ids?: number[];
  notes?: string | null;
}

const posItemOptionsService = {
  async getOptions(itemId: number, params: { store_id: number; currency_id: number }): Promise<PosItemOptions> {
    const response = await api.get(`/api/tenant/pos/menu/items/${itemId}/options`, { params });
    return response.data.data;
  },
  async addItem(orderId: number, data: AddItemPayload): Promise<{ order_item_id: number }> {
    const response = await api.post(`/api/tenant/pos/orders/${orderId}/add-item`, data);
    return response.data.data || response.data;
  },
};

export default posItemOptionsService;
