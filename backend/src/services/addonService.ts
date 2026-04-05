import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class AddonService {
  static async getAll(filters?: { master_addon_type_id?: number }): Promise<any[]> {
    let query = `
      SELECT ma.*, mat.code as addon_type_code
      FROM master_addons ma
      LEFT JOIN master_addon_types mat ON mat.id = ma.master_addon_type_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.master_addon_type_id) {
      query += ' AND ma.master_addon_type_id = ?';
      params.push(filters.master_addon_type_id);
    }

    query += ' ORDER BY ma.master_addon_type_id ASC, ma.sort_order ASC, ma.id ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    for (const row of rows) {
      const [translations] = await pool.query<RowDataPacket[]>(
        `SELECT t.*, l.code as language_code, l.name as language_name
         FROM master_addon_translations t
         JOIN languages l ON t.language_id = l.id
         WHERE t.master_addon_id = ?
         ORDER BY l.sort_order`,
        [row.id]
      );
      row.translations = translations;
    }

    return rows;
  }

  static async getById(id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ma.*, mat.code as addon_type_code
       FROM master_addons ma
       LEFT JOIN master_addon_types mat ON mat.id = ma.master_addon_type_id
       WHERE ma.id = ?`,
      [id]
    );
    if (rows.length === 0) return null;

    const [translations] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, l.code as language_code, l.name as language_name
       FROM master_addon_translations t
       JOIN languages l ON t.language_id = l.id
       WHERE t.master_addon_id = ?
       ORDER BY l.sort_order`,
      [id]
    );

    return { ...rows[0], translations };
  }

  static async create(data: {
    master_addon_type_id: number;
    code: string;
    sort_order?: number;
    is_active?: boolean;
    translations?: Array<{ language_id: number; name: string; description?: string }>;
  }): Promise<number> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM master_addons WHERE master_addon_type_id = ? AND code = ?',
        [data.master_addon_type_id, data.code]
      );
      if (existing.length > 0) {
        throw { status: 409, message: 'Addon with this code already exists for this type' };
      }

      const [result] = await conn.query<ResultSetHeader>(
        'INSERT INTO master_addons (master_addon_type_id, code, sort_order, is_active) VALUES (?, ?, ?, ?)',
        [data.master_addon_type_id, data.code, data.sort_order ?? 0, data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1]
      );
      const entityId = result.insertId;

      if (data.translations?.length) {
        for (const t of data.translations) {
          await conn.query(
            'INSERT INTO master_addon_translations (master_addon_id, language_id, name, description) VALUES (?, ?, ?, ?)',
            [entityId, t.language_id, t.name, t.description || null]
          );
        }
      }

      await conn.commit();
      return entityId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  static async update(id: number, data: {
    master_addon_type_id?: number;
    code?: string;
    sort_order?: number;
    is_active?: boolean;
    translations?: Array<{ language_id: number; name: string; description?: string }>;
  }): Promise<boolean> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.query<RowDataPacket[]>('SELECT id, master_addon_type_id FROM master_addons WHERE id = ?', [id]);
      if (existing.length === 0) throw { status: 404, message: 'Addon not found' };

      const typeId = data.master_addon_type_id ?? existing[0].master_addon_type_id;
      if (data.code) {
        const [dup] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM master_addons WHERE master_addon_type_id = ? AND code = ? AND id != ?',
          [typeId, data.code, id]
        );
        if (dup.length > 0) throw { status: 409, message: 'Addon with this code already exists for this type' };
      }

      const fields: string[] = [];
      const values: any[] = [];
      if (data.master_addon_type_id !== undefined) { fields.push('master_addon_type_id = ?'); values.push(data.master_addon_type_id); }
      if (data.code !== undefined) { fields.push('code = ?'); values.push(data.code); }
      if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
      if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }

      if (fields.length > 0) {
        values.push(id);
        await conn.query(`UPDATE master_addons SET ${fields.join(', ')} WHERE id = ?`, values);
      }

      if (data.translations) {
        await conn.query('DELETE FROM master_addon_translations WHERE master_addon_id = ?', [id]);
        for (const t of data.translations) {
          await conn.query(
            'INSERT INTO master_addon_translations (master_addon_id, language_id, name, description) VALUES (?, ?, ?, ?)',
            [id, t.language_id, t.name, t.description || null]
          );
        }
      }

      await conn.commit();
      return true;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  static async delete(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM master_addons WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}
