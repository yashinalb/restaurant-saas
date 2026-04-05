import { Response } from 'express';
import { AdminUserService } from '../services/adminUserService.js';
import { AuthRequest } from '../middleware/auth.js';

export class AdminUserController {
  /**
   * GET /api/admin/admin-users
   * Get all admin users (superadmin only)
   */
  static async getAllAdminUsers(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const users = await AdminUserService.getAllAdminUsers();
      res.json({ data: users });
    } catch (error: any) {
      console.error('Get admin users error:', error);
      res.status(500).json({ error: 'Failed to get admin users' });
    }
  }

  /**
   * GET /api/admin/admin-users/:id
   * Get admin user by ID
   */
  static async getAdminUserById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const user = await AdminUserService.getAdminUserById(userId);
      res.json({ data: user });
    } catch (error: any) {
      console.error('Get admin user error:', error);
      if (error.message === 'Admin user not found') {
        res.status(404).json({ error: 'Admin user not found' });
      } else {
        res.status(500).json({ error: 'Failed to get admin user' });
      }
    }
  }

  /**
   * POST /api/admin/admin-users
   * Create admin user (superadmin only)
   */
  static async createAdminUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        email,
        password,
        first_name,
        last_name,
        avatar_url,
        is_super_admin,
        is_active,
      } = req.body;

      // Validation
      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      if (!password) {
        res.status(400).json({ error: 'Password is required' });
        return;
      }

      if (password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters' });
        return;
      }

      const user = await AdminUserService.createAdminUser({
        email,
        password,
        first_name,
        last_name,
        avatar_url,
        is_super_admin,
        is_active,
      });

      res.status(201).json({
        message: 'Admin user created successfully',
        data: user,
      });
    } catch (error: any) {
      console.error('Create admin user error:', error);
      if (error.message === 'Email already exists') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create admin user' });
      }
    }
  }

  /**
 * PUT /api/auth/language-preference
 * Update own language preference (authenticated user)
 */
static async updateOwnLanguage(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.admin) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { language_id } = req.body;

    // Allow null to clear preference
    if (language_id !== null && language_id !== undefined) {
      const languageIdNum = parseInt(language_id);
      if (isNaN(languageIdNum)) {
        res.status(400).json({ error: 'Invalid language ID' });
        return;
      }
    }

    const result = await AdminUserService.updateOwnLanguage(
      Number(req.admin.id),
      language_id === null ? null : parseInt(language_id)
    );

    res.json(result);
  } catch (error: any) {
    console.error('Update language preference error:', error);
    if (error.message === 'Language not found or inactive') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update language preference' });
    }
  }
}

  /**
   * PUT /api/admin/admin-users/:id
   * Update admin user
   */
 // Also update the updateAdminUser to handle preferred_language_id
static async updateAdminUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const {
      email,
      password,
      first_name,
      last_name,
      avatar_url,
      preferred_language_id, // ✅ ADD THIS
      is_super_admin,
      is_active,
    } = req.body;

    // Validate password length if provided
    if (password && password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const user = await AdminUserService.updateAdminUser(userId, {
      email,
      password,
      first_name,
      last_name,
      avatar_url,
      preferred_language_id, // ✅ ADD THIS
      is_super_admin,
      is_active,
    });

    res.json({
      message: 'Admin user updated successfully',
      data: user,
    });
  } catch (error: any) {
    console.error('Update admin user error:', error);
    if (error.message === 'Admin user not found') {
      res.status(404).json({ error: 'Admin user not found' });
    } else if (error.message === 'Email already exists') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update admin user' });
    }
  }
}

  /**
   * DELETE /api/admin/admin-users/:id
   * Delete admin user
   */
  static async deleteAdminUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      // Prevent users from deleting themselves
      if (typeof req.admin?.id !== 'undefined' && Number(req.admin.id) === userId) {
        res.status(400).json({ error: 'Cannot delete your own account' });
        return;
      }

      const result = await AdminUserService.deleteAdminUser(userId);
      res.json(result);
    } catch (error: any) {
      console.error('Delete admin user error:', error);
      if (error.message === 'Admin user not found') {
        res.status(404).json({ error: 'Admin user not found' });
      } else if (error.message === 'Cannot delete the last active super admin') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete admin user' });
      }
    }
  }

  /**
   * POST /api/admin/admin-users/:id/grant-access
   * Grant tenant access to admin user
   */
  static async grantTenantAccess(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const { tenant_id, role_id } = req.body;

      if (!tenant_id) {
        res.status(400).json({ error: 'tenant_id is required' });
        return;
      }

      if (!role_id) {
        res.status(400).json({ error: 'role_id is required' });
        return;
      }

      const result = await AdminUserService.grantTenantAccess({
        admin_user_id: userId,
        tenant_id,
        role_id,
      });

      res.json(result);
    } catch (error: any) {
      console.error('Grant tenant access error:', error);
      if (
        error.message === 'Admin user not found' ||
        error.message === 'Tenant not found' ||
        error.message === 'Role not found or inactive'
      ) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to grant tenant access' });
      }
    }
  }

  /**
   * DELETE /api/admin/admin-users/:id/revoke-access/:tenantId
   * Revoke tenant access from admin user
   */
  static async revokeTenantAccess(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);

      if (isNaN(userId) || isNaN(tenantId)) {
        res.status(400).json({ error: 'Invalid user ID or tenant ID' });
        return;
      }

      const result = await AdminUserService.revokeTenantAccess(userId, tenantId);
      res.json(result);
    } catch (error: any) {
      console.error('Revoke tenant access error:', error);
      if (error.message === 'Tenant access not found') {
        res.status(404).json({ error: 'Tenant access not found' });
      } else {
        res.status(500).json({ error: 'Failed to revoke tenant access' });
      }
    }
  }

  /**
   * GET /api/admin/admin-users/:id/permissions/:tenantId
   * Get admin user permissions for a tenant
   */
  static async getAdminPermissions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);

      if (isNaN(userId) || isNaN(tenantId)) {
        res.status(400).json({ error: 'Invalid user ID or tenant ID' });
        return;
      }

      const permissions = await AdminUserService.getAdminPermissions(userId, tenantId);
      res.json({ data: permissions });
    } catch (error: any) {
      console.error('Get admin permissions error:', error);
      if (error.message === 'Admin user not found') {
        res.status(404).json({ error: 'Admin user not found' });
      } else {
        res.status(500).json({ error: 'Failed to get admin permissions' });
      }
    }
  }
}
