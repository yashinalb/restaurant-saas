import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '@/services/api';

export interface UserPermissions {
  permissions: string[];
  isSuperAdmin: boolean;
}

/**
 * Hook to check if user has specific permission
 */
export function usePermissions() {
  const { user, selectedTenant } = useAuthStore();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, [selectedTenant?.id, user?.id]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      
      // Super admin has all permissions
      if (user?.is_super_admin) {
        setPermissions(['*']); // Wildcard for all permissions
        setLoading(false);
        return;
      }

      // Load tenant-specific permissions
      if (selectedTenant?.id) {
        const response = await api.get<{ data: { permissions: string[] } }>(
          `/api/tenant/permissions`
        );
        setPermissions(response.data.data.permissions);
      } else {
        setPermissions([]);
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (user?.is_super_admin) return true;
    if (permissions.includes('*')) return true;
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList: string[]): boolean => {
    if (user?.is_super_admin) return true;
    if (permissions.includes('*')) return true;
    return permissionList.some(p => permissions.includes(p));
  };

  const hasAllPermissions = (permissionList: string[]): boolean => {
    if (user?.is_super_admin) return true;
    if (permissions.includes('*')) return true;
    return permissionList.every(p => permissions.includes(p));
  };

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSuperAdmin: user?.is_super_admin || false,
  };
}
