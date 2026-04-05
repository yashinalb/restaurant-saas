import { Response } from 'express';
import { TenantAdminUserService } from '../services/tenantAdminUserService.js';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';

export class TenantAdminUserController {
  /**
   * GET /api/tenant/users
   * Get all users in tenant
   */
  static async getTenantUsers(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      const users = await TenantAdminUserService.getTenantUsers(Number(req.tenant.id));
      res.json({ data: users });
    } catch (error: any) {
      console.error('Get tenant users error:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  }

  /**
   * GET /api/tenant/users/:id
   * Get user by ID
   */
  static async getTenantUserById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const user = await TenantAdminUserService.getTenantUserById(Number(req.tenant.id), userId);
      res.json({ data: user });
    } catch (error: any) {
      console.error('Get tenant user error:', error);
      if (error.message === 'User not found') {
        res.status(404).json({ error: 'User not found' });
      } else {
        res.status(500).json({ error: 'Failed to get user' });
      }
    }
  }

  /**
 * POST /api/tenant/users/invite
 * Invite new user to tenant
 */
static async inviteUser(req: TenantAuthRequest, res: Response): Promise<void> {
  try {
    if (!req.tenant) {
      res.status(400).json({ error: 'Tenant context required' });
      return;
    }

    if (!req.admin) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { email, role_id, first_name, last_name } = req.body;

    console.log('📧 Invite user request:', {
      tenant_id: req.tenant.id,
      email,
      role_id,
      invited_by: req.admin.id,
    });

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    if (!role_id) {
      res.status(400).json({ error: 'Role is required' });
      return;
    }

    const result = await TenantAdminUserService.inviteUser(
      Number(req.tenant.id),
      Number(req.admin.id),
      { email, role_id, first_name, last_name }
    );

    res.status(201).json(result);
  } catch (error: any) {
    console.error('❌ Invite user error:', error);
    console.error('Error stack:', error.stack);
    if (
      error.message.includes('User already exists') ||
      error.message.includes('Invitation already sent') ||
      error.message.includes('User limit reached')
    ) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ 
        error: 'Failed to invite user',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

  /**
   * GET /api/tenant/users/invitations
   * Get pending invitations
   */
  static async getPendingInvitations(
    req: TenantAuthRequest,
    res: Response
  ): Promise<void> {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      const invitations = await TenantAdminUserService.getPendingInvitations(
        Number(req.tenant.id)
      );
      res.json({ data: invitations });
    } catch (error: any) {
      console.error('Get invitations error:', error);
      res.status(500).json({ error: 'Failed to get invitations' });
    }
  }

  /**
   * DELETE /api/tenant/users/invitations/:id
   * Cancel invitation
   */
  static async cancelInvitation(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      const invitationId = parseInt(req.params.id);
      if (isNaN(invitationId)) {
        res.status(400).json({ error: 'Invalid invitation ID' });
        return;
      }

      const result = await TenantAdminUserService.cancelInvitation(
        Number(req.tenant.id),
        invitationId
      );
      res.json(result);
    } catch (error: any) {
      console.error('Cancel invitation error:', error);
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to cancel invitation' });
      }
    }
  }

  /**
   * PUT /api/tenant/users/:id
   * Update user
   */
  static async updateTenantUser(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const { first_name, last_name, avatar_url, preferred_language_id, is_active } =
        req.body;

      const user = await TenantAdminUserService.updateTenantUser(Number(req.tenant.id), userId, {
        first_name,
        last_name,
        avatar_url,
        preferred_language_id,
        is_active,
      });

      res.json({
        message: 'User updated successfully',
        data: user,
      });
    } catch (error: any) {
      console.error('Update tenant user error:', error);
      if (error.message === 'User not found in this tenant') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update user' });
      }
    }
  }

  /**
   * PUT /api/tenant/users/:id/role
   * Update user role
   */
  static async updateUserRole(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const { role_id } = req.body;
      if (!role_id) {
        res.status(400).json({ error: 'Role ID is required' });
        return;
      }

      const result = await TenantAdminUserService.updateUserRole(
        Number(req.tenant.id),
        userId,
        role_id
      );

      res.json(result);
    } catch (error: any) {
      console.error('Update user role error:', error);
      if (error.message.includes('not found') || error.message.includes('Invalid role')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update role' });
      }
    }
  }

  /**
   * DELETE /api/tenant/users/:id
   * Remove user from tenant
   */
  static async removeUser(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      if (!req.admin) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const result = await TenantAdminUserService.removeUserFromTenant(
        Number(req.tenant.id),
        userId,
        Number(req.admin.id)
      );

      res.json(result);
    } catch (error: any) {
      console.error('Remove user error:', error);
      if (
        error.message === 'Cannot remove yourself' ||
        error.message.includes('not found')
      ) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to remove user' });
      }
    }
  }

  /**
   * GET /api/tenant/users/roles
   * Get available roles
   */
  static async getAvailableRoles(_req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      const roles = await TenantAdminUserService.getAvailableRoles();
      res.json({ data: roles });
    } catch (error: any) {
      console.error('Get roles error:', error);
      res.status(500).json({ error: 'Failed to get roles' });
    }
  }
}