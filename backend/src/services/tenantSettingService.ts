import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class TenantSettingService {
  /**
   * Get all settings for a tenant
   */
  static async getAll(tenantId: number): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tenant_settings WHERE tenant_id = ? ORDER BY setting_key ASC',
      [tenantId]
    );
    return rows;
  }

  /**
   * Get a single setting by key
   */
  static async getByKey(tenantId: number, key: string): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tenant_settings WHERE tenant_id = ? AND setting_key = ?',
      [tenantId, key]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Get by ID
   */
  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tenant_settings WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Upsert a setting (create or update by key)
   */
  static async upsert(tenantId: number, data: { setting_key: string; setting_value: string; setting_type?: string }): Promise<any> {
    const settingType = data.setting_type || 'string';

    await pool.query(
      `INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_type)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), setting_type = VALUES(setting_type)`,
      [tenantId, data.setting_key, data.setting_value, settingType]
    );

    return this.getByKey(tenantId, data.setting_key);
  }

  /**
   * Bulk upsert multiple settings at once
   */
  static async bulkUpsert(tenantId: number, settings: Array<{ setting_key: string; setting_value: string; setting_type?: string }>): Promise<any[]> {
    for (const s of settings) {
      await this.upsert(tenantId, s);
    }
    return this.getAll(tenantId);
  }

  /**
   * Delete a setting by key
   */
  static async deleteByKey(tenantId: number, key: string): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM tenant_settings WHERE tenant_id = ? AND setting_key = ?',
      [tenantId, key]
    );
    return result.affectedRows > 0;
  }

  /**
   * Delete by ID
   */
  static async delete(tenantId: number, id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM tenant_settings WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    return result.affectedRows > 0;
  }
}
