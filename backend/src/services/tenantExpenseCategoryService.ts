import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface TranslationInput {
  language_id: number;
  name: string;
  description?: string | null;
}

interface ExpenseCategoryInput {
  code: string;
  icon?: string | null;
  sort_order?: number;
  is_active?: boolean;
  master_expense_category_id?: number | null;
  translations?: TranslationInput[];
}

export class TenantExpenseCategoryService {
  static async getAll(tenantId: number, filters?: { is_active?: boolean }): Promise<any[]> {
    let query = 'SELECT * FROM tenant_expense_categories WHERE tenant_id = ?';
    const params: any[] = [tenantId];

    if (filters?.is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.is_active ? 1 : 0);
    }

    query += ' ORDER BY sort_order ASC, id ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    for (const row of rows) {
      const [translations] = await pool.query<RowDataPacket[]>(
        `SELECT t.*, l.code as language_code, l.name as language_name
         FROM tenant_expense_category_translations t
         JOIN languages l ON t.language_id = l.id
         WHERE t.tenant_expense_category_id = ?
         ORDER BY l.sort_order`,
        [row.id]
      );
      row.translations = translations;
    }
    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tenant_expense_categories WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    if (rows.length === 0) return null;

    const [translations] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, l.code as language_code, l.name as language_name
       FROM tenant_expense_category_translations t
       JOIN languages l ON t.language_id = l.id
       WHERE t.tenant_expense_category_id = ?
       ORDER BY l.sort_order`,
      [id]
    );

    return { ...rows[0], translations };
  }

  static async create(tenantId: number, data: ExpenseCategoryInput): Promise<number> {
    if (!data.code || !String(data.code).trim()) {
      throw { status: 400, message: 'Code is required' };
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM tenant_expense_categories WHERE tenant_id = ? AND code = ?',
        [tenantId, data.code]
      );
      if (existing.length > 0) {
        throw { status: 409, message: 'Expense category with this code already exists' };
      }

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO tenant_expense_categories
         (tenant_id, master_expense_category_id, code, icon, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          tenantId,
          data.master_expense_category_id ?? null,
          data.code,
          data.icon ?? null,
          data.sort_order ?? 0,
          data.is_active === false ? 0 : 1,
        ]
      );
      const entityId = result.insertId;

      if (data.translations?.length) {
        for (const t of data.translations) {
          if (!t.language_id || !t.name) continue;
          await conn.query(
            'INSERT INTO tenant_expense_category_translations (tenant_expense_category_id, language_id, name, description) VALUES (?, ?, ?, ?)',
            [entityId, t.language_id, t.name, t.description ?? null]
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

  static async update(tenantId: number, id: number, data: Partial<ExpenseCategoryInput>): Promise<boolean> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM tenant_expense_categories WHERE id = ? AND tenant_id = ?',
        [id, tenantId]
      );
      if (existing.length === 0) throw { status: 404, message: 'Expense category not found' };

      if (data.code) {
        const [dup] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM tenant_expense_categories WHERE tenant_id = ? AND code = ? AND id != ?',
          [tenantId, data.code, id]
        );
        if (dup.length > 0) throw { status: 409, message: 'Expense category with this code already exists' };
      }

      const fields: string[] = [];
      const values: any[] = [];
      if (data.code !== undefined) { fields.push('code = ?'); values.push(data.code); }
      if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon ?? null); }
      if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
      if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }
      if (data.master_expense_category_id !== undefined) { fields.push('master_expense_category_id = ?'); values.push(data.master_expense_category_id ?? null); }

      if (fields.length > 0) {
        values.push(id, tenantId);
        await conn.query(
          `UPDATE tenant_expense_categories SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`,
          values
        );
      }

      if (data.translations) {
        await conn.query('DELETE FROM tenant_expense_category_translations WHERE tenant_expense_category_id = ?', [id]);
        for (const t of data.translations) {
          if (!t.language_id || !t.name) continue;
          await conn.query(
            'INSERT INTO tenant_expense_category_translations (tenant_expense_category_id, language_id, name, description) VALUES (?, ?, ?, ?)',
            [id, t.language_id, t.name, t.description ?? null]
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

  static async delete(tenantId: number, id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM tenant_expense_categories WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    return result.affectedRows > 0;
  }

  static async getAvailableMaster(tenantId: number): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT m.*,
        CASE WHEN t.id IS NOT NULL THEN 1 ELSE 0 END as is_imported
      FROM master_expense_categories m
      LEFT JOIN tenant_expense_categories t ON t.master_expense_category_id = m.id AND t.tenant_id = ?
      WHERE m.is_active = 1
      ORDER BY m.sort_order ASC
    `, [tenantId]);

    for (const row of rows) {
      const [translations] = await pool.query<RowDataPacket[]>(
        `SELECT t.*, l.code as language_code, l.name as language_name
         FROM master_expense_category_translations t
         JOIN languages l ON t.language_id = l.id
         WHERE t.master_expense_category_id = ?
         ORDER BY l.sort_order`,
        [row.id]
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
          'SELECT id FROM tenant_expense_categories WHERE tenant_id = ? AND master_expense_category_id = ?',
          [tenantId, masterId]
        );
        if (already.length > 0) continue;

        const [masters] = await conn.query<RowDataPacket[]>('SELECT * FROM master_expense_categories WHERE id = ?', [masterId]);
        if (masters.length === 0) continue;
        const master = masters[0];

        // Ensure unique code within tenant — fall back to code + "_m<id>" if collision
        let code = master.code;
        const [codeDup] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM tenant_expense_categories WHERE tenant_id = ? AND code = ?',
          [tenantId, code]
        );
        if (codeDup.length > 0) {
          code = `${master.code}_m${masterId}`;
        }

        const [result] = await conn.query<ResultSetHeader>(
          `INSERT INTO tenant_expense_categories
           (tenant_id, master_expense_category_id, code, sort_order, is_active)
           VALUES (?, ?, ?, ?, 1)`,
          [tenantId, masterId, code, master.sort_order]
        );
        const newId = result.insertId;
        importedIds.push(newId);

        const [masterTranslations] = await conn.query<RowDataPacket[]>(
          'SELECT * FROM master_expense_category_translations WHERE master_expense_category_id = ?',
          [masterId]
        );
        for (const mt of masterTranslations) {
          await conn.query(
            'INSERT INTO tenant_expense_category_translations (tenant_expense_category_id, language_id, name, description) VALUES (?, ?, ?, ?)',
            [newId, mt.language_id, mt.name, mt.description || null]
          );
        }
      }
      await conn.commit();
      return { imported_count: importedIds.length, imported_ids: importedIds };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}
