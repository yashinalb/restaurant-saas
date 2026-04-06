import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class TenantIngredientService {
  static async getAll(tenantId: number, filters?: { is_active?: boolean; allergen_type?: string }): Promise<any[]> {
    let query = 'SELECT * FROM tenant_ingredients WHERE tenant_id = ?';
    const params: any[] = [tenantId];

    if (filters?.is_active !== undefined) { query += ' AND is_active = ?'; params.push(filters.is_active); }
    if (filters?.allergen_type) { query += ' AND allergen_type = ?'; params.push(filters.allergen_type); }

    query += ' ORDER BY sort_order ASC, id ASC';
    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    for (const row of rows) {
      const [translations] = await pool.query<RowDataPacket[]>(
        `SELECT t.*, l.code as language_code, l.name as language_name
         FROM tenant_ingredient_translations t
         JOIN languages l ON t.language_id = l.id
         WHERE t.tenant_ingredient_id = ?
         ORDER BY l.sort_order`, [row.id]
      );
      row.translations = translations;
    }
    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tenant_ingredients WHERE id = ? AND tenant_id = ?', [id, tenantId]
    );
    if (rows.length === 0) return null;
    const [translations] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, l.code as language_code, l.name as language_name
       FROM tenant_ingredient_translations t
       JOIN languages l ON t.language_id = l.id
       WHERE t.tenant_ingredient_id = ?
       ORDER BY l.sort_order`, [id]
    );
    return { ...rows[0], translations };
  }

  static async create(tenantId: number, data: {
    code: string; allergen_type?: string; icon_url?: string; sort_order?: number; is_active?: boolean;
    master_ingredient_id?: number | null;
    translations?: Array<{ language_id: number; name: string; description?: string }>;
  }): Promise<number> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [existing] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM tenant_ingredients WHERE tenant_id = ? AND code = ?', [tenantId, data.code]
      );
      if (existing.length > 0) throw { status: 409, message: 'Ingredient with this code already exists' };

      const [result] = await conn.query<ResultSetHeader>(
        'INSERT INTO tenant_ingredients (tenant_id, master_ingredient_id, code, allergen_type, icon_url, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [tenantId, data.master_ingredient_id || null, data.code, data.allergen_type || null,
         data.icon_url || null, data.sort_order ?? 0, data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1]
      );
      const entityId = result.insertId;
      if (data.translations?.length) {
        for (const t of data.translations) {
          await conn.query(
            'INSERT INTO tenant_ingredient_translations (tenant_ingredient_id, language_id, name, description) VALUES (?, ?, ?, ?)',
            [entityId, t.language_id, t.name, t.description || null]
          );
        }
      }
      await conn.commit();
      return entityId;
    } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
  }

  static async update(tenantId: number, id: number, data: {
    code?: string; allergen_type?: string; icon_url?: string; sort_order?: number; is_active?: boolean;
    translations?: Array<{ language_id: number; name: string; description?: string }>;
  }): Promise<boolean> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [existing] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM tenant_ingredients WHERE id = ? AND tenant_id = ?', [id, tenantId]
      );
      if (existing.length === 0) throw { status: 404, message: 'Ingredient not found' };

      if (data.code) {
        const [dup] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM tenant_ingredients WHERE tenant_id = ? AND code = ? AND id != ?', [tenantId, data.code, id]
        );
        if (dup.length > 0) throw { status: 409, message: 'Ingredient with this code already exists' };
      }

      const fields: string[] = []; const values: any[] = [];
      if (data.code !== undefined) { fields.push('code = ?'); values.push(data.code); }
      if (data.allergen_type !== undefined) { fields.push('allergen_type = ?'); values.push(data.allergen_type || null); }
      if (data.icon_url !== undefined) { fields.push('icon_url = ?'); values.push(data.icon_url || null); }
      if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
      if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }

      if (fields.length > 0) {
        values.push(id, tenantId);
        await conn.query(`UPDATE tenant_ingredients SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`, values);
      }

      if (data.translations) {
        await conn.query('DELETE FROM tenant_ingredient_translations WHERE tenant_ingredient_id = ?', [id]);
        for (const t of data.translations) {
          await conn.query(
            'INSERT INTO tenant_ingredient_translations (tenant_ingredient_id, language_id, name, description) VALUES (?, ?, ?, ?)',
            [id, t.language_id, t.name, t.description || null]
          );
        }
      }
      await conn.commit();
      return true;
    } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
  }

  static async delete(tenantId: number, id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM tenant_ingredients WHERE id = ? AND tenant_id = ?', [id, tenantId]
    );
    return result.affectedRows > 0;
  }

  static async getAvailableMaster(tenantId: number): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT m.*,
        CASE WHEN t.id IS NOT NULL THEN 1 ELSE 0 END as is_imported
      FROM master_ingredients m
      LEFT JOIN tenant_ingredients t ON t.master_ingredient_id = m.id AND t.tenant_id = ?
      WHERE m.is_active = 1
      ORDER BY m.sort_order ASC
    `, [tenantId]);

    for (const row of rows) {
      const [translations] = await pool.query<RowDataPacket[]>(
        `SELECT t.*, l.code as language_code, l.name as language_name
         FROM master_ingredient_translations t
         JOIN languages l ON t.language_id = l.id
         WHERE t.master_ingredient_id = ?
         ORDER BY l.sort_order`, [row.id]
      );
      row.translations = translations;
    }
    return rows;
  }

  static async importFromMaster(tenantId: number, masterIds: number[]): Promise<{ imported_count: number; imported_ids: number[] }> {
    const conn = await pool.getConnection();
    const importedIds: number[] = [];
    try {
      await conn.beginTransaction();
      for (const masterId of masterIds) {
        const [already] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM tenant_ingredients WHERE tenant_id = ? AND master_ingredient_id = ?', [tenantId, masterId]
        );
        if (already.length > 0) continue;

        const [masters] = await conn.query<RowDataPacket[]>('SELECT * FROM master_ingredients WHERE id = ?', [masterId]);
        if (masters.length === 0) continue;
        const master = masters[0];

        const [result] = await conn.query<ResultSetHeader>(
          'INSERT INTO tenant_ingredients (tenant_id, master_ingredient_id, code, allergen_type, icon_url, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
          [tenantId, masterId, master.code, master.allergen_type, master.icon_url, master.sort_order]
        );
        const newId = result.insertId;
        importedIds.push(newId);

        const [masterTranslations] = await conn.query<RowDataPacket[]>(
          'SELECT * FROM master_ingredient_translations WHERE master_ingredient_id = ?', [masterId]
        );
        for (const mt of masterTranslations) {
          await conn.query(
            'INSERT INTO tenant_ingredient_translations (tenant_ingredient_id, language_id, name, description) VALUES (?, ?, ?, ?)',
            [newId, mt.language_id, mt.name, mt.description || null]
          );
        }
      }
      await conn.commit();
      return { imported_count: importedIds.length, imported_ids: importedIds };
    } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
  }
}
