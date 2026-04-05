import apiClient from './api';

export interface TenantTypeTranslation {
  language_id: number;
  name: string;
  description?: string;
  language_code?: string;
  language_name?: string;
}

export interface TenantType {
  id: number;
  code: string;
  icon_url?: string;
  sort_order: number;
  is_active: boolean;
  tenant_count?: number;
  created_at: string;
  updated_at: string;
  translations: TenantTypeTranslation[];
  name?: string;
  description?: string;
}

export interface CreateTenantTypeData {
  code: string;
  icon_url?: string;
  sort_order?: number;
  is_active?: boolean;
  translations: TenantTypeTranslation[];
}

export interface UpdateTenantTypeData {
  code?: string;
  icon_url?: string;
  sort_order?: number;
  is_active?: boolean;
  translations?: TenantTypeTranslation[];
}

const tenantTypeService = {
  /**
   * Get all tenant types
   */
  async getAllTenantTypes(languageCode?: string): Promise<TenantType[]> {
    const params = languageCode ? { language: languageCode } : {};
    const response = await apiClient.get('/api/admin/tenant-types', { params });
    return response.data;
  },

  /**
   * Get tenant type by ID
   */
  async getTenantTypeById(id: number): Promise<TenantType> {
    const response = await apiClient.get(`/api/admin/tenant-types/${id}`);
    return response.data;
  },

  /**
   * Get tenant type by code
   */
  async getTenantTypeByCode(code: string): Promise<TenantType> {
    const response = await apiClient.get(`/api/admin/tenant-types/code/${code}`);
    return response.data;
  },

  /**
   * Create new tenant type
   */
  async createTenantType(data: CreateTenantTypeData): Promise<TenantType> {
    const response = await apiClient.post('/api/admin/tenant-types', data);
    return response.data;
  },

  /**
   * Update tenant type
   */
  async updateTenantType(id: number, data: UpdateTenantTypeData): Promise<TenantType> {
    const response = await apiClient.put(`/api/admin/tenant-types/${id}`, data);
    return response.data;
  },

  /**
   * Delete tenant type
   */
  async deleteTenantType(id: number): Promise<{ message: string }> {
    const response = await apiClient.delete(`/api/admin/tenant-types/${id}`);
    return response.data;
  },
};

export default tenantTypeService;