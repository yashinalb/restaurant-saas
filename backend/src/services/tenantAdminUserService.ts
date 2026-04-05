import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/database.js';
import argon2 from 'argon2';
import crypto from 'crypto';
import { emailService } from './emailService.js';
import { validatePassword, getPasswordRequirements } from '../utils/passwordValidator.js';

interface InviteUserData {
  email: string;
  role_id: number;
  first_name?: string;
  last_name?: string;
}

interface AcceptInvitationData {
  token: string;
  password: string;
  first_name: string;
  last_name: string;
}

interface UpdateTenantUserData {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  preferred_language_id?: number | null;
  is_active?: boolean;
}

export class TenantAdminUserService {
  /**
   * Get all users for a tenant
   */
  static async getTenantUsers(tenantId: number) {
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT 
        au.id,
        au.email,
        au.first_name,
        au.last_name,
        au.avatar_url,
        au.preferred_language_id,
        au.is_active,
        au.last_login_at,
        au.created_at,
        ata.role_id,
        r.name as role_name,
        r.display_name as role_display_name
       FROM admin_users au
       JOIN admin_tenant_access ata ON au.id = ata.admin_user_id
       JOIN roles r ON ata.role_id = r.id
       WHERE ata.tenant_id = ?
       AND au.is_super_admin = 0
       ORDER BY au.created_at DESC`,
      [tenantId]
    );

    return users;
  }

  /**
   * Get user by ID (tenant-scoped)
   */
  static async getTenantUserById(tenantId: number, userId: number) {
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT 
        au.id,
        au.email,
        au.first_name,
        au.last_name,
        au.avatar_url,
        au.preferred_language_id,
        au.is_active,
        au.last_login_at,
        au.created_at,
        ata.role_id,
        r.name as role_name,
        r.display_name as role_display_name
       FROM admin_users au
       JOIN admin_tenant_access ata ON au.id = ata.admin_user_id
       JOIN roles r ON ata.role_id = r.id
       WHERE ata.tenant_id = ? 
       AND au.id = ?
       AND au.is_super_admin = 0`,
      [tenantId, userId]
    );

    if (users.length === 0) {
      throw new Error('User not found');
    }

    return users[0];
  }

  /**
   * Check if tenant has reached max users limit
   */
  static async checkUserLimit(tenantId: number): Promise<void> {
    // Get tenant's subscription plan
    const [tenants] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, sp.max_users
       FROM tenants t
       JOIN subscription_plans sp ON t.subscription_plan_id = sp.id
       WHERE t.id = ?`,
      [tenantId]
    );

    if (tenants.length === 0) {
      throw new Error('Tenant not found');
    }

    const maxUsers = tenants[0].max_users;

    // NULL means unlimited
    if (maxUsers === null) {
      return;
    }

    // Count current users
    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as user_count
       FROM admin_tenant_access
       WHERE tenant_id = ?`,
      [tenantId]
    );

    const currentUserCount = countResult[0].user_count;

    if (currentUserCount >= maxUsers) {
      throw new Error(
        `User limit reached. Your plan allows maximum ${maxUsers} users. Please upgrade your plan.`
      );
    }
  }

  /**
   * Invite user to tenant
   */
  static async inviteUser(
    tenantId: number,
    invitedBy: number,
    data: InviteUserData
  ) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check user limit
      await this.checkUserLimit(tenantId);

      // Check if email already exists as active user in this tenant
      const [existingUsers] = await connection.query<RowDataPacket[]>(
        `SELECT au.id 
         FROM admin_users au
         JOIN admin_tenant_access ata ON au.id = ata.admin_user_id
         WHERE ata.tenant_id = ? AND au.email = ?`,
        [tenantId, data.email]
      );

      if (existingUsers.length > 0) {
        throw new Error('User already exists in this tenant');
      }

      // Check if there's a pending invitation
      const [pendingInvites] = await connection.query<RowDataPacket[]>(
        `SELECT id FROM user_invitations
         WHERE tenant_id = ? 
         AND email = ? 
         AND accepted_at IS NULL
         AND expires_at > NOW()`,
        [tenantId, data.email]
      );

      if (pendingInvites.length > 0) {
        throw new Error('Invitation already sent to this email');
      }

      // Verify role exists and is NOT super admin
      const [roles] = await connection.query<RowDataPacket[]>(
        `SELECT id, name, display_name 
         FROM roles 
         WHERE id = ? 
         AND is_active = 1
         AND name NOT LIKE '%super%'`,
        [data.role_id]
      );

      if (roles.length === 0) {
        throw new Error('Invalid role');
      }

      const role = roles[0];

      // Get tenant info
      const [tenants] = await connection.query<RowDataPacket[]>(
        'SELECT name FROM tenants WHERE id = ?',
        [tenantId]
      );

      const tenantName = tenants[0]?.name || 'Tenant';

      // Get inviter info
      const [inviters] = await connection.query<RowDataPacket[]>(
        'SELECT first_name, last_name FROM admin_users WHERE id = ?',
        [invitedBy]
      );

      const inviterName = inviters[0]
        ? `${inviters[0].first_name || ''} ${inviters[0].last_name || ''}`.trim() || 'Admin'
        : 'Admin';

      // Generate invitation token
      const invitationToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(invitationToken)
        .digest('hex');

      // Token expires in 7 days
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Save invitation
      await connection.query(
        `INSERT INTO user_invitations 
         (tenant_id, email, role_id, invited_by, invitation_token, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [tenantId, data.email, data.role_id, invitedBy, hashedToken, expiresAt]
      );

      await connection.commit();

      // Send invitation email
      await emailService.sendUserInvitation(
        data.email,
        tenantName,
        inviterName,
        role.display_name,
        invitationToken
      );

      return {
        message: 'Invitation sent successfully',
        data: {
          email: data.email,
          role: role.display_name,
          expires_at: expiresAt,
        },
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get pending invitations for a tenant
   */
  static async getPendingInvitations(tenantId: number) {
    const [invitations] = await pool.query<RowDataPacket[]>(
      `SELECT 
        ui.id,
        ui.email,
        ui.expires_at,
        ui.created_at,
        r.name as role_name,
        r.display_name as role_display_name,
        au.first_name as invited_by_first_name,
        au.last_name as invited_by_last_name,
        au.email as invited_by_email
       FROM user_invitations ui
       JOIN roles r ON ui.role_id = r.id
       JOIN admin_users au ON ui.invited_by = au.id
       WHERE ui.tenant_id = ?
       AND ui.accepted_at IS NULL
       AND ui.expires_at > NOW()
       ORDER BY ui.created_at DESC`,
      [tenantId]
    );

    return invitations;
  }

  /**
   * Cancel invitation
   */
  static async cancelInvitation(tenantId: number, invitationId: number) {
    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM user_invitations 
       WHERE id = ? 
       AND tenant_id = ? 
       AND accepted_at IS NULL`,
      [invitationId, tenantId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Invitation not found or already accepted');
    }

    return { message: 'Invitation cancelled successfully' };
  }

  /**
   * Accept invitation and create user account
   */
  static async acceptInvitation(data: AcceptInvitationData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Hash token to match database
      const hashedToken = crypto
        .createHash('sha256')
        .update(data.token)
        .digest('hex');

      // Find valid invitation
      const [invitations] = await connection.query<RowDataPacket[]>(
        `SELECT ui.*, t.name as tenant_name
         FROM user_invitations ui
         JOIN tenants t ON ui.tenant_id = t.id
         WHERE ui.invitation_token = ?
         AND ui.accepted_at IS NULL
         AND ui.expires_at > NOW()`,
        [hashedToken]
      );

      if (invitations.length === 0) {
        throw new Error('Invalid or expired invitation');
      }

      const invitation = invitations[0];

      // 🔒 SECURITY IMPROVEMENT: Validate password strength with comprehensive rules
      const validation = validatePassword(data.password);
      if (!validation.isValid) {
        const error: any = new Error('Password does not meet security requirements');
        error.validationErrors = validation.errors;
        error.requirements = getPasswordRequirements();
        throw error;
      }

      // Hash password
      const passwordHash = await argon2.hash(data.password);

      // Check if user already exists
      let userId: number;
      const [existingUsers] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM admin_users WHERE email = ?',
        [invitation.email]
      );

      if (existingUsers.length > 0) {
        // User exists, just link to tenant
        userId = existingUsers[0].id;
      } else {
        // Create new user (NEVER as super admin) with email_verified_at = NULL
        const [userResult] = await connection.query<ResultSetHeader>(
          `INSERT INTO admin_users
           (email, password_hash, first_name, last_name, is_super_admin, is_active, email_verified_at)
           VALUES (?, ?, ?, ?, 0, 1, NULL)`,
          [invitation.email, passwordHash, data.first_name, data.last_name]
        );

        userId = userResult.insertId;
      }

      // Grant tenant access
      await connection.query(
        `INSERT INTO admin_tenant_access 
         (admin_user_id, tenant_id, role_id)
         VALUES (?, ?, ?)`,
        [userId, invitation.tenant_id, invitation.role_id]
      );

      // Mark invitation as accepted
      await connection.query(
        'UPDATE user_invitations SET accepted_at = NOW() WHERE id = ?',
        [invitation.id]
      );

      await connection.commit();

      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const hashedVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');

      // Token expires in 24 hours
      const verificationExpiresAt = new Date();
      verificationExpiresAt.setHours(verificationExpiresAt.getHours() + 24);

      // Save verification token to database
      await pool.query(
        `INSERT INTO email_verification_tokens
         (admin_user_id, token_hash, expires_at)
         VALUES (?, ?, ?)`,
        [userId, hashedVerificationToken, verificationExpiresAt]
      );

      // Send email verification email (instead of welcome email)
      await emailService.sendEmailVerification(
        invitation.email,
        data.first_name,
        verificationToken
      );

      return {
        message: 'Account created successfully',
        data: {
          email: invitation.email,
          tenant_name: invitation.tenant_name,
        },
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update tenant user
   */
  static async updateTenantUser(
    tenantId: number,
    userId: number,
    data: UpdateTenantUserData
  ) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Verify user belongs to tenant
      const [access] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM admin_tenant_access WHERE admin_user_id = ? AND tenant_id = ?',
        [userId, tenantId]
      );

      if (access.length === 0) {
        throw new Error('User not found in this tenant');
      }

      // Build update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (data.first_name !== undefined) {
        updateFields.push('first_name = ?');
        updateValues.push(data.first_name);
      }
      if (data.last_name !== undefined) {
        updateFields.push('last_name = ?');
        updateValues.push(data.last_name);
      }
      if (data.avatar_url !== undefined) {
        updateFields.push('avatar_url = ?');
        updateValues.push(data.avatar_url);
      }
      if (data.preferred_language_id !== undefined) {
        updateFields.push('preferred_language_id = ?');
        updateValues.push(data.preferred_language_id);
      }
      if (data.is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(data.is_active);
      }

      if (updateFields.length > 0) {
        updateValues.push(userId);
        await connection.query(
          `UPDATE admin_users SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }

      await connection.commit();

      return await this.getTenantUserById(tenantId, userId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update user role in tenant
   */
  static async updateUserRole(tenantId: number, userId: number, roleId: number) {
    // Verify role is valid and not super admin
    const [roles] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM roles 
       WHERE id = ? 
       AND is_active = 1
       AND name NOT LIKE '%super%'`,
      [roleId]
    );

    if (roles.length === 0) {
      throw new Error('Invalid role');
    }

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE admin_tenant_access 
       SET role_id = ? 
       WHERE admin_user_id = ? 
       AND tenant_id = ?`,
      [roleId, userId, tenantId]
    );

    if (result.affectedRows === 0) {
      throw new Error('User not found in this tenant');
    }

    return { message: 'User role updated successfully' };
  }

  /**
   * Remove user from tenant
   */
  static async removeUserFromTenant(
    tenantId: number,
    userId: number,
    currentUserId: number
  ) {
    // Prevent users from removing themselves
    if (userId === currentUserId) {
      throw new Error('Cannot remove yourself');
    }

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM admin_tenant_access WHERE admin_user_id = ? AND tenant_id = ?',
      [userId, tenantId]
    );

    if (result.affectedRows === 0) {
      throw new Error('User not found in this tenant');
    }

    return { message: 'User removed from tenant successfully' };
  }

  /**
   * Get available roles for tenant users
   */
  static async getAvailableRoles() {
    const [roles] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, display_name, description
       FROM roles
       WHERE is_active = 1
       AND name NOT LIKE '%super%'
       ORDER BY name`
    );

    return roles;
  }
}