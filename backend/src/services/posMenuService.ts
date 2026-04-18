import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface QuickAddInput {
  order_id: number;
  tenant_menu_item_id: number;
  quantity?: number;
  notes?: string | null;
}

export class PosMenuService {
  /**
   * POS-visible categories for a store. Includes translations.
   */
  static async getCategories(tenantId: number, storeId: number): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.*,
        (SELECT COUNT(*) FROM tenant_menu_items mi
          WHERE mi.tenant_menu_category_id = c.id AND mi.is_active = 1 AND mi.show_on_pos = 1) as item_count
       FROM tenant_menu_categories c
       WHERE c.tenant_id = ? AND c.is_active = 1 AND c.show_on_pos = 1
         AND (c.store_id IS NULL OR c.store_id = ?)
       ORDER BY c.sort_order ASC, c.id ASC`,
      [tenantId, storeId]
    );

    for (const row of rows) {
      const [trans] = await pool.query<RowDataPacket[]>(
        `SELECT t.name, l.code as language_code
         FROM tenant_menu_category_translations t
         JOIN languages l ON t.language_id = l.id
         WHERE t.tenant_menu_category_id = ?`,
        [row.id]
      );
      row.translations = trans;
    }
    return rows;
  }

  /**
   * POS-visible menu items with price + primary image + customization flags.
   */
  static async getItems(tenantId: number, params: {
    store_id: number;
    currency_id: number;
    category_id?: number;
    search?: string;
  }): Promise<any[]> {
    let query = `
      SELECT mi.id, mi.tenant_menu_category_id, mi.is_weighted, mi.is_combo, mi.is_active,
             mi.image_url, mi.vat_rate, mi.show_on_pos,
             COALESCE(p_store.price, p_any.price) as price,
             COALESCE(p_store.weight_price_per_100g, p_any.weight_price_per_100g) as weight_price_per_100g,
             (SELECT COUNT(*) FROM tenant_menu_item_addons a WHERE a.tenant_menu_item_id = mi.id) as addon_count,
             (SELECT iu.image_url FROM tenant_menu_item_images iu
               WHERE iu.tenant_menu_item_id = mi.id
               ORDER BY iu.is_primary DESC, iu.sort_order ASC LIMIT 1) as primary_image_url
      FROM tenant_menu_items mi
      LEFT JOIN tenant_menu_item_prices p_store
        ON p_store.tenant_menu_item_id = mi.id
       AND p_store.store_id = ?
       AND p_store.currency_id = ?
       AND p_store.is_active = 1
      LEFT JOIN tenant_menu_item_prices p_any
        ON p_any.tenant_menu_item_id = mi.id
       AND p_any.store_id IS NULL
       AND p_any.currency_id = ?
       AND p_any.is_active = 1
      WHERE mi.tenant_id = ? AND mi.is_active = 1 AND mi.show_on_pos = 1
    `;
    const qParams: any[] = [params.store_id, params.currency_id, params.currency_id, tenantId];

    if (params.category_id) {
      query += ' AND mi.tenant_menu_category_id = ?';
      qParams.push(params.category_id);
    }

    query += ' ORDER BY mi.sort_order ASC, mi.id ASC LIMIT 500';

    const [rows] = await pool.query<RowDataPacket[]>(query, qParams);

    if (rows.length === 0) return [];

    const itemIds = rows.map(r => Number(r.id));
    const placeholders = itemIds.map(() => '?').join(',');
    const [translations] = await pool.query<RowDataPacket[]>(
      `SELECT t.tenant_menu_item_id, t.name, t.description, l.code as language_code
       FROM tenant_menu_item_translations t
       JOIN languages l ON t.language_id = l.id
       WHERE t.tenant_menu_item_id IN (${placeholders})
       ORDER BY l.sort_order ASC`,
      itemIds
    );
    const transByItem: Record<number, any[]> = {};
    for (const tr of translations) {
      const id = Number(tr.tenant_menu_item_id);
      (transByItem[id] ||= []).push({
        language_code: tr.language_code,
        name: tr.name,
        description: tr.description,
      });
    }

    const term = params.search?.trim().toLowerCase();
    const enriched = rows.map(r => {
      const trans = transByItem[Number(r.id)] || [];
      const en = trans.find(t => t.language_code === 'en');
      const name = en?.name || trans[0]?.name || `Item #${r.id}`;
      return {
        ...r,
        translations: trans,
        name,
        requires_customization: !!r.is_weighted || !!r.is_combo || Number(r.addon_count) > 0,
      };
    });

    if (!term) return enriched;
    return enriched.filter(item => {
      if (String(item.name).toLowerCase().includes(term)) return true;
      return (item.translations || []).some((tr: any) =>
        typeof tr.name === 'string' && tr.name.toLowerCase().includes(term)
      );
    });
  }

  /**
   * Add a single menu item to an open order with default unit price.
   * For items that require customization, the client should call the
   * dedicated customize flow (44.5) instead. This endpoint only handles
   * simple items — it still accepts weighted/combo/has-addon items, but
   * without any customization payload.
   */
  static async quickAdd(tenantId: number, data: QuickAddInput): Promise<number> {
    if (!data.order_id || !data.tenant_menu_item_id) {
      throw { status: 400, message: 'order_id and tenant_menu_item_id are required' };
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Verify order belongs to tenant + is open
      const [orderRows] = await conn.query<RowDataPacket[]>(
        `SELECT id, store_id, currency_id, order_status
         FROM orders WHERE id = ? AND tenant_id = ?`,
        [data.order_id, tenantId]
      );
      if (orderRows.length === 0) throw { status: 404, message: 'Order not found' };
      if (orderRows[0].order_status !== 'open') throw { status: 400, message: 'Order is not open' };
      const order = orderRows[0];

      // Verify menu item belongs to tenant and is POS-enabled + active
      const [itemRows] = await conn.query<RowDataPacket[]>(
        `SELECT id, is_active, show_on_pos FROM tenant_menu_items WHERE id = ? AND tenant_id = ?`,
        [data.tenant_menu_item_id, tenantId]
      );
      if (itemRows.length === 0) throw { status: 400, message: 'Invalid menu item' };
      if (!itemRows[0].is_active || !itemRows[0].show_on_pos) {
        throw { status: 400, message: 'Menu item is not available on POS' };
      }

      // Resolve price (store-specific, else tenant-wide)
      const [priceRows] = await conn.query<RowDataPacket[]>(
        `SELECT price FROM tenant_menu_item_prices
         WHERE tenant_menu_item_id = ?
           AND (store_id = ? OR store_id IS NULL)
           AND currency_id = ? AND is_active = 1
         ORDER BY (store_id IS NOT NULL) DESC LIMIT 1`,
        [data.tenant_menu_item_id, order.store_id, order.currency_id]
      );
      const unitPrice = priceRows.length > 0 ? Number(priceRows[0].price) : 0;

      // Default order_item_status (prefer 'pending' if it exists)
      const [statusRows] = await conn.query<RowDataPacket[]>(
        `SELECT id FROM tenant_order_item_statuses
         WHERE tenant_id = ? AND is_active = 1
         ORDER BY (code = 'pending') DESC, sort_order ASC, id ASC LIMIT 1`,
        [tenantId]
      );
      if (statusRows.length === 0) throw { status: 400, message: 'No active tenant_order_item_statuses configured' };
      const statusId = Number(statusRows[0].id);

      const qty = data.quantity && data.quantity > 0 ? data.quantity : 1;
      const totalPrice = Math.round(qty * unitPrice * 100) / 100;

      const [insertResult] = await conn.query<ResultSetHeader>(
        `INSERT INTO order_items
         (order_id, tenant_menu_item_id, tenant_order_item_status_id, quantity, unit_price, total_price, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [data.order_id, data.tenant_menu_item_id, statusId, qty, unitPrice, totalPrice, data.notes ?? null]
      );

      // Recompute order subtotal + total
      const [sumRows] = await conn.query<RowDataPacket[]>(
        'SELECT COALESCE(SUM(total_price), 0) as subtotal FROM order_items WHERE order_id = ?',
        [data.order_id]
      );
      const subtotal = Number(sumRows[0]?.subtotal) || 0;

      const [orderTotalRows] = await conn.query<RowDataPacket[]>(
        'SELECT tax_amount, service_charge, discount_amount FROM orders WHERE id = ?',
        [data.order_id]
      );
      const tax = Number(orderTotalRows[0]?.tax_amount) || 0;
      const service = Number(orderTotalRows[0]?.service_charge) || 0;
      const discount = Number(orderTotalRows[0]?.discount_amount) || 0;
      const total = Math.round((subtotal + tax + service - discount) * 100) / 100;

      await conn.query(
        'UPDATE orders SET subtotal = ?, total = ? WHERE id = ?',
        [subtotal, total, data.order_id]
      );

      await conn.commit();
      return insertResult.insertId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}
