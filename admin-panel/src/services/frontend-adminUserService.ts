import api from './api';

export interface AdminUser {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  is_super_admin: boolean;
  is_active: boolean;
  last_login_at: string | null;
  tenant_count?: number;
  created_at: string;
  updated_at: string;
  tenant_access?: TenantAccess[];
}

export interface TenantAccess {
  id: number;
  tenant_id: number;
  role_id: number;
  tenant_name: string;
  tenant_slug: string;
  role_name: string;
  role_display_name: string;
}

export interface CreateAdminUserData {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  is_super_admin?: boolean;
  is_active?: boolean;
}

export interface UpdateAdminUserData {
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  is_super_admin?: boolean;
  is_active?: boolean;
}

export interface GrantAccessData {
  tenant_id: number;
  role_id: number;
}

export interface Permission {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  module: string;
  is_active: boolean;
}

export const adminUserService = {
  // Admin Users
  async getAdminUsers() {
    const response = await api.get<{ data: AdminUser[] }>('/api/admin/admin-users');
    return response.data.data;
  },

  async getAdminUserById(id: number) {
    const response = await api.get<{ data: AdminUser }>(`/api/admin/admin-users/${id}`);
    return response.data.data;
  },

  async createAdminUser(data: CreateAdminUserData) {
    const response = await api.post<{ message: string; data: AdminUser }>(
      '/api/admin/admin-users',
      data
    );
    return response.data;
  },

  async updateAdminUser(id: number, data: UpdateAdminUserData) {
    const response = await api.put<{ message: string; data: AdminUser }>(
      `/api/admin/admin-users/${id}`,
      data
    );
    return response.data;
  },

  async deleteAdminUser(id: number) {
    const response = await api.delete<{ message: string }>(`/api/admin/admin-users/${id}`);
    return response.data;
  },

  // Tenant Access
  async grantTenantAccess(userId: number, data: GrantAccessData) {
    const response = await api.post<{ message: string }>(
      `/api/admin/admin-users/${userId}/grant-access`,
      data
    );
    return response.data;
  },

  async revokeTenantAccess(userId: number, tenantId: number) {
    const response = await api.delete<{ message: string }>(
      `/api/admin/admin-users/${userId}/revoke-access/${tenantId}`
    );
    return response.data;
  },

  async getAdminPermissions(userId: number, tenantId: number) {
    const response = await api.get<{ data: Permission[] }>(
      `/api/admin/admin-users/${userId}/permissions/${tenantId}`
    );
    return response.data.data;
  },
};
