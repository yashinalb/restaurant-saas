import api from './api';

export interface TenantUser {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  preferred_language_id: number | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  role_id: number;
  role_name: string;
  role_display_name: string;
}

export interface UserInvitation {
  id: number;
  email: string;
  expires_at: string;
  created_at: string;
  role_name: string;
  role_display_name: string;
  invited_by_first_name: string | null;
  invited_by_last_name: string | null;
  invited_by_email: string;
}

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description: string;
}

export interface InviteUserData {
  email: string;
  role_id: number;
  first_name?: string;
  last_name?: string;
}

export interface AcceptInvitationData {
  token: string;
  password: string;
  first_name: string;
  last_name: string;
}

export const tenantUserService = {
  // Get all users in tenant
  async getTenantUsers() {
    const response = await api.get<{ data: TenantUser[] }>('/api/tenant/users');
    return response.data.data;
  },

  // Get user by ID
  async getTenantUserById(id: number) {
    const response = await api.get<{ data: TenantUser }>(`/api/tenant/users/${id}`);
    return response.data.data;
  },

  // Invite user
  async inviteUser(data: InviteUserData) {
    const response = await api.post('/api/tenant/users/invite', data);
    return response.data;
  },

  // Get pending invitations
  async getPendingInvitations() {
    const response = await api.get<{ data: UserInvitation[] }>('/api/tenant/users/invitations');
    return response.data.data;
  },

  // Cancel invitation
  async cancelInvitation(invitationId: number) {
    const response = await api.delete(`/api/tenant/users/invitations/${invitationId}`);
    return response.data;
  },

  // Update user
  async updateTenantUser(
    id: number,
    data: {
      first_name?: string;
      last_name?: string;
      avatar_url?: string;
      preferred_language_id?: number | null;
      is_active?: boolean;
    }
  ) {
    const response = await api.put(`/api/tenant/users/${id}`, data);
    return response.data;
  },

  // Update user role
  async updateUserRole(id: number, roleId: number) {
    const response = await api.put(`/api/tenant/users/${id}/role`, { role_id: roleId });
    return response.data;
  },

  // Remove user
  async removeUser(id: number) {
    const response = await api.delete(`/api/tenant/users/${id}`);
    return response.data;
  },

  // Get available roles
  async getAvailableRoles() {
    const response = await api.get<{ data: Role[] }>('/api/tenant/users/roles');
    return response.data.data;
  },

  // Accept invitation (public, no auth)
  async acceptInvitation(data: AcceptInvitationData) {
    const response = await api.post('/api/auth/accept-invitation', data);
    return response.data;
  },
};