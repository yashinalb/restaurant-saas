import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class TenantMenuItemService {
  static async getAll(tenantId: number, filters?: { is_active?: boolean; tenant_menu_category_id?: number; is_combo?: boolean }): Promise<any[]> {
    let query = `SELECT mi.*,
      cat_t.name as category_name,
      dest_t.name as destination_name
      FROM tenant_menu_items mi
      LEFT JOIN tenant_menu_categories cat ON mi.tenant_menu_category_id = cat.id
      LEFT JOIN tenant_menu_category_translations cat_t ON cat.id = cat_t.tenant_menu_category_id AND cat_t.language_id = (SELECT id FROM languages ORDER BY sort_order LIMIT 1)
      LEFT JOIN tenant_order_destinations dest ON mi.tenant_order_destination_id = dest.id
      LEFT JOIN tenant_order_destination_translations dest_t ON dest.id = dest_t.tenant_order_destination_id AND dest_t.language_id = (SELECT id FROM languages ORDER BY sort_order LIMIT 1)
      WHERE mi.tenant_id = ?`;
    const params: any[] = [tenantId];

    if (filters?.is_active !== undefined) {
      query += ' AND mi.is_active = ?';
      params.push(filters.is_active ? 1 : 0);
    }
    if (filters?.tenant_menu_category_id !== undefined) {
      query += ' AND mi.tenant_menu_category_id = ?';
      params.push(filters.tenant_menu_category_id);
    }
    if (filters?.is_combo !== undefined) {
      query += ' AND mi.is_combo = ?';
      params.push(filters.is_combo ? 1 : 0);
    }

    query += ' ORDER BY mi.sort_order ASC, mi.id ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    for (const row of rows) {
      const [translations] = await pool.query<RowDataPacket[]>(
        `SELECT t.*, l.code as language_code, l.name as language_name
         FROM tenant_menu_item_translations t
         JOIN languages l ON t.language_id = l.id
         WHERE t.tenant_menu_item_id = ?
         ORDER BY l.sort_order`,
        [row.id]
      );
      row.translations = translations;

      const [prices] = await pool.query<RowDataPacket[]>(
        `SELECT p.*, c.code as currency_code, c.name as currency_name, s.name as store_name
         FROM tenant_menu_item_prices p
         JOIN currencies c ON p.currency_id = c.id
         LEFT JOIN stores s ON p.store_id = s.id
         WHERE p.tenant_menu_item_id = ?
         ORDER BY p.store_id ASC`,
        [row.id]
      );
      row.prices = prices;

      const [images] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM tenant_menu_item_images WHERE tenant_menu_item_id = ? ORDER BY sort_order ASC',
        [row.id]
      );
      row.images = images;
    }
    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT mi.*,
        cat_t.name as category_name,
        dest_t.name as destination_name
        FROM tenant_menu_items mi
        LEFT JOIN tenant_menu_categories cat ON mi.tenant_menu_category_id = cat.id
        LEFT JOIN tenant_menu_category_translations cat_t ON cat.id = cat_t.tenant_menu_category_id AND cat_t.language_id = (SELECT id FROM languages ORDER BY sort_order LIMIT 1)
        LEFT JOIN tenant_order_destinations dest ON mi.tenant_order_destination_id = dest.id
        LEFT JOIN tenant_order_destination_translations dest_t ON dest.id = dest_t.tenant_order_destination_id AND dest_t.language_id = (SELECT id FROM languages ORDER BY sort_order LIMIT 1)
        WHERE mi.id = ? AND mi.tenant_id = ?`,
      [id, tenantId]
    );
    if (rows.length === 0) return null;

    const [translations] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, l.code as language_code, l.name as language_name
       FROM tenant_menu_item_translations t
       JOIN languages l ON t.language_id = l.id
       WHERE t.tenant_menu_item_id = ?
       ORDER BY l.sort_order`, [id]
    );

    const [prices] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, c.code as currency_code, c.name as currency_name, s.name as store_name
       FROM tenant_menu_item_prices p
       JOIN currencies c ON p.currency_id = c.id
       LEFT JOIN stores s ON p.store_id = s.id
       WHERE p.tenant_menu_item_id = ?
       ORDER BY p.store_id ASC`, [id]
    );

    const [images] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tenant_menu_item_images WHERE tenant_menu_item_id = ? ORDER BY sort_order ASC',
      [id]
    );

    const [addons] = await pool.query<RowDataPacket[]>(
      `SELECT a.*, at.name as addon_name
       FROM tenant_menu_item_addons a
       JOIN tenant_addons ta ON a.tenant_addon_id = ta.id
       LEFT JOIN tenant_addon_translations at ON ta.id = at.tenant_addon_id AND at.language_id = (SELECT id FROM languages ORDER BY sort_order LIMIT 1)
       WHERE a.tenant_menu_item_id = ?
       ORDER BY a.sort_order ASC`, [id]
    );

    for (const addon of addons) {
      const [addonTranslations] = await pool.query<RowDataPacket[]>(
        `SELECT t.*, l.code as language_code, l.name as language_name
         FROM tenant_addon_translations t
         JOIN languages l ON t.language_id = l.id
         WHERE t.tenant_addon_id = ?
         ORDER BY l.sort_order`, [addon.tenant_addon_id]
      );
      addon.translations = addonTranslations;
    }

    const [ingredients] = await pool.query<RowDataPacket[]>(
      `SELECT i.*, it.name as ingredient_name
       FROM tenant_menu_item_ingredients i
       JOIN tenant_ingredients ti ON i.tenant_ingredient_id = ti.id
       LEFT JOIN tenant_ingredient_translations it ON ti.id = it.tenant_ingredient_id AND it.language_id = (SELECT id FROM languages ORDER BY sort_order LIMIT 1)
       WHERE i.tenant_menu_item_id = ?
       ORDER BY i.sort_order ASC`, [id]
    );

    for (const ingredient of ingredients) {
      const [ingredientTranslations] = await pool.query<RowDataPacket[]>(
        `SELECT t.*, l.code as language_code, l.name as language_name
         FROM tenant_ingredient_translations t
         JOIN languages l ON t.language_id = l.id
         WHERE t.tenant_ingredient_id = ?
         ORDER BY l.sort_order`, [ingredient.tenant_ingredient_id]
      );
      ingredient.translations = ingredientTranslations;
    }

    return { ...rows[0], translations, prices, images, addons, ingredients };
  }

  static async create(tenantId: number, data: {
    tenant_menu_category_id?: number | null; tenant_order_destination_id?: number | null;
    image_url?: string; sort_order?: number; is_active?: boolean; is_weighted?: boolean;
    vat_rate?: number | null; is_combo?: boolean;
    show_ingredients_website?: boolean; show_ingredients_pos?: boolean; show_ingredients_kiosk?: boolean;
    show_addon_names_website?: boolean; show_addon_prices_website?: boolean;
    show_addon_names_pos?: boolean; show_addon_names_kiosk?: boolean; show_addon_prices_kiosk?: boolean;
    show_on_website?: boolean; show_on_pos?: boolean; show_on_kiosk?: boolean;
    translations?: Array<{ language_id: number; name: string; slug?: string; description?: string; short_description?: string }>;
    prices?: Array<{ store_id?: number | null; currency_id: number; price: number; weight_price_per_100g?: number | null; is_active?: boolean }>;
    images?: Array<{ image_url: string; is_primary?: boolean; sort_order?: number }>;
    addons?: Array<{ tenant_addon_id: number; is_default?: boolean; is_required?: boolean; max_quantity?: number; sort_order?: number }>;
    ingredients?: Array<{ tenant_ingredient_id: number; is_removable?: boolean; sort_order?: number }>;
  }): Promise<number> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO tenant_menu_items (tenant_id, tenant_menu_category_id, tenant_order_destination_id,
         image_url, sort_order, is_active, is_weighted, vat_rate, is_combo,
         show_ingredients_website, show_ingredients_pos, show_ingredients_kiosk,
         show_addon_names_website, show_addon_prices_website, show_addon_names_pos,
         show_addon_names_kiosk, show_addon_prices_kiosk,
         show_on_website, show_on_pos, show_on_kiosk) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tenantId, data.tenant_menu_category_id || null, data.tenant_order_destination_id || null,
         data.image_url || null, data.sort_order ?? 0,
         data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
         data.is_weighted !== undefined ? (data.is_weighted ? 1 : 0) : 0,
         data.vat_rate ?? null,
         data.is_combo !== undefined ? (data.is_combo ? 1 : 0) : 0,
         data.show_ingredients_website !== undefined ? (data.show_ingredients_website ? 1 : 0) : 1,
         data.show_ingredients_pos !== undefined ? (data.show_ingredients_pos ? 1 : 0) : 1,
         data.show_ingredients_kiosk !== undefined ? (data.show_ingredients_kiosk ? 1 : 0) : 1,
         data.show_addon_names_website !== undefined ? (data.show_addon_names_website ? 1 : 0) : 1,
         data.show_addon_prices_website !== undefined ? (data.show_addon_prices_website ? 1 : 0) : 1,
         data.show_addon_names_pos !== undefined ? (data.show_addon_names_pos ? 1 : 0) : 1,
         data.show_addon_names_kiosk !== undefined ? (data.show_addon_names_kiosk ? 1 : 0) : 1,
         data.show_addon_prices_kiosk !== undefined ? (data.show_addon_prices_kiosk ? 1 : 0) : 1,
         data.show_on_website !== undefined ? (data.show_on_website ? 1 : 0) : 1,
         data.show_on_pos !== undefined ? (data.show_on_pos ? 1 : 0) : 1,
         data.show_on_kiosk !== undefined ? (data.show_on_kiosk ? 1 : 0) : 1]
      );
      const entityId = result.insertId;

      if (data.translations?.length) {
        for (const t of data.translations) {
          await conn.query(
            'INSERT INTO tenant_menu_item_translations (tenant_menu_item_id, language_id, name, slug, description, short_description) VALUES (?, ?, ?, ?, ?, ?)',
            [entityId, t.language_id, t.name, t.slug || null, t.description || null, t.short_description || null]
          );
        }
      }

      if (data.prices?.length) {
        for (const p of data.prices) {
          await conn.query(
            'INSERT INTO tenant_menu_item_prices (tenant_menu_item_id, store_id, currency_id, price, weight_price_per_100g, is_active) VALUES (?, ?, ?, ?, ?, ?)',
            [entityId, p.store_id || null, p.currency_id, p.price, p.weight_price_per_100g ?? null,
             p.is_active !== undefined ? (p.is_active ? 1 : 0) : 1]
          );
        }
      }

      if (data.images?.length) {
        for (const img of data.images) {
          await conn.query(
            'INSERT INTO tenant_menu_item_images (tenant_menu_item_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)',
            [entityId, img.image_url, img.is_primary ? 1 : 0, img.sort_order ?? 0]
          );
        }
      }

      if (data.addons?.length) {
        for (const a of data.addons) {
          await conn.query(
            'INSERT INTO tenant_menu_item_addons (tenant_menu_item_id, tenant_addon_id, is_default, is_required, max_quantity, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
            [entityId, a.tenant_addon_id,
             a.is_default ? 1 : 0, a.is_required ? 1 : 0,
             a.max_quantity ?? null, a.sort_order ?? 0]
          );
        }
      }

      if (data.ingredients?.length) {
        for (const i of data.ingredients) {
          await conn.query(
            'INSERT INTO tenant_menu_item_ingredients (tenant_menu_item_id, tenant_ingredient_id, is_removable, sort_order) VALUES (?, ?, ?, ?)',
            [entityId, i.tenant_ingredient_id,
             i.is_removable !== undefined ? (i.is_removable ? 1 : 0) : 1,
             i.sort_order ?? 0]
          );
        }
      }

      await conn.commit();
      return entityId;
    } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
  }

  static async update(tenantId: number, id: number, data: {
    tenant_menu_category_id?: number | null; tenant_order_destination_id?: number | null;
    image_url?: string; sort_order?: number; is_active?: boolean; is_weighted?: boolean;
    vat_rate?: number | null; is_combo?: boolean;
    show_ingredients_website?: boolean; show_ingredients_pos?: boolean; show_ingredients_kiosk?: boolean;
    show_addon_names_website?: boolean; show_addon_prices_website?: boolean;
    show_addon_names_pos?: boolean; show_addon_names_kiosk?: boolean; show_addon_prices_kiosk?: boolean;
    show_on_website?: boolean; show_on_pos?: boolean; show_on_kiosk?: boolean;
    translations?: Array<{ language_id: number; name: string; slug?: string; description?: string; short_description?: string }>;
    prices?: Array<{ store_id?: number | null; currency_id: number; price: number; weight_price_per_100g?: number | null; is_active?: boolean }>;
    images?: Array<{ image_url: string; is_primary?: boolean; sort_order?: number }>;
    addons?: Array<{ tenant_addon_id: number; is_default?: boolean; is_required?: boolean; max_quantity?: number; sort_order?: number }>;
    ingredients?: Array<{ tenant_ingredient_id: number; is_removable?: boolean; sort_order?: number }>;
  }): Promise<boolean> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM tenant_menu_items WHERE id = ? AND tenant_id = ?', [id, tenantId]
      );
      if (existing.length === 0) throw { status: 404, message: 'Menu item not found' };

      const fields: string[] = []; const values: any[] = [];
      if (data.tenant_menu_category_id !== undefined) { fields.push('tenant_menu_category_id = ?'); values.push(data.tenant_menu_category_id || null); }
      if (data.tenant_order_destination_id !== undefined) { fields.push('tenant_order_destination_id = ?'); values.push(data.tenant_order_destination_id || null); }
      if (data.image_url !== undefined) { fields.push('image_url = ?'); values.push(data.image_url || null); }
      if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
      if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }
      if (data.is_weighted !== undefined) { fields.push('is_weighted = ?'); values.push(data.is_weighted ? 1 : 0); }
      if (data.vat_rate !== undefined) { fields.push('vat_rate = ?'); values.push(data.vat_rate); }
      if (data.is_combo !== undefined) { fields.push('is_combo = ?'); values.push(data.is_combo ? 1 : 0); }
      if (data.show_ingredients_website !== undefined) { fields.push('show_ingredients_website = ?'); values.push(data.show_ingredients_website ? 1 : 0); }
      if (data.show_ingredients_pos !== undefined) { fields.push('show_ingredients_pos = ?'); values.push(data.show_ingredients_pos ? 1 : 0); }
      if (data.show_ingredients_kiosk !== undefined) { fields.push('show_ingredients_kiosk = ?'); values.push(data.show_ingredients_kiosk ? 1 : 0); }
      if (data.show_addon_names_website !== undefined) { fields.push('show_addon_names_website = ?'); values.push(data.show_addon_names_website ? 1 : 0); }
      if (data.show_addon_prices_website !== undefined) { fields.push('show_addon_prices_website = ?'); values.push(data.show_addon_prices_website ? 1 : 0); }
      if (data.show_addon_names_pos !== undefined) { fields.push('show_addon_names_pos = ?'); values.push(data.show_addon_names_pos ? 1 : 0); }
      if (data.show_addon_names_kiosk !== undefined) { fields.push('show_addon_names_kiosk = ?'); values.push(data.show_addon_names_kiosk ? 1 : 0); }
      if (data.show_addon_prices_kiosk !== undefined) { fields.push('show_addon_prices_kiosk = ?'); values.push(data.show_addon_prices_kiosk ? 1 : 0); }
      if (data.show_on_website !== undefined) { fields.push('show_on_website = ?'); values.push(data.show_on_website ? 1 : 0); }
      if (data.show_on_pos !== undefined) { fields.push('show_on_pos = ?'); values.push(data.show_on_pos ? 1 : 0); }
      if (data.show_on_kiosk !== undefined) { fields.push('show_on_kiosk = ?'); values.push(data.show_on_kiosk ? 1 : 0); }

      if (fields.length > 0) {
        values.push(id, tenantId);
        await conn.query(`UPDATE tenant_menu_items SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`, values);
      }

      if (data.translations) {
        await conn.query('DELETE FROM tenant_menu_item_translations WHERE tenant_menu_item_id = ?', [id]);
        for (const t of data.translations) {
          await conn.query(
            'INSERT INTO tenant_menu_item_translations (tenant_menu_item_id, language_id, name, slug, description, short_description) VALUES (?, ?, ?, ?, ?, ?)',
            [id, t.language_id, t.name, t.slug || null, t.description || null, t.short_description || null]
          );
        }
      }

      if (data.prices) {
        await conn.query('DELETE FROM tenant_menu_item_prices WHERE tenant_menu_item_id = ?', [id]);
        for (const p of data.prices) {
          await conn.query(
            'INSERT INTO tenant_menu_item_prices (tenant_menu_item_id, store_id, currency_id, price, weight_price_per_100g, is_active) VALUES (?, ?, ?, ?, ?, ?)',
            [id, p.store_id || null, p.currency_id, p.price, p.weight_price_per_100g ?? null,
             p.is_active !== undefined ? (p.is_active ? 1 : 0) : 1]
          );
        }
      }

      if (data.images) {
        await conn.query('DELETE FROM tenant_menu_item_images WHERE tenant_menu_item_id = ?', [id]);
        for (const img of data.images) {
          await conn.query(
            'INSERT INTO tenant_menu_item_images (tenant_menu_item_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)',
            [id, img.image_url, img.is_primary ? 1 : 0, img.sort_order ?? 0]
          );
        }
      }

      if (data.addons) {
        await conn.query('DELETE FROM tenant_menu_item_addons WHERE tenant_menu_item_id = ?', [id]);
        for (const a of data.addons) {
          await conn.query(
            'INSERT INTO tenant_menu_item_addons (tenant_menu_item_id, tenant_addon_id, is_default, is_required, max_quantity, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
            [id, a.tenant_addon_id,
             a.is_default ? 1 : 0, a.is_required ? 1 : 0,
             a.max_quantity ?? null, a.sort_order ?? 0]
          );
        }
      }

      if (data.ingredients) {
        await conn.query('DELETE FROM tenant_menu_item_ingredients WHERE tenant_menu_item_id = ?', [id]);
        for (const i of data.ingredients) {
          await conn.query(
            'INSERT INTO tenant_menu_item_ingredients (tenant_menu_item_id, tenant_ingredient_id, is_removable, sort_order) VALUES (?, ?, ?, ?)',
            [id, i.tenant_ingredient_id,
             i.is_removable !== undefined ? (i.is_removable ? 1 : 0) : 1,
             i.sort_order ?? 0]
          );
        }
      }

      await conn.commit();
      return true;
    } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
  }

  static async delete(tenantId: number, id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM tenant_menu_items WHERE id = ? AND tenant_id = ?', [id, tenantId]
    );
    return result.affectedRows > 0;
  }
}
