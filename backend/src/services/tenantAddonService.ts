import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class TenantAddonService {
  static async getAll(tenantId: number, filters?: { is_active?: boolean; tenant_addon_type_id?: number }): Promise<any[]> {
    let query = 'SELECT a.*, at.code as addon_type_code FROM tenant_addons a LEFT JOIN tenant_addon_types at ON at.id = a.tenant_addon_type_id WHERE a.tenant_id = ?';
    const params: any[] = [tenantId];
    if (filters?.is_active !== undefined) { query += ' AND a.is_active = ?'; params.push(filters.is_active); }
    if (filters?.tenant_addon_type_id) { query += ' AND a.tenant_addon_type_id = ?'; params.push(filters.tenant_addon_type_id); }
    query += ' ORDER BY a.sort_order ASC, a.id ASC';
    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    for (const row of rows) {
      const [translations] = await pool.query<RowDataPacket[]>(
        `SELECT t.*, l.code as language_code, l.name as language_name
         FROM tenant_addon_translations t JOIN languages l ON t.language_id = l.id
         WHERE t.tenant_addon_id = ? ORDER BY l.sort_order`, [row.id]
      );
      row.translations = translations;
      const [prices] = await pool.query<RowDataPacket[]>(
        `SELECT p.*, c.code as currency_code, c.symbol as currency_symbol, s.name as store_name
         FROM tenant_addon_prices p
         JOIN currencies c ON c.id = p.currency_id
         LEFT JOIN stores s ON s.id = p.store_id
         WHERE p.tenant_addon_id = ? ORDER BY p.store_id, p.currency_id`, [row.id]
      );
      row.prices = prices;
    }
    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT a.*, at.code as addon_type_code FROM tenant_addons a LEFT JOIN tenant_addon_types at ON at.id = a.tenant_addon_type_id WHERE a.id = ? AND a.tenant_id = ?', [id, tenantId]
    );
    if (rows.length === 0) return null;
    const [translations] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, l.code as language_code, l.name as language_name
       FROM tenant_addon_translations t JOIN languages l ON t.language_id = l.id
       WHERE t.tenant_addon_id = ? ORDER BY l.sort_order`, [id]
    );
    const [prices] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, c.code as currency_code, c.symbol as currency_symbol, s.name as store_name
       FROM tenant_addon_prices p JOIN currencies c ON c.id = p.currency_id
       LEFT JOIN stores s ON s.id = p.store_id
       WHERE p.tenant_addon_id = ? ORDER BY p.store_id, p.currency_id`, [id]
    );
    return { ...rows[0], translations, prices };
  }

  static async create(tenantId: number, data: {
    tenant_addon_type_id: number; sort_order?: number; is_active?: boolean; master_addon_id?: number | null;
    translations?: Array<{ language_id: number; name: string; description?: string }>;
    prices?: Array<{ store_id?: number | null; currency_id: number; price: number; is_active?: boolean }>;
  }): Promise<number> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query<ResultSetHeader>(
        'INSERT INTO tenant_addons (tenant_id, tenant_addon_type_id, master_addon_id, sort_order, is_active) VALUES (?, ?, ?, ?, ?)',
        [tenantId, data.tenant_addon_type_id, data.master_addon_id || null,
         data.sort_order ?? 0, data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1]
      );
      const entityId = result.insertId;
      if (data.translations?.length) {
        for (const t of data.translations) {
          await conn.query(
            'INSERT INTO tenant_addon_translations (tenant_addon_id, language_id, name, description) VALUES (?, ?, ?, ?)',
            [entityId, t.language_id, t.name, t.description || null]
          );
        }
      }
      if (data.prices?.length) {
        for (const p of data.prices) {
          await conn.query(
            'INSERT INTO tenant_addon_prices (tenant_addon_id, store_id, currency_id, price, is_active) VALUES (?, ?, ?, ?, ?)',
            [entityId, p.store_id || null, p.currency_id, p.price, p.is_active !== undefined ? (p.is_active ? 1 : 0) : 1]
          );
        }
      }
      await conn.commit();
      return entityId;
    } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
  }

  static async update(tenantId: number, id: number, data: {
    tenant_addon_type_id?: number; sort_order?: number; is_active?: boolean;
    translations?: Array<{ language_id: number; name: string; description?: string }>;
    prices?: Array<{ store_id?: number | null; currency_id: number; price: number; is_active?: boolean }>;
  }): Promise<boolean> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [existing] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM tenant_addons WHERE id = ? AND tenant_id = ?', [id, tenantId]
      );
      if (existing.length === 0) throw { status: 404, message: 'Addon not found' };

      const fields: string[] = []; const values: any[] = [];
      if (data.tenant_addon_type_id !== undefined) { fields.push('tenant_addon_type_id = ?'); values.push(data.tenant_addon_type_id); }
      if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
      if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }
      if (fields.length > 0) {
        values.push(id, tenantId);
        await conn.query(`UPDATE tenant_addons SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`, values);
      }
      if (data.translations) {
        await conn.query('DELETE FROM tenant_addon_translations WHERE tenant_addon_id = ?', [id]);
        for (const t of data.translations) {
          await conn.query(
            'INSERT INTO tenant_addon_translations (tenant_addon_id, language_id, name, description) VALUES (?, ?, ?, ?)',
            [id, t.language_id, t.name, t.description || null]
          );
        }
      }
      if (data.prices) {
        await conn.query('DELETE FROM tenant_addon_prices WHERE tenant_addon_id = ?', [id]);
        for (const p of data.prices) {
          await conn.query(
            'INSERT INTO tenant_addon_prices (tenant_addon_id, store_id, currency_id, price, is_active) VALUES (?, ?, ?, ?, ?)',
            [id, p.store_id || null, p.currency_id, p.price, p.is_active !== undefined ? (p.is_active ? 1 : 0) : 1]
          );
        }
      }
      await conn.commit();
      return true;
    } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
  }

  static async delete(tenantId: number, id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM tenant_addons WHERE id = ? AND tenant_id = ?', [id, tenantId]
    );
    return result.affectedRows > 0;
  }

  static async getAvailableMaster(tenantId: number): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT m.*, mat.code as addon_type_code,
        CASE WHEN t.id IS NOT NULL THEN 1 ELSE 0 END as is_imported
      FROM master_addons m
      LEFT JOIN master_addon_types mat ON mat.id = m.master_addon_type_id
      LEFT JOIN tenant_addons t ON t.master_addon_id = m.id AND t.tenant_id = ?
      WHERE m.is_active = 1
      ORDER BY m.master_addon_type_id, m.sort_order ASC
    `, [tenantId]);
    for (const row of rows) {
      const [translations] = await pool.query<RowDataPacket[]>(
        `SELECT t.*, l.code as language_code, l.name as language_name
         FROM master_addon_translations t JOIN languages l ON t.language_id = l.id
         WHERE t.master_addon_id = ? ORDER BY l.sort_order`, [row.id]
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
          'SELECT id FROM tenant_addons WHERE tenant_id = ? AND master_addon_id = ?', [tenantId, masterId]
        );
        if (already.length > 0) continue;
        const [masters] = await conn.query<RowDataPacket[]>('SELECT * FROM master_addons WHERE id = ?', [masterId]);
        if (masters.length === 0) continue;
        const master = masters[0];

        // Find tenant addon type matching master addon type
        let tenantAddonTypeId = null;
        if (master.master_addon_type_id) {
          const [tatRows] = await conn.query<RowDataPacket[]>(
            'SELECT id FROM tenant_addon_types WHERE tenant_id = ? AND master_addon_type_id = ?',
            [tenantId, master.master_addon_type_id]
          );
          if (tatRows.length > 0) tenantAddonTypeId = tatRows[0].id;
        }
        if (!tenantAddonTypeId) continue; // Skip if no matching tenant addon type

        const [result] = await conn.query<ResultSetHeader>(
          'INSERT INTO tenant_addons (tenant_id, tenant_addon_type_id, master_addon_id, sort_order, is_active) VALUES (?, ?, ?, ?, 1)',
          [tenantId, tenantAddonTypeId, masterId, master.sort_order]
        );
        const newId = result.insertId;
        importedIds.push(newId);

        const [masterTranslations] = await conn.query<RowDataPacket[]>(
          'SELECT * FROM master_addon_translations WHERE master_addon_id = ?', [masterId]
        );
        for (const mt of masterTranslations) {
          await conn.query(
            'INSERT INTO tenant_addon_translations (tenant_addon_id, language_id, name, description) VALUES (?, ?, ?, ?)',
            [newId, mt.language_id, mt.name, mt.description || null]
          );
        }
      }
      await conn.commit();
      return { imported_count: importedIds.length, imported_ids: importedIds };
    } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
  }
}
