import api from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AdminUser {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  preferred_language_id?: number | null; // ✅ ADD THIS
  preferred_language_code?: string | null; // ✅ ADD THIS
  preferred_language_name?: string | null; // ✅ ADD THIS
  is_super_admin: boolean;
  is_active: boolean;
}

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  subdomain: string | null;
  domain: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  is_active: boolean;
  role_name?: string;
  role_display_name?: string;
}

export interface LoginResponse {
  message: string;
  data: {
    admin: AdminUser;
    accessToken: string;
    refreshToken: string;
  };
}

export interface ProfileResponse {
  data: {
    admin: AdminUser;
    tenants: Tenant[];
  };
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/api/auth/login', credentials);
    return response.data;
  },

  async getProfile(): Promise<ProfileResponse> {
    const response = await api.get<ProfileResponse>('/api/auth/me');
    return response.data;
  },

  async updateLanguagePreference(languageId: number | null): Promise<void> {
    await api.put('/api/auth/language-preference', { language_id: languageId });
  },

  async logout(refreshToken?: string): Promise<void> {
    await api.post('/api/auth/logout', { refreshToken });
  },
  async forgotPassword(email: string) {
    const response = await api.post('/api/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token: string, newPassword: string) {
    const response = await api.post('/api/auth/reset-password', {
      token,
      newPassword
    });
    return response.data;
  },
};
