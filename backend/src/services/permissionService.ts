import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/database.js';

interface CreatePermissionData {
  name: string;
  display_name: string;
  description?: string;
  module: string;
  is_active?: boolean;
}

interface UpdatePermissionData {
  name?: string;
  display_name?: string;
  description?: string;
  module?: string;
  is_active?: boolean;
}

export class PermissionService {
  /**
   * Get all permissions
   */
  static async getAllPermissions() {
    const [permissions] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM permissions ORDER BY module, name ASC'
    );

    return permissions;
  }

  /**
   * Get permissions grouped by module
   */
  static async getPermissionsByModule() {
    const [permissions] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM permissions WHERE is_active = 1 ORDER BY module, name ASC'
    );

    // Group by module
    const grouped: Record<string, any[]> = {};
    permissions.forEach((permission: any) => {
      if (!grouped[permission.module]) {
        grouped[permission.module] = [];
      }
      grouped[permission.module].push(permission);
    });

    return grouped;
  }

  /**
   * Get permission by ID
   */
  static async getPermissionById(permissionId: number) {
    const [permissions] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM permissions WHERE id = ?',
      [permissionId]
    );

    if (permissions.length === 0) {
      throw new Error('Permission not found');
    }

    return permissions[0];
  }

  /**
   * Create permission
   */
  static async createPermission(data: CreatePermissionData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if name already exists
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM permissions WHERE name = ?',
        [data.name]
      );

      if (existing.length > 0) {
        throw new Error('Permission name already exists');
      }

      // Create permission
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO permissions (name, display_name, description, module, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [
          data.name,
          data.display_name,
          data.description || null,
          data.module,
          data.is_active !== undefined ? data.is_active : true,
        ]
      );

      await connection.commit();

      return await this.getPermissionById(result.insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update permission
   */
  static async updatePermission(permissionId: number, data: UpdatePermissionData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if permission exists
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM permissions WHERE id = ?',
        [permissionId]
      );

      if (existing.length === 0) {
        throw new Error('Permission not found');
      }

      // Check if new name already exists (if changing name)
      if (data.name) {
        const [nameExists] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM permissions WHERE name = ? AND id != ?',
          [data.name, permissionId]
        );

        if (nameExists.length > 0) {
          throw new Error('Permission name already exists');
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
      if (data.module !== undefined) {
        updateFields.push('module = ?');
        updateValues.push(data.module);
      }
      if (data.is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(data.is_active);
      }

      if (updateFields.length > 0) {
        updateValues.push(permissionId);
        await connection.query(
          `UPDATE permissions SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }

      await connection.commit();

      return await this.getPermissionById(permissionId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete permission
   */
  static async deletePermission(permissionId: number) {
    // Check if permission is in use
    const [usage] = await pool.query<RowDataPacket[]>(
      `SELECT 
        (SELECT COUNT(*) FROM role_permissions WHERE permission_id = ?) as role_count,
        (SELECT COUNT(*) FROM admin_permissions WHERE permission_id = ?) as admin_count`,
      [permissionId, permissionId]
    );

    if (usage[0].role_count > 0 || usage[0].admin_count > 0) {
      throw new Error('Cannot delete permission that is in use');
    }

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM permissions WHERE id = ?',
      [permissionId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Permission not found');
    }

    return { message: 'Permission deleted successfully' };
  }

}
