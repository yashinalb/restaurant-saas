import api from './api';

export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number | string; // Can come as string from DB
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tenant_count?: number;
}

export interface CreateCurrencyData {
  code: string;
  name: string;
  symbol: string;
  exchange_rate?: number;
  is_active?: boolean;
}

export interface UpdateCurrencyData {
  code?: string;
  name?: string;
  symbol?: string;
  exchange_rate?: number;
  is_active?: boolean;
}

export const currencyService = {
  async getCurrencies() {
    const response = await api.get<{ data: Currency[] }>('/api/admin/currencies');
    return response.data.data;
  },

  async getCurrencyById(id: number) {
    const response = await api.get<{ data: Currency }>(`/api/admin/currencies/${id}`);
    return response.data.data;
  },

  async createCurrency(data: CreateCurrencyData) {
    const response = await api.post<{ message: string; data: Currency }>(
      '/api/admin/currencies',
      data
    );
    return response.data;
  },

  async updateCurrency(id: number, data: UpdateCurrencyData) {
    const response = await api.put<{ message: string; data: Currency }>(
      `/api/admin/currencies/${id}`,
      data
    );
    return response.data;
  },

  async deleteCurrency(id: number) {
    const response = await api.delete<{ message: string }>(`/api/admin/currencies/${id}`);
    return response.data;
  },

  async updateExchangeRates(rates: { code: string; rate: number }[]) {
    const response = await api.put<{ message: string }>('/api/admin/currencies/exchange-rates', {
      rates,
    });
    return response.data;
  },
};