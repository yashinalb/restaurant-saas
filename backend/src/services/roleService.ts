import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/database.js';

interface CreateRoleData {
  name: string;
  display_name: string;
  description?: string;
  is_system_role?: boolean;
  is_active?: boolean;
  permission_ids?: number[];
}

interface UpdateRoleData {
  name?: string;
  display_name?: string;
  description?: string;
  is_active?: boolean;
  permission_ids?: number[];
}

export class RoleService {
  /**
   * Get all roles
   */
  static async getAllRoles() {
    const [roles] = await pool.query<RowDataPacket[]>(
      `SELECT 
        r.*,
        (SELECT COUNT(*) FROM admin_tenant_access WHERE role_id = r.id) as user_count
       FROM roles r
       ORDER BY r.name ASC`
    );

    // Get permissions for each role
    for (const role of roles) {
      const [permissions] = await pool.query<RowDataPacket[]>(
        `SELECT p.*
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = ?
         ORDER BY p.module, p.name`,
        [role.id]
      );
      role.permissions = permissions;
    }

    return roles;
  }

  /**
   * Get role by ID
   */
  static async getRoleById(roleId: number) {
    const [roles] = await pool.query<RowDataPacket[]>(
      `SELECT 
        r.*,
        (SELECT COUNT(*) FROM admin_tenant_access WHERE role_id = r.id) as user_count
       FROM roles r
       WHERE r.id = ?`,
      [roleId]
    );

    if (roles.length === 0) {
      throw new Error('Role not found');
    }

    const role = roles[0];

    // Get permissions
    const [permissions] = await pool.query<RowDataPacket[]>(
      `SELECT p.*
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ?
       ORDER BY p.module, p.name`,
      [roleId]
    );

    role.permissions = permissions;

    return role;
  }

  /**
   * Create role
   */
  static async createRole(data: CreateRoleData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if name already exists
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM roles WHERE name = ?',
        [data.name]
      );

      if (existing.length > 0) {
        throw new Error('Role name already exists');
      }

      // Create role
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO roles (name, display_name, description, is_system_role, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [
          data.name,
          data.display_name,
          data.description || null,
          data.is_system_role || false,
          data.is_active !== undefined ? data.is_active : true,
        ]
      );

      const roleId = result.insertId;

      // Assign permissions
      if (data.permission_ids && data.permission_ids.length > 0) {
        for (const permissionId of data.permission_ids) {
          await connection.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
            [roleId, permissionId]
          );
        }
      }

      await connection.commit();

      return await this.getRoleById(roleId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update role
   */
  static async updateRole(roleId: number, data: UpdateRoleData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if role exists
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id, is_system_role FROM roles WHERE id = ?',
        [roleId]
      );

      if (existing.length === 0) {
        throw new Error('Role not found');
      }

      // Check if new name already exists (if changing name)
      if (data.name) {
        const [nameExists] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM roles WHERE name = ? AND id != ?',
          [data.name, roleId]
        );

        if (nameExists.length > 0) {
          throw new Error('Role name already exists');
        }
      }

      // Build update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (data.name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(data.name);
      }
      if (data.display_name !== undefined) {
        updateFields.push('display_name = ?');
        updateValues.push(data.display_name);
      }
      if (data.description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(data.description);
      }
      if (data.is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(data.is_active);
      }

      if (updateFields.length > 0) {
        updateValues.push(roleId);
        await connection.query(
          `UPDATE roles SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }

      // Update permissions if provided
      if (data.permission_ids !== undefined) {
        // Delete existing permissions
        await connection.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

        // Insert new permissions
        if (data.permission_ids.length > 0) {
          for (const permissionId of data.permission_ids) {
            await connection.query(
              'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
              [roleId, permissionId]
            );
          }
        }
      }

      await connection.commit();

      return await this.getRoleById(roleId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete role
   */
  static async deleteRole(roleId: number) {
    // Check if role is system role
    const [role] = await pool.query<RowDataPacket[]>(
      'SELECT is_system_role, (SELECT COUNT(*) FROM admin_tenant_access WHERE role_id = ?) as user_count FROM roles WHERE id = ?',
      [roleId, roleId]
    );

    if (role.length === 0) {
      throw new Error('Role not found');
    }

    if (role[0].is_system_role) {
      throw new Error('Cannot delete system role');
    }

    if (role[0].user_count > 0) {
      throw new Error('Cannot delete role that is assigned to users');
    }

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM roles WHERE id = ?',
      [roleId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Role not found');
    }

    return { message: 'Role deleted successfully' };
  }
}
