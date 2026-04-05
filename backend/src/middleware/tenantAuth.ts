import { Response, NextFunction } from 'express';
import pool from '../config/database.js';
import { AuthRequest } from './auth.js';
import { Tenant } from '../types/index.js';

/**
 * Extended request interface with both admin and tenant context
 */
export interface TenantAuthRequest extends AuthRequest {
  tenant?: Tenant;
  adminTenantAccess?: {
    id: number;
    admin_user_id: number;
    tenant_id: number;
    role_id: number;
  };
}

/**
 * Load tenant context for tenant-specific routes
 * Works for both super admin and tenant admin
 */
export async function loadTenantContext(
  req: TenantAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Must be authenticated first
    if (!req.admin) {
      res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    let tenantId: number;

    // Get tenant ID from header or query
    const headerTenantId = req.headers['x-tenant-id'] as string;
    const queryTenantId = req.query.tenant_id as string;
    tenantId = Number(headerTenantId || queryTenantId);

    if (!tenantId) {
      res.status(400).json({ 
        error: 'Tenant ID required',
        message: 'Provide tenant_id via X-Tenant-ID header or query parameter',
        code: 'TENANT_ID_REQUIRED'
      });
      return;
    }

    // Super admin: can access any tenant
    if (req.admin.is_super_admin) {
      // Just load the tenant, no access check needed
      const [tenantRows] = await pool.query<any[]>(
        'SELECT * FROM tenants WHERE id = ? AND is_active = 1',
        [tenantId]
      );

      if (tenantRows.length === 0) {
        res.status(404).json({ 
          error: 'Tenant not found',
          code: 'TENANT_NOT_FOUND'
        });
        return;
      }

      req.tenant = tenantRows[0] as Tenant;
      next();
      return;
    }

    // Regular admin: check admin_tenant_access
    const [accessRows] = await pool.query<any[]>(
      `SELECT ata.*, t.*
       FROM admin_tenant_access ata
       JOIN tenants t ON ata.tenant_id = t.id
       WHERE ata.admin_user_id = ? 
       AND ata.tenant_id = ? 
       AND t.is_active = 1`,
      [req.admin.id, tenantId]
    );

    if (accessRows.length === 0) {
      res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have access to this tenant',
        code: 'TENANT_ACCESS_DENIED'
      });
      return;
    }

    const accessData = accessRows[0];

    // Store tenant and access info
    req.tenant = {
      id: accessData.id,
      name: accessData.name,
      slug: accessData.slug,
      domain: accessData.domain,
      subdomain: accessData.subdomain,
      subscription_plan_id: accessData.subscription_plan_id,
      tenant_type_id: accessData.tenant_type_id,
      logo_url: accessData.logo_url,
      favicon_url: accessData.favicon_url,
      primary_color: accessData.primary_color,
      secondary_color: accessData.secondary_color,
      default_language_id: accessData.default_language_id,
      default_currency_id: accessData.default_currency_id,
      contact_email: accessData.contact_email,
      contact_phone: accessData.contact_phone,
      is_active: accessData.is_active,
      trial_ends_at: accessData.trial_ends_at,
      subscription_ends_at: accessData.subscription_ends_at,
      settings: accessData.settings,
      created_at: accessData.created_at,
      updated_at: accessData.updated_at
    } as Tenant;

    req.adminTenantAccess = {
      id: accessData.id,
      admin_user_id: accessData.admin_user_id,
      tenant_id: accessData.tenant_id,
      role_id: accessData.role_id
    };

    next();
  } catch (error) {
    console.error('Load tenant context error:', error);
    res.status(500).json({ 
      error: 'Failed to load tenant context',
      code: 'TENANT_CONTEXT_ERROR'
    });
  }
}

/**
 * Require specific permission for tenant data access
 * Use this for tenant brands, categories, products routes
 */
export function requireTenantPermission(permissionName: string) {
  return async (
    req: TenantAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      if (!req.tenant) {
        res.status(400).json({ 
          error: 'Tenant context required',
          code: 'TENANT_CONTEXT_REQUIRED'
        });
        return;
      }

      // Super admin has all permissions
      if (req.admin.is_super_admin) {
        next();
        return;
      }

      // Check if admin has this permission via their role
      if (!req.adminTenantAccess) {
        res.status(403).json({ 
          error: 'No access to this tenant',
          code: 'NO_TENANT_ACCESS'
        });
        return;
      }

      const roleId = req.adminTenantAccess.role_id;

      // Check role permissions
      const [rolePerms] = await pool.query<any[]>(
        `SELECT rp.* FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = ? AND p.name = ?`,
        [roleId, permissionName]
      );

      if (rolePerms.length > 0) {
        next();
        return;
      }

      // Check direct permission overrides
      const [overrides] = await pool.query<any[]>(
        `SELECT ap.* FROM admin_permissions ap
         JOIN permissions p ON ap.permission_id = p.id
         WHERE ap.admin_user_id = ? 
         AND ap.tenant_id = ? 
         AND p.name = ? 
         AND ap.granted = 1`,
        [req.admin.id, req.tenant.id, permissionName]
      );

      if (overrides.length > 0) {
        next();
        return;
      }

      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permissionName,
        message: `You need '${permissionName}' permission to perform this action`,
        code: 'INSUFFICIENT_PERMISSIONS' // ✅ Won't trigger logout
      });
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ 
        error: 'Permission check failed',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
}

/**
 * Get all permissions for the current admin in current tenant
 * Utility function for controllers
 */
export async function getAdminTenantPermissions(
  req: TenantAuthRequest
): Promise<string[]> {
  if (!req.admin || !req.tenant) {
    return [];
  }

  // Super admin has all permissions
  if (req.admin.is_super_admin) {
    return ['*']; // Wildcard for all permissions
  }

  if (!req.adminTenantAccess) {
    return [];
  }

  // Get role permissions
  const [rolePerms] = await pool.query<any[]>(
    `SELECT DISTINCT p.name
     FROM role_permissions rp
     JOIN permissions p ON rp.permission_id = p.id
     WHERE rp.role_id = ?`,
    [req.adminTenantAccess.role_id]
  );

  const permissions = new Set(rolePerms.map((row: any) => row.name));

  // Get direct permission overrides
  const [overrides] = await pool.query<any[]>(
    `SELECT p.name, ap.granted
     FROM admin_permissions ap
     JOIN permissions p ON ap.permission_id = p.id
     WHERE ap.admin_user_id = ? AND ap.tenant_id = ?`,
    [req.admin.id, req.tenant.id]
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