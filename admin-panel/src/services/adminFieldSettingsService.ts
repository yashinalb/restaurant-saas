// src/services/adminFieldSettingsService.ts
import api from './api';
// @ts-ignore - service not yet created
import { ProductFieldSettings } from './tenantProductService-frontend';

/**
 * Admin service for managing tenant product field settings
 * Only accessible by Super Admin
 */
export const adminFieldSettingsService = {
  async getFieldSettings(tenantId: number) {
    const response = await api.get<{ data: ProductFieldSettings }>(
      `/api/admin/tenant-product-field-settings/${tenantId}`
    );
    return response.data.data;
  },

  async updateFieldSettings(tenantId: number, data: Partial<ProductFieldSettings>) {
    const response = await api.put<{ message: string; data: ProductFieldSettings }>(
      `/api/admin/tenant-product-field-settings/${tenantId}`,
      data
    );
    return response.data;
  },

  async resetFieldSettings(tenantId: number) {
    const response = await api.post<{ message: string; data: ProductFieldSettings }>(
      `/api/admin/tenant-product-field-settings/${tenantId}/reset`
    );
    return response.data;
  },
};