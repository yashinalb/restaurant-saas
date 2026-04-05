import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class OrderSourceService {
  static async getAll(): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM master_order_sources ORDER BY sort_order ASC, id ASC'
    );
    for (const row of rows) {
      const [translations] = await pool.query<RowDataPacket[]>(
        `SELECT t.*, l.code as language_code, l.name as language_name
         FROM master_order_source_translations t
         JOIN languages l ON t.language_id = l.id
         WHERE t.master_order_source_id = ?
         ORDER BY l.sort_order`,
        [row.id]
      );
      row.translations = translations;
    }
    return rows;
  }

  static async getById(id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM master_order_sources WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    const [translations] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, l.code as language_code, l.name as language_name
       FROM master_order_source_translations t
       JOIN languages l ON t.language_id = l.id
       WHERE t.master_order_source_id = ?
       ORDER BY l.sort_order`,
      [id]
    );
    return { ...rows[0], translations };
  }

  static async create(data: {
    code: string; icon?: string; sort_order?: number; is_active?: boolean;
    translations?: Array<{ language_id: number; name: string }>;
  }): Promise<number> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [existing] = await conn.query<RowDataPacket[]>('SELECT id FROM master_order_sources WHERE code = ?', [data.code]);
      if (existing.length > 0) throw { status: 409, message: 'Order source with this code already exists' };

      const [result] = await conn.query<ResultSetHeader>(
        'INSERT INTO master_order_sources (code, icon, sort_order, is_active) VALUES (?, ?, ?, ?)',
        [data.code, data.icon || null, data.sort_order ?? 0, data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1]
      );
      const entityId = result.insertId;
      if (data.translations?.length) {
        for (const t of data.translations) {
          await conn.query('INSERT INTO master_order_source_translations (master_order_source_id, language_id, name) VALUES (?, ?, ?)',
            [entityId, t.language_id, t.name]);
        }
      }
      await conn.commit();
      return entityId;
    } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
  }

  static async update(id: number, data: {
    code?: string; icon?: string; sort_order?: number; is_active?: boolean;
    translations?: Array<{ language_id: number; name: string }>;
  }): Promise<boolean> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [existing] = await conn.query<RowDataPacket[]>('SELECT id FROM master_order_sources WHERE id = ?', [id]);
      if (existing.length === 0) throw { status: 404, message: 'Order source not found' };

      if (data.code) {
        const [dup] = await conn.query<RowDataPacket[]>('SELECT id FROM master_order_sources WHERE code = ? AND id != ?', [data.code, id]);
        if (dup.length > 0) throw { status: 409, message: 'Order source with this code already exists' };
      }

      const fields: string[] = []; const values: any[] = [];
      if (data.code !== undefined) { fields.push('code = ?'); values.push(data.code); }
      if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon || null); }
      if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
      if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }
      if (fields.length > 0) { values.push(id); await conn.query(`UPDATE master_order_sources SET ${fields.join(', ')} WHERE id = ?`, values); }

      if (data.translations) {
        await conn.query('DELETE FROM master_order_source_translations WHERE master_order_source_id = ?', [id]);
        for (const t of data.translations) {
          await conn.query('INSERT INTO master_order_source_translations (master_order_source_id, language_id, name) VALUES (?, ?, ?)',
            [id, t.language_id, t.name]);
        }
      }
      await conn.commit();
      return true;
    } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
  }

  static async delete(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM master_order_sources WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}
