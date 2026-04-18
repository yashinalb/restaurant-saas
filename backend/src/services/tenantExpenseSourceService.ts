import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface TranslationInput {
  language_id: number;
  name: string;
  description?: string | null;
}

interface ExpenseSourceInput {
  tenant_expense_category_id: number;
  is_active?: boolean;
  translations?: TranslationInput[];
}

export class TenantExpenseSourceService {
  static async getAll(tenantId: number, filters?: {
    is_active?: boolean;
    tenant_expense_category_id?: number;
  }): Promise<any[]> {
    let query = `
      SELECT s.*,
        c.code as category_code
      FROM tenant_expense_sources s
      LEFT JOIN tenant_expense_categories c ON c.id = s.tenant_expense_category_id
      WHERE s.tenant_id = ?
    `;
    const params: any[] = [tenantId];

    if (filters?.is_active !== undefined) {
      query += ' AND s.is_active = ?';
      params.push(filters.is_active ? 1 : 0);
    }
    if (filters?.tenant_expense_category_id) {
      query += ' AND s.tenant_expense_category_id = ?';
      params.push(filters.tenant_expense_category_id);
    }

    query += ' ORDER BY c.sort_order ASC, s.id ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    for (const row of rows) {
      const [translations] = await pool.query<RowDataPacket[]>(
        `SELECT t.*, l.code as language_code, l.name as language_name
         FROM tenant_expense_source_translations t
         JOIN languages l ON t.language_id = l.id
         WHERE t.tenant_expense_source_id = ?
         ORDER BY l.sort_order`,
        [row.id]
      );
      row.translations = translations;

      const [catTranslations] = await pool.query<RowDataPacket[]>(
        `SELECT t.name, l.code as language_code
         FROM tenant_expense_category_translations t
         JOIN languages l ON t.language_id = l.id
         WHERE t.tenant_expense_category_id = ?`,
        [row.tenant_expense_category_id]
      );
      row.category_translations = catTranslations;
    }
    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT s.*, c.code as category_code
       FROM tenant_expense_sources s
       LEFT JOIN tenant_expense_categories c ON c.id = s.tenant_expense_category_id
       WHERE s.id = ? AND s.tenant_id = ?`,
      [id, tenantId]
    );
    if (rows.length === 0) return null;

    const [translations] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, l.code as language_code, l.name as language_name
       FROM tenant_expense_source_translations t
       JOIN languages l ON t.language_id = l.id
       WHERE t.tenant_expense_source_id = ?
       ORDER BY l.sort_order`,
      [id]
    );

    return { ...rows[0], translations };
  }

  static async create(tenantId: number, data: ExpenseSourceInput): Promise<number> {
    if (!data.tenant_expense_category_id) {
      throw { status: 400, message: 'Expense category is required' };
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [catCheck] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM tenant_expense_categories WHERE id = ? AND tenant_id = ?',
        [data.tenant_expense_category_id, tenantId]
      );
      if (catCheck.length === 0) throw { status: 400, message: 'Invalid expense category' };

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO tenant_expense_sources
         (tenant_id, tenant_expense_category_id, is_active)
         VALUES (?, ?, ?)`,
        [tenantId, data.tenant_expense_category_id, data.is_active === false ? 0 : 1]
      );
      const entityId = result.insertId;

      if (data.translations?.length) {
        for (const t of data.translations) {
          if (!t.language_id || !t.name) continue;
          await conn.query(
            'INSERT INTO tenant_expense_source_translations (tenant_expense_source_id, language_id, name, description) VALUES (?, ?, ?, ?)',
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

  static async update(tenantId: number, id: number, data: Partial<ExpenseSourceInput>): Promise<boolean> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM tenant_expense_sources WHERE id = ? AND tenant_id = ?',
        [id, tenantId]
      );
      if (existing.length === 0) throw { status: 404, message: 'Expense source not found' };

      if (data.tenant_expense_category_id) {
        const [catCheck] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM tenant_expense_categories WHERE id = ? AND tenant_id = ?',
          [data.tenant_expense_category_id, tenantId]
        );
        if (catCheck.length === 0) throw { status: 400, message: 'Invalid expense category' };
      }

      const fields: string[] = [];
      const values: any[] = [];
      if (data.tenant_expense_category_id !== undefined) { fields.push('tenant_expense_category_id = ?'); values.push(data.tenant_expense_category_id); }
      if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }

      if (fields.length > 0) {
        values.push(id, tenantId);
        await conn.query(
          `UPDATE tenant_expense_sources SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`,
          values
        );
      }

      if (data.translations) {
        await conn.query('DELETE FROM tenant_expense_source_translations WHERE tenant_expense_source_id = ?', [id]);
        for (const t of data.translations) {
          if (!t.language_id || !t.name) continue;
          await conn.query(
            'INSERT INTO tenant_expense_source_translations (tenant_expense_source_id, language_id, name, description) VALUES (?, ?, ?, ?)',
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
      'DELETE FROM tenant_expense_sources WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    return result.affectedRows > 0;
  }
}
