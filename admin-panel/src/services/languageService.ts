import api from './api';

export interface Language {
  id: number;
  code: string;
  name: string;
  native_name: string;
  is_rtl: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  tenant_count?: number;
  flag_emoji?: string | null; // ✅ add this
}

export interface CreateLanguageData {
  code: string;
  name: string;
  native_name: string;
  is_rtl?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateLanguageData {
  code?: string;
  name?: string;
  native_name?: string;
  is_rtl?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

export const languageService = {
  async getActiveLanguages() {
    const response = await api.get<{ data: Language[] }>('/api/admin/languages/active');
    return response.data.data;
  },
  async getLanguages() {
    const response = await api.get<{ data: Language[] }>('/api/admin/languages');
    return response.data.data;
  },

  async getLanguageById(id: number) {
    const response = await api.get<{ data: Language }>(`/api/admin/languages/${id}`);
    return response.data.data;
  },

  async createLanguage(data: CreateLanguageData) {
    const response = await api.post<{ message: string; data: Language }>(
      '/api/admin/languages',
      data
    );
    return response.data;
  },

  async updateLanguage(id: number, data: UpdateLanguageData) {
    const response = await api.put<{ message: string; data: Language }>(
      `/api/admin/languages/${id}`,
      data
    );
    return response.data;
  },

  async deleteLanguage(id: number) {
    const response = await api.delete<{ message: string }>(`/api/admin/languages/${id}`);
    return response.data;
  },

  async reorderLanguages(orderedIds: number[]) {
    const response = await api.put<{ message: string }>('/api/admin/languages/reorder', {
      ordered_ids: orderedIds,
    });
    return response.data;
  },
};
