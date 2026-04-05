import api from './api';

export interface Store {
  id: number;
  tenant_id: number;
  name: string;
  slug: string;
  code: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country_code: string | null;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  opening_hours: any | null;
  table_count: number;
  kitchen_printer_ip: string | null;
  bar_printer_ip: string | null;
  receipt_printer_ip: string | null;
  kds_enabled: boolean;
  kiosk_enabled: boolean;
  online_ordering_enabled: boolean;
  qr_ordering_enabled: boolean;
  default_tax_rate: number;
  service_charge_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreFormData {
  name: string;
  slug: string;
  code?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country_code?: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  opening_hours?: any;
  table_count?: number;
  kitchen_printer_ip?: string;
  bar_printer_ip?: string;
  receipt_printer_ip?: string;
  kds_enabled?: boolean;
  kiosk_enabled?: boolean;
  online_ordering_enabled?: boolean;
  qr_ordering_enabled?: boolean;
  default_tax_rate?: number;
  service_charge_rate?: number;
  is_active?: boolean;
}

export const storeService = {
  async getAll(filters?: { is_active?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
    const response = await api.get<{ data: Store[] }>(`/api/tenant/stores?${params.toString()}`);
    return response.data.data;
  },

  async getById(id: number) {
    const response = await api.get<{ data: Store }>(`/api/tenant/stores/${id}`);
    return response.data.data;
  },

  async create(data: StoreFormData) {
    const response = await api.post<{ data: Store }>('/api/tenant/stores', data);
    return response.data.data;
  },

  async update(id: number, data: Partial<StoreFormData>) {
    const response = await api.put<{ data: Store }>(`/api/tenant/stores/${id}`, data);
    return response.data.data;
  },

  async delete(id: number) {
    await api.delete(`/api/tenant/stores/${id}`);
  },
};
