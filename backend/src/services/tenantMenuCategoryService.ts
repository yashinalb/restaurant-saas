import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class TenantMenuCategoryService {
  static async getAll(tenantId: number, filters?: { is_active?: boolean; store_id?: number }): Promise<any[]> {
    let query = 'SELECT * FROM tenant_menu_categories WHERE tenant_id = ?';
    const params: any[] = [tenantId];

    if (filters?.is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.is_active);
    }
    if (filters?.store_id !== undefined) {
      query += ' AND (store_id = ? OR store_id IS NULL)';
      params.push(filters.store_id);
    }

    query += ' ORDER BY sort_order ASC, id ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    for (const row of rows) {
      const [translations] = await pool.query<RowDataPacket[]>(
        `SELECT t.*, l.code as language_code, l.name as language_name
         FROM tenant_menu_category_translations t
         JOIN languages l ON t.language_id = l.id
         WHERE t.tenant_menu_category_id = ?
         ORDER BY l.sort_order`,
        [row.id]
      );
      row.translations = translations;

      const [images] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM tenant_menu_category_images WHERE tenant_menu_category_id = ? ORDER BY sort_order ASC',
        [row.id]
      );
      row.images = images;
    }
    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tenant_menu_categories WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    if (rows.length === 0) return null;

    const [translations] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, l.code as language_code, l.name as language_name
       FROM tenant_menu_category_translations t
       JOIN languages l ON t.language_id = l.id
       WHERE t.tenant_menu_category_id = ?
       ORDER BY l.sort_order`, [id]
    );

    const [images] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tenant_menu_category_images WHERE tenant_menu_category_id = ? ORDER BY sort_order ASC',
      [id]
    );

    return { ...rows[0], translations, images };
  }

  static async create(tenantId: number, data: {
    slug: string; store_id?: number | null; parent_id?: number | null; image_url?: string;
    sort_order?: number; is_active?: boolean; show_on_website?: boolean; show_on_pos?: boolean;
    show_on_kiosk?: boolean; vat_rate?: number | null; master_menu_category_id?: number | null;
    translations?: Array<{ language_id: number; name: string; description?: string }>;
    images?: Array<{ image_url: string; is_primary?: boolean; sort_order?: number }>;
  }): Promise<number> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM tenant_menu_categories WHERE tenant_id = ? AND slug = ?',
        [tenantId, data.slug]
      );
      if (existing.length > 0) throw { status: 409, message: 'Menu category with this slug already exists' };

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO tenant_menu_categories (tenant_id, store_id, parent_id, slug, image_url, sort_order, is_active,
         show_on_website, show_on_pos, show_on_kiosk, vat_rate, master_menu_category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tenantId, data.store_id || null, data.parent_id || null, data.slug, data.image_url || null,
         data.sort_order ?? 0, data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
         data.show_on_website !== undefined ? (data.show_on_website ? 1 : 0) : 1,
         data.show_on_pos !== undefined ? (data.show_on_pos ? 1 : 0) : 1,
         data.show_on_kiosk !== undefined ? (data.show_on_kiosk ? 1 : 0) : 1,
         data.vat_rate ?? null, data.master_menu_category_id || null]
      );
      const entityId = result.insertId;

      if (data.translations?.length) {
        for (const t of data.translations) {
          await conn.query(
            'INSERT INTO tenant_menu_category_translations (tenant_menu_category_id, language_id, name, description) VALUES (?, ?, ?, ?)',
            [entityId, t.language_id, t.name, t.description || null]
          );
        }
      }

      if (data.images?.length) {
        for (const img of data.images) {
          await conn.query(
            'INSERT INTO tenant_menu_category_images (tenant_menu_category_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)',
            [entityId, img.image_url, img.is_primary ? 1 : 0, img.sort_order ?? 0]
          );
        }
      }

      await conn.commit();
      return entityId;
    } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
  }

  static async update(tenantId: number, id: number, data: {
    slug?: string; store_id?: number | null; parent_id?: number | null; image_url?: string;
    sort_order?: number; is_active?: boolean; show_on_website?: boolean; show_on_pos?: boolean;
    show_on_kiosk?: boolean; vat_rate?: number | null;
    translations?: Array<{ language_id: number; name: string; description?: string }>;
    images?: Array<{ image_url: string; is_primary?: boolean; sort_order?: number }>;
  }): Promise<boolean> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM tenant_menu_categories WHERE id = ? AND tenant_id = ?', [id, tenantId]
      );
      if (existing.length === 0) throw { status: 404, message: 'Menu category not found' };

      if (data.slug) {
        const [dup] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM tenant_menu_categories WHERE tenant_id = ? AND slug = ? AND id != ?',
          [tenantId, data.slug, id]
        );
        if (dup.length > 0) throw { status: 409, message: 'Menu category with this slug already exists' };
      }

      if (data.parent_id === id) throw { status: 400, message: 'A category cannot be its own parent' };

      const fields: string[] = []; const values: any[] = [];
      if (data.slug !== undefined) { fields.push('slug = ?'); values.push(data.slug); }
      if (data.store_id !== undefined) { fields.push('store_id = ?'); values.push(data.store_id || null); }
      if (data.parent_id !== undefined) { fields.push('parent_id = ?'); values.push(data.parent_id || null); }
      if (data.image_url !== undefined) { fields.push('image_url = ?'); values.push(data.image_url || null); }
      if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
      if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }
      if (data.show_on_website !== undefined) { fields.push('show_on_website = ?'); values.push(data.show_on_website ? 1 : 0); }
      if (data.show_on_pos !== undefined) { fields.push('show_on_pos = ?'); values.push(data.show_on_pos ? 1 : 0); }
      if (data.show_on_kiosk !== undefined) { fields.push('show_on_kiosk = ?'); values.push(data.show_on_kiosk ? 1 : 0); }
      if (data.vat_rate !== undefined) { fields.push('vat_rate = ?'); values.push(data.vat_rate); }

      if (fields.length > 0) {
        values.push(id, tenantId);
        await conn.query(`UPDATE tenant_menu_categories SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`, values);
      }

      if (data.translations) {
        await conn.query('DELETE FROM tenant_menu_category_translations WHERE tenant_menu_category_id = ?', [id]);
        for (const t of data.translations) {
          await conn.query(
            'INSERT INTO tenant_menu_category_translations (tenant_menu_category_id, language_id, name, description) VALUES (?, ?, ?, ?)',
            [id, t.language_id, t.name, t.description || null]
          );
        }
      }

      if (data.images) {
        await conn.query('DELETE FROM tenant_menu_category_images WHERE tenant_menu_category_id = ?', [id]);
        for (const img of data.images) {
          await conn.query(
            'INSERT INTO tenant_menu_category_images (tenant_menu_category_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)',
            [id, img.image_url, img.is_primary ? 1 : 0, img.sort_order ?? 0]
          );
        }
      }

      await conn.commit();
      return true;
    } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
  }

  static async delete(tenantId: number, id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM tenant_menu_categories WHERE id = ? AND tenant_id = ?', [id, tenantId]
    );
    return result.affectedRows > 0;
  }

  static async getAvailableMaster(tenantId: number): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT m.*,
        CASE WHEN t.id IS NOT NULL THEN 1 ELSE 0 END as is_imported
      FROM master_menu_categories m
      LEFT JOIN tenant_menu_categories t ON t.master_menu_category_id = m.id AND t.tenant_id = ?
      WHERE m.is_active = 1
      ORDER BY m.sort_order ASC
    `, [tenantId]);

    for (const row of rows) {
      const [translations] = await pool.query<RowDataPacket[]>(
        `SELECT t.*, l.code as language_code, l.name as language_name
         FROM master_menu_category_translations t
         JOIN languages l ON t.language_id = l.id
         WHERE t.master_menu_category_id = ?
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
          'SELECT id FROM tenant_menu_categories WHERE tenant_id = ? AND master_menu_category_id = ?',
          [tenantId, masterId]
        );
        if (already.length > 0) continue;

        const [masters] = await conn.query<RowDataPacket[]>('SELECT * FROM master_menu_categories WHERE id = ?', [masterId]);
        if (masters.length === 0) continue;
        const master = masters[0];

        const [result] = await conn.query<ResultSetHeader>(
          `INSERT INTO tenant_menu_categories (tenant_id, master_menu_category_id, slug, image_url, sort_order, is_active, show_on_website, show_on_pos, show_on_kiosk)
           VALUES (?, ?, ?, ?, ?, 1, 1, 1, 1)`,
          [tenantId, masterId, master.code, master.image_url, master.sort_order]
        );
        const newId = result.insertId;
        importedIds.push(newId);

        const [masterTranslations] = await conn.query<RowDataPacket[]>(
          'SELECT * FROM master_menu_category_translations WHERE master_menu_category_id = ?', [masterId]
        );
        for (const mt of masterTranslations) {
          await conn.query(
            'INSERT INTO tenant_menu_category_translations (tenant_menu_category_id, language_id, name, description) VALUES (?, ?, ?, ?)',
            [newId, mt.language_id, mt.name, mt.description || null]
          );
        }
      }
      await conn.commit();
      return { imported_count: importedIds.length, imported_ids: importedIds };
    } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
  }
}
