import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class TenantSeatingAreaService {
  static async getAll(tenantId: number, filters?: { is_active?: boolean; store_id?: number }): Promise<any[]> {
    let query = 'SELECT a.*, s.name as store_name FROM tenant_seating_areas a LEFT JOIN stores s ON s.id = a.store_id WHERE a.tenant_id = ?';
    const params: any[] = [tenantId];
    if (filters?.is_active !== undefined) { query += ' AND a.is_active = ?'; params.push(filters.is_active); }
    if (filters?.store_id) { query += ' AND a.store_id = ?'; params.push(filters.store_id); }
    query += ' ORDER BY a.store_id, a.sort_order ASC, a.id ASC';
    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    for (const row of rows) {
      const [translations] = await pool.query<RowDataPacket[]>(
        `SELECT t.*, l.code as language_code, l.name as language_name
         FROM tenant_seating_area_translations t JOIN languages l ON t.language_id = l.id
         WHERE t.tenant_seating_area_id = ? ORDER BY l.sort_order`, [row.id]
      );
      row.translations = translations;
    }
    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT a.*, s.name as store_name FROM tenant_seating_areas a LEFT JOIN stores s ON s.id = a.store_id WHERE a.id = ? AND a.tenant_id = ?', [id, tenantId]
    );
    if (rows.length === 0) return null;
    const [translations] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, l.code as language_code, l.name as language_name
       FROM tenant_seating_area_translations t JOIN languages l ON t.language_id = l.id
       WHERE t.tenant_seating_area_id = ? ORDER BY l.sort_order`, [id]
    );
    return { ...rows[0], translations };
  }

  static async create(tenantId: number, data: {
    store_id: number; sort_order?: number; is_active?: boolean;
    translations?: Array<{ language_id: number; name: string }>;
  }): Promise<number> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query<ResultSetHeader>(
        'INSERT INTO tenant_seating_areas (tenant_id, store_id, sort_order, is_active) VALUES (?, ?, ?, ?)',
        [tenantId, data.store_id, data.sort_order ?? 0, data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1]
      );
      const entityId = result.insertId;
      if (data.translations?.length) {
        for (const t of data.translations) {
          await conn.query(
            'INSERT INTO tenant_seating_area_translations (tenant_seating_area_id, language_id, name) VALUES (?, ?, ?)',
            [entityId, t.language_id, t.name]
          );
        }
      }
      await conn.commit();
      return entityId;
    } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
  }

  static async update(tenantId: number, id: number, data: {
    store_id?: number; sort_order?: number; is_active?: boolean;
    translations?: Array<{ language_id: number; name: string }>;
  }): Promise<boolean> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [existing] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM tenant_seating_areas WHERE id = ? AND tenant_id = ?', [id, tenantId]
      );
      if (existing.length === 0) throw { status: 404, message: 'Seating area not found' };

      const fields: string[] = []; const values: any[] = [];
      if (data.store_id !== undefined) { fields.push('store_id = ?'); values.push(data.store_id); }
      if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
      if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }
      if (fields.length > 0) {
        values.push(id, tenantId);
        await conn.query(`UPDATE tenant_seating_areas SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`, values);
      }
      if (data.translations) {
        await conn.query('DELETE FROM tenant_seating_area_translations WHERE tenant_seating_area_id = ?', [id]);
        for (const t of data.translations) {
          await conn.query(
            'INSERT INTO tenant_seating_area_translations (tenant_seating_area_id, language_id, name) VALUES (?, ?, ?)',
            [id, t.language_id, t.name]
          );
        }
      }
      await conn.commit();
      return true;
    } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
  }

  static async delete(tenantId: number, id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM tenant_seating_areas WHERE id = ? AND tenant_id = ?', [id, tenantId]
    );
    return result.affectedRows > 0;
  }
}
