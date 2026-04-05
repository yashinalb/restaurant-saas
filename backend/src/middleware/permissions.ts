import { Response, NextFunction } from 'express';
import pool from '../config/database.js';
import { AuthRequest } from './auth.js';
import { TenantRequest } from './tenantContext.js';

interface PermissionRequest extends AuthRequest, TenantRequest {}

/**
 * Require Super Admin access (platform owner only)
 * Use this for platform management routes (languages, currencies, brands, etc.)
 */
export function requireSuperAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.admin?.is_super_admin) {
    res.status(403).json({ error: 'Super admin access required' });
    return;
  }
  next();
}

/**
 * Check if admin has a specific permission for the current tenant
 */
export function requirePermission(permissionName: string) {
  return async (
    req: PermissionRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const admin = req.admin;
      const tenant = req.tenant;

      if (!admin) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Super admins have all permissions
      if (admin.is_super_admin) {
        next();
        return;
      }

      if (!tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      // Get admin's role for this tenant
      const [accessRows] = await pool.query<any[]>(
        `SELECT role_id FROM admin_tenant_access 
         WHERE admin_user_id = ? AND tenant_id = ?`,
        [admin.id, tenant.id]
      );

      if (accessRows.length === 0) {
        res.status(403).json({ error: 'No access to this tenant' });
        return;
      }

      const roleId = accessRows[0].role_id;

      // Check if role has this permission
      const [permissionRows] = await pool.query<any[]>(
        `SELECT rp.* FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = ? AND p.name = ?`,
        [roleId, permissionName]
      );

      if (permissionRows.length > 0) {
        next();
        return;
      }

      // Check for direct permission override
      const [overrideRows] = await pool.query<any[]>(
        `SELECT ap.* FROM admin_permissions ap
         JOIN permissions p ON ap.permission_id = p.id
         WHERE ap.admin_user_id = ? 
         AND ap.tenant_id = ? 
         AND p.name = ? 
         AND ap.granted = 1`,
        [admin.id, tenant.id, permissionName]
      );

      if (overrideRows.length > 0) {
        next();
        return;
      }

      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permissionName 
      });
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Get all permissions for an admin user in a tenant
 */
export async function getAdminPermissions(
  adminId: bigint,
  tenantId: bigint
): Promise<string[]> {
  // Get role permissions
  const [rolePerms] = await pool.query<any[]>(
    `SELECT DISTINCT p.name
     FROM admin_tenant_access ata
     JOIN role_permissions rp ON ata.role_id = rp.role_id
     JOIN permissions p ON rp.permission_id = p.id
     WHERE ata.admin_user_id = ? AND ata.tenant_id = ?`,
    [adminId, tenantId]
  );

  const permissions = new Set(rolePerms.map((row: any) => row.name));

  // Get direct permission overrides
  const [overrides] = await pool.query<any[]>(
    `SELECT p.name, ap.granted
     FROM admin_permissions ap
     JOIN permissions p ON ap.permission_id = p.id
     WHERE ap.admin_user_id = ? AND ap.tenant_id = ?`,
    [adminId, tenantId]
  );

  // Apply overrides
  overrides.forEach((override: any) => {
    if (override.granted) {
      permissions.add(override.name);
    } else {
      permissions.delete(override.name);
    }
  });

  return Array.from(permissions);
}