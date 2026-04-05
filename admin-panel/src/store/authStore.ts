import { create } from 'zustand';
import { authService, AdminUser, Tenant } from '../services/authService';

interface AuthState {
  user: AdminUser | null;
  tenants: Tenant[];
  selectedTenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadProfile: () => Promise<void>;
  selectTenant: (tenant: Tenant | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tenants: [],
  selectedTenant: null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await authService.login({ email, password });
      
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.admin));
      
      // Load full profile with tenants
      await get().loadProfile();
      
      set({ 
        user: response.data.admin,
        isAuthenticated: true,
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('selectedTenantId');
      
      set({ 
        user: null,
        tenants: [],
        selectedTenant: null,
        isAuthenticated: false 
      });
    }
  },

loadProfile: async () => {
  try {
    const response = await authService.getProfile();
    const tenants = response.data.tenants;

    set({ user: response.data.admin, tenants, isAuthenticated: true });

    // ✅ Set language from user preference
    const preferredLanguageCode = response.data.admin.preferred_language_code;
    if (preferredLanguageCode) {
      // Dynamically import i18n to avoid circular dependency
      import('../locales/i18n').then((i18nModule) => {
        i18nModule.default.changeLanguage(preferredLanguageCode);
      });
    }

    const selectedTenantId = localStorage.getItem('selectedTenantId');
    if (selectedTenantId) {
      const tenant = tenants.find(t => t.id === parseInt(selectedTenantId));
      if (tenant) set({ selectedTenant: tenant });
    } else if (tenants.length > 0) {
      get().selectTenant(tenants[0]);
    }
  } catch (error) {
    // hard reset auth state
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedTenantId');

    set({
      user: null,
      tenants: [],
      selectedTenant: null,
      isAuthenticated: false,
    });
  }
},


  selectTenant: (tenant) => {
    if (tenant) {
      localStorage.setItem('selectedTenantId', tenant.id.toString());
    } else {
      localStorage.removeItem('selectedTenantId');
    }
    set({ selectedTenant: tenant });
  },
}));
