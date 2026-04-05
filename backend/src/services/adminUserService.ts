import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/database.js';
import argon2 from 'argon2';
import { validatePassword, getPasswordRequirements } from '../utils/passwordValidator.js';

interface CreateAdminUserData {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  is_super_admin?: boolean;
  is_active?: boolean;
}

interface UpdateAdminUserData {
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  preferred_language_id?: number | null; // ✅ ADD THIS
  is_super_admin?: boolean;
  is_active?: boolean;
}

interface AdminTenantAccess {
  admin_user_id: number;
  tenant_id: number;
  role_id: number;
}

export class AdminUserService {
  /**
   * Get all admin users
   */
  static async getAllAdminUsers() {
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT 
        au.id,
        au.email,
        au.first_name,
        au.last_name,
        au.avatar_url,
        au.is_super_admin,
        au.is_active,
        au.last_login_at,
        au.created_at,
        au.updated_at,
        (SELECT COUNT(*) FROM admin_tenant_access WHERE admin_user_id = au.id) as tenant_count
       FROM admin_users au
       ORDER BY au.created_at DESC`
    );

    return users;
  }

  /**
   * Get admin user by ID
   */
  static async getAdminUserById(userId: number) {
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT 
        au.id,
        au.email,
        au.first_name,
        au.last_name,
        au.avatar_url,
        au.is_super_admin,
        au.is_active,
        au.last_login_at,
        au.created_at,
        au.updated_at
       FROM admin_users au
       WHERE au.id = ?`,
      [userId]
    );

    if (users.length === 0) {
      throw new Error('Admin user not found');
    }

    const user = users[0];

    // Get tenant access
    const [tenantAccess] = await pool.query<RowDataPacket[]>(
      `SELECT 
        ata.id,
        ata.tenant_id,
        ata.role_id,
        t.name as tenant_name,
        t.slug as tenant_slug,
        r.name as role_name,
        r.display_name as role_display_name
       FROM admin_tenant_access ata
       JOIN tenants t ON ata.tenant_id = t.id
       JOIN roles r ON ata.role_id = r.id
       WHERE ata.admin_user_id = ?
       ORDER BY t.name`,
      [userId]
    );

    user.tenant_access = tenantAccess;

    return user;
  }

  /**
   * Create admin user
   */
  static async createAdminUser(data: CreateAdminUserData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if email already exists
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM admin_users WHERE email = ?',
        [data.email]
      );

      if (existing.length > 0) {
        throw new Error('Email already exists');
      }

      // 🔒 SECURITY IMPROVEMENT: Validate password strength
      const validation = validatePassword(data.password);
      if (!validation.isValid) {
        const error: any = new Error('Password does not meet security requirements');
        error.validationErrors = validation.errors;
        error.requirements = getPasswordRequirements();
        throw error;
      }

      // Hash password
      const passwordHash = await argon2.hash(data.password);

      // Create user
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO admin_users 
         (email, password_hash, first_name, last_name, avatar_url, is_super_admin, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.email,
          passwordHash,
          data.first_name || null,
          data.last_name || null,
          data.avatar_url || null,
          data.is_super_admin || false,
          data.is_active !== undefined ? data.is_active : true,
        ]
      );

      await connection.commit();

      return await this.getAdminUserById(result.insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update admin user
   */
  static async updateAdminUser(userId: number, data: UpdateAdminUserData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if user exists
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM admin_users WHERE id = ?',
        [userId]
      );

      if (existing.length === 0) {
        throw new Error('Admin user not found');
      }

      // Check if new email already exists (if changing email)
      if (data.email) {
        const [emailExists] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM admin_users WHERE email = ? AND id != ?',
          [data.email, userId]
        );

        if (emailExists.length > 0) {
          throw new Error('Email already exists');
        }
      }

      // Build update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (data.email !== undefined) {
        updateFields.push('email = ?');
        updateValues.push(data.email);
      }
      if (data.password) {
        // 🔒 SECURITY IMPROVEMENT: Validate password strength
        const validation = validatePassword(data.password);
        if (!validation.isValid) {
          const error: any = new Error('Password does not meet security requirements');
          error.validationErrors = validation.errors;
          error.requirements = getPasswordRequirements();
          throw error;
        }

        const passwordHash = await argon2.hash(data.password);
        updateFields.push('password_hash = ?');
        updateValues.push(passwordHash);
      }
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
      if (data.is_super_admin !== undefined) {
        updateFields.push('is_super_admin = ?');
        updateValues.push(data.is_super_admin);
      }
      if (data.is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(data.is_active);
      }

      if (data.preferred_language_id !== undefined) {
        updateFields.push('preferred_language_id = ?');
        updateValues.push(data.preferred_language_id);
      }

      if (updateFields.length > 0) {
        updateValues.push(userId);
        await connection.query(
          `UPDATE admin_users SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }

      await connection.commit();

      return await this.getAdminUserById(userId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete admin user
   */
  static async deleteAdminUser(userId: number) {
    // Prevent deleting super admin if it's the last one
    const [superAdmins] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM admin_users WHERE is_super_admin = 1 AND is_active = 1'
    );

    if (superAdmins.length === 1 && superAdmins[0].id === userId) {
      throw new Error('Cannot delete the last active super admin');
    }

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM admin_users WHERE id = ?',
      [userId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Admin user not found');
    }

    return { message: 'Admin user deleted successfully' };
  }

  /**
   * Grant tenant access to admin
   */
  static async grantTenantAccess(data: AdminTenantAccess) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Verify admin user exists
      const [admin] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM admin_users WHERE id = ?',
        [data.admin_user_id]
      );

      if (admin.length === 0) {
        throw new Error('Admin user not found');
      }

      // Verify tenant exists
      const [tenant] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM tenants WHERE id = ?',
        [data.tenant_id]
      );

      if (tenant.length === 0) {
        throw new Error('Tenant not found');
      }

      // Verify role exists
      const [role] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM roles WHERE id = ? AND is_active = 1',
        [data.role_id]
      );

      if (role.length === 0) {
        throw new Error('Role not found or inactive');
      }

      // Check if access already exists
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM admin_tenant_access WHERE admin_user_id = ? AND tenant_id = ?',
        [data.admin_user_id, data.tenant_id]
      );

      if (existing.length > 0) {
        // Update existing access
        await connection.query(
          'UPDATE admin_tenant_access SET role_id = ? WHERE admin_user_id = ? AND tenant_id = ?',
          [data.role_id, data.admin_user_id, data.tenant_id]
        );
      } else {
        // Create new access
        await connection.query(
          'INSERT INTO admin_tenant_access (admin_user_id, tenant_id, role_id) VALUES (?, ?, ?)',
          [data.admin_user_id, data.tenant_id, data.role_id]
        );
      }

      await connection.commit();

      return { message: 'Tenant access granted successfully' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Revoke tenant access from admin
   */
  static async revokeTenantAccess(adminUserId: number, tenantId: number) {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM admin_tenant_access WHERE admin_user_id = ? AND tenant_id = ?',
      [adminUserId, tenantId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Tenant access not found');
    }

    return { message: 'Tenant access revoked successfully' };
  }

  /**
   * Get admin user permissions for a tenant
   */
  static async getAdminPermissions(adminUserId: number, tenantId: number) {
    // Check if user is super admin
    const [admin] = await pool.query<RowDataPacket[]>(
      'SELECT is_super_admin FROM admin_users WHERE id = ?',
      [adminUserId]
    );

    if (admin.length === 0) {
      throw new Error('Admin user not found');
    }

    // Super admins have all permissions
    if (admin[0].is_super_admin) {
      const [allPermissions] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM permissions WHERE is_active = 1'
      );
      return allPermissions;
    }

    // Get permissions from role
    const [permissions] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT p.*
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN admin_tenant_access ata ON rp.role_id = ata.role_id
       WHERE ata.admin_user_id = ? AND ata.tenant_id = ? AND p.is_active = 1`,
      [adminUserId, tenantId]
    );

    // Get direct permission overrides
    const [overrides] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, ap.granted
       FROM admin_permissions ap
       JOIN permissions p ON ap.permission_id = p.id
       WHERE ap.admin_user_id = ? AND ap.tenant_id = ?`,
      [adminUserId, tenantId]
    );

    // Apply overrides
    const permissionMap = new Map();
    permissions.forEach((p: any) => permissionMap.set(p.id, p));

    overrides.forEach((override: any) => {
      if (override.granted) {
        permissionMap.set(override.id, override);
      } else {
        permissionMap.delete(override.id);
      }
    });

    return Array.from(permissionMap.values());
  }

  /**
 * Update own language preference (any authenticated admin)
 */
  static async updateOwnLanguage(adminUserId: number, languageId: number | null) {
    // Verify language exists if provided
    if (languageId !== null) {
      const [language] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM languages WHERE id = ? AND is_active = 1',
        [languageId]
      );

      if (language.length === 0) {
        throw new Error('Language not found or inactive');
      }
    }

    await pool.query(
      'UPDATE admin_users SET preferred_language_id = ? WHERE id = ?',
      [languageId, adminUserId]
    );

    return { message: 'Language preference updated successfully' };
  }

  /**
   * Check if admin has specific permission
   */
  static async hasPermission(
    adminUserId: number,
    tenantId: number,
    permissionName: string
  ): Promise<boolean> {
    // Check if user is super admin
    const [admin] = await pool.query<RowDataPacket[]>(
      'SELECT is_super_admin FROM admin_users WHERE id = ? AND is_active = 1',
      [adminUserId]
    );

    if (admin.length === 0) {
      return false;
    }

    // Super admins have all permissions
    if (admin[0].is_super_admin) {
      return true;
    }

    // Check for direct permission override (takes precedence)
    const [override] = await pool.query<RowDataPacket[]>(
      `SELECT ap.granted
       FROM admin_permissions ap
       JOIN permissions p ON ap.permission_id = p.id
       WHERE ap.admin_user_id = ? AND ap.tenant_id = ? AND p.name = ?`,
      [adminUserId, tenantId, permissionName]
    );

    if (override.length > 0) {
      return override[0].granted === 1;
    }

    // Check role permissions
    const [rolePermission] = await pool.query<RowDataPacket[]>(
      `SELECT 1
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN admin_tenant_access ata ON rp.role_id = ata.role_id
       WHERE ata.admin_user_id = ? 
         AND ata.tenant_id = ? 
         AND p.name = ? 
         AND p.is_active = 1
       LIMIT 1`,
      [adminUserId, tenantId, permissionName]
    );

    return rolePermission.length > 0;
  }
}
