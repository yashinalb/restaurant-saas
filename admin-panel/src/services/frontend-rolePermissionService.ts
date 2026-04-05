import api from './api';

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  is_system_role: boolean;
  is_active: boolean;
  user_count?: number;
  created_at: string;
  updated_at: string;
  permissions?: Permission[];
}

export interface Permission {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  module: string;
  is_active: boolean;
  created_at: string;
}

export interface CreatePermissionData {
  name: string;
  display_name: string;
  description?: string;
  module: string;
  is_active?: boolean;
}

export interface UpdatePermissionData {
  name?: string;
  display_name?: string;
  description?: string;
  module?: string;
  is_active?: boolean;
}

export interface CreateRoleData {
  name: string;
  display_name: string;
  description?: string;
  is_system_role?: boolean;
  is_active?: boolean;
  permission_ids?: number[];
}

export interface UpdateRoleData {
  name?: string;
  display_name?: string;
  description?: string;
  is_active?: boolean;
  permission_ids?: number[];
}

export const rolePermissionService = {
  // Roles
  async getRoles() {
    const response = await api.get<{ data: Role[] }>('/api/admin/roles');
    return response.data.data;
  },

  async getRoleById(id: number) {
    const response = await api.get<{ data: Role }>(`/api/admin/roles/${id}`);
    return response.data.data;
  },

  async createRole(data: CreateRoleData) {
    const response = await api.post<{ message: string; data: Role }>(
      '/api/admin/roles',
      data
    );
    return response.data;
  },

  async updateRole(id: number, data: UpdateRoleData) {
    const response = await api.put<{ message: string; data: Role }>(
      `/api/admin/roles/${id}`,
      data
    );
    return response.data;
  },

  async deleteRole(id: number) {
    const response = await api.delete<{ message: string }>(`/api/admin/roles/${id}`);
    return response.data;
  },

  // Permissions
  async getPermissions() {
    const response = await api.get<{ data: Permission[] }>('/api/admin/permissions');
    return response.data.data;
  },

  async getPermissionsGrouped() {
    const response = await api.get<{ data: Record<string, Permission[]> }>(
      '/api/admin/permissions/grouped'
    );
    return response.data.data;
  },

  async createPermission(data: CreatePermissionData) {
    const response = await api.post<{ message: string; data: Permission }>(
      '/api/admin/permissions',
      data
    );
    return response.data;
  },

  async updatePermission(id: number, data: UpdatePermissionData) {
    const response = await api.put<{ message: string; data: Permission }>(
      `/api/admin/permissions/${id}`,
      data
    );
    return response.data;
  },

  async deletePermission(id: number) {
    const response = await api.delete<{ message: string }>(`/api/admin/permissions/${id}`);
    return response.data;
  },
};
