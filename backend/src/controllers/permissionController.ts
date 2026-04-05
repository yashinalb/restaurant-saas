import { Response } from 'express';
import { TenantAuthRequest, getAdminTenantPermissions } from '../middleware/tenantAuth.js';

export class PermissionController {
  /**
   * GET /api/tenant/permissions
   * Get current user's permissions for current tenant
   */
  static async getMyPermissions(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.admin) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Super admin has all permissions
      if (req.admin.is_super_admin) {
        res.json({ 
          data: { 
            permissions: ['*'],
            is_super_admin: true
          } 
        });
        return;
      }

      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      // Get permissions for this tenant
      const permissions = await getAdminTenantPermissions(req);

      res.json({ 
        data: { 
          permissions,
          is_super_admin: false
        } 
      });
    } catch (error: any) {
      console.error('Get permissions error:', error);
      res.status(500).json({ error: 'Failed to get permissions' });
    }
  }
}
