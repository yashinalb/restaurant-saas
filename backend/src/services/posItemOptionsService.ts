import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface SelectedAddon {
  tenant_addon_id: number;
  quantity?: number;
}

interface AddItemInput {
  order_id: number;
  tenant_menu_item_id: number;
  quantity?: number;
  weight_grams?: number | null;
  selected_addons?: SelectedAddon[];
  removed_ingredient_ids?: number[];
  notes?: string | null;
  seat_number?: number | null;
  course_code?: string | null;
  course_hold?: boolean;
}

export class PosItemOptionsService {
  /**
   * Returns full customization data for a menu item: base price, addons
   * grouped by type, ingredients (removable), and weighted-price info.
   */
  static async getOptions(
    tenantId: number,
    itemId: number,
    params: { store_id: number; currency_id: number }
  ): Promise<any> {
    const [itemRows] = await pool.query<RowDataPacket[]>(
      `SELECT mi.*,
         (SELECT t.name FROM tenant_menu_item_translations t
            JOIN languages l ON l.id = t.language_id
            WHERE t.tenant_menu_item_id = mi.id
            ORDER BY (l.code = 'en') DESC, l.sort_order ASC LIMIT 1) as name
       FROM tenant_menu_items mi
       WHERE mi.id = ? AND mi.tenant_id = ?`,
      [itemId, tenantId]
    );
    if (itemRows.length === 0) throw { status: 404, message: 'Menu item not found' };
    const item = itemRows[0];

    // Translations
    const [itemTrans] = await pool.query<RowDataPacket[]>(
      `SELECT t.name, t.description, l.code as language_code
       FROM tenant_menu_item_translations t
       JOIN languages l ON t.language_id = l.id
       WHERE t.tenant_menu_item_id = ?
       ORDER BY l.sort_order ASC`,
      [itemId]
    );
    item.translations = itemTrans;

    // Base price
    const [priceRows] = await pool.query<RowDataPacket[]>(
      `SELECT price, weight_price_per_100g FROM tenant_menu_item_prices
       WHERE tenant_menu_item_id = ?
         AND (store_id = ? OR store_id IS NULL)
         AND currency_id = ? AND is_active = 1
       ORDER BY (store_id IS NOT NULL) DESC LIMIT 1`,
      [itemId, params.store_id, params.currency_id]
    );
    item.base_price = priceRows.length > 0 ? Number(priceRows[0].price) : 0;
    item.weight_price_per_100g = priceRows.length > 0 && priceRows[0].weight_price_per_100g != null
      ? Number(priceRows[0].weight_price_per_100g)
      : null;

    // Addons linked to this item (with prices + type)
    const [addonRows] = await pool.query<RowDataPacket[]>(
      `SELECT mia.id as link_id, mia.is_default, mia.is_required, mia.max_quantity, mia.sort_order as link_sort,
              a.id, a.tenant_addon_type_id, a.sort_order as addon_sort,
              at.code as addon_type_code,
              COALESCE(ap_store.price, ap_any.price, 0) as price
       FROM tenant_menu_item_addons mia
       JOIN tenant_addons a ON a.id = mia.tenant_addon_id
       JOIN tenant_addon_types at ON at.id = a.tenant_addon_type_id
       LEFT JOIN tenant_addon_prices ap_store
         ON ap_store.tenant_addon_id = a.id AND ap_store.store_id = ?
        AND ap_store.currency_id = ? AND ap_store.is_active = 1
       LEFT JOIN tenant_addon_prices ap_any
         ON ap_any.tenant_addon_id = a.id AND ap_any.store_id IS NULL
        AND ap_any.currency_id = ? AND ap_any.is_active = 1
       WHERE mia.tenant_menu_item_id = ? AND a.is_active = 1
       ORDER BY at.sort_order ASC, mia.sort_order ASC, a.sort_order ASC`,
      [params.store_id, params.currency_id, params.currency_id, itemId]
    );

    // Translations for addons + addon types
    const addonIds = addonRows.map(a => Number(a.id));
    const addonTrans: Record<number, any[]> = {};
    const typeTrans: Record<number, any[]> = {};
    if (addonIds.length > 0) {
      const placeholders = addonIds.map(() => '?').join(',');
      const [trans] = await pool.query<RowDataPacket[]>(
        `SELECT t.tenant_addon_id, t.name, l.code as language_code
         FROM tenant_addon_translations t
         JOIN languages l ON t.language_id = l.id
         WHERE t.tenant_addon_id IN (${placeholders})
         ORDER BY l.sort_order ASC`,
        addonIds
      );
      for (const tr of trans) {
        const id = Number(tr.tenant_addon_id);
        (addonTrans[id] ||= []).push({ language_code: tr.language_code, name: tr.name });
      }

      const typeIds = Array.from(new Set(addonRows.map(a => Number(a.tenant_addon_type_id))));
      const typePlace = typeIds.map(() => '?').join(',');
      const [typeTransRows] = await pool.query<RowDataPacket[]>(
        `SELECT t.tenant_addon_type_id, t.name, l.code as language_code
         FROM tenant_addon_type_translations t
         JOIN languages l ON t.language_id = l.id
         WHERE t.tenant_addon_type_id IN (${typePlace})
         ORDER BY l.sort_order ASC`,
        typeIds
      );
      for (const tr of typeTransRows) {
        const id = Number(tr.tenant_addon_type_id);
        (typeTrans[id] ||= []).push({ language_code: tr.language_code, name: tr.name });
      }
    }

    // Group addons by addon type (portion vs extras/sauces/etc)
    const groups: Record<number, any> = {};
    for (const a of addonRows) {
      const typeId = Number(a.tenant_addon_type_id);
      if (!groups[typeId]) {
        const ttrans = typeTrans[typeId] || [];
        const typeName = ttrans.find(t => t.language_code === 'en')?.name || ttrans[0]?.name || a.addon_type_code;
        groups[typeId] = {
          tenant_addon_type_id: typeId,
          code: a.addon_type_code,
          name: typeName,
          translations: ttrans,
          // Portions are single-select (one mandatory choice), others multi-select
          is_portion: a.addon_type_code === 'portion',
          addons: [] as any[],
        };
      }
      const atrans = addonTrans[Number(a.id)] || [];
      const aname = atrans.find(t => t.language_code === 'en')?.name || atrans[0]?.name || `Addon #${a.id}`;
      groups[typeId].addons.push({
        id: Number(a.id),
        name: aname,
        translations: atrans,
        price: Number(a.price) || 0,
        is_default: !!a.is_default,
        is_required: !!a.is_required,
        max_quantity: Number(a.max_quantity) || 1,
        sort_order: Number(a.addon_sort) || 0,
      });
    }

    // Ingredients (show if item allows display, with is_removable flag)
    const [ingredientRows] = await pool.query<RowDataPacket[]>(
      `SELECT mi2.id as link_id, mi2.is_removable, mi2.sort_order,
              ing.id
       FROM tenant_menu_item_ingredients mi2
       JOIN tenant_ingredients ing ON ing.id = mi2.tenant_ingredient_id
       WHERE mi2.tenant_menu_item_id = ? AND ing.is_active = 1
       ORDER BY mi2.sort_order ASC`,
      [itemId]
    );
    const ingredientIds = ingredientRows.map(r => Number(r.id));
    const ingTrans: Record<number, any[]> = {};
    if (ingredientIds.length > 0) {
      const placeholders = ingredientIds.map(() => '?').join(',');
      const [trans] = await pool.query<RowDataPacket[]>(
        `SELECT t.tenant_ingredient_id, t.name, l.code as language_code
         FROM tenant_ingredient_translations t
         JOIN languages l ON t.language_id = l.id
         WHERE t.tenant_ingredient_id IN (${placeholders})
         ORDER BY l.sort_order ASC`,
        ingredientIds
      );
      for (const tr of trans) {
        const id = Number(tr.tenant_ingredient_id);
        (ingTrans[id] ||= []).push({ language_code: tr.language_code, name: tr.name });
      }
    }
    const ingredients = ingredientRows.map(r => {
      const trans = ingTrans[Number(r.id)] || [];
      const name = trans.find(t => t.language_code === 'en')?.name || trans[0]?.name || `Ingredient #${r.id}`;
      return {
        id: Number(r.id),
        name,
        translations: trans,
        is_removable: !!r.is_removable,
      };
    });

    // Combo links (if is_combo)
    let combo_items: any[] = [];
    if (item.is_combo) {
      const [linkRows] = await pool.query<RowDataPacket[]>(
        `SELECT cl.*,
          (SELECT t.name FROM tenant_menu_item_translations t
             JOIN languages l ON l.id = t.language_id
             WHERE t.tenant_menu_item_id = cl.component_menu_item_id
             ORDER BY (l.code = 'en') DESC, l.sort_order ASC LIMIT 1) as name
         FROM tenant_menu_item_combo_links cl
         WHERE cl.combo_menu_item_id = ?
         ORDER BY cl.sort_order ASC`,
        [itemId]
      ).catch(() => [[]] as any);
      combo_items = linkRows as any[];
    }

    return {
      item: {
        id: Number(item.id),
        name: item.name,
        translations: item.translations,
        is_weighted: !!item.is_weighted,
        is_combo: !!item.is_combo,
        vat_rate: item.vat_rate != null ? Number(item.vat_rate) : null,
        base_price: item.base_price,
        weight_price_per_100g: item.weight_price_per_100g,
        image_url: item.image_url,
      },
      addon_groups: Object.values(groups).sort((a: any, b: any) => (a.is_portion === b.is_portion ? 0 : a.is_portion ? -1 : 1)),
      ingredients,
      combo_items,
    };
  }

  /**
   * Add a customized line item. Computes unit price from base + selected addons
   * (+ portion pricing if applicable) and weighted kg input.
   */
  static async addItem(tenantId: number, data: AddItemInput): Promise<number> {
    if (!data.order_id || !data.tenant_menu_item_id) {
      throw { status: 400, message: 'order_id and tenant_menu_item_id are required' };
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Verify order open + belongs to tenant
      const [orderRows] = await conn.query<RowDataPacket[]>(
        `SELECT id, store_id, currency_id, order_status FROM orders WHERE id = ? AND tenant_id = ?`,
        [data.order_id, tenantId]
      );
      if (orderRows.length === 0) throw { status: 404, message: 'Order not found' };
      if (orderRows[0].order_status !== 'open') throw { status: 400, message: 'Order is not open' };
      const order = orderRows[0];

      // Verify menu item
      const [itemRows] = await conn.query<RowDataPacket[]>(
        `SELECT id, is_weighted, is_active, show_on_pos FROM tenant_menu_items WHERE id = ? AND tenant_id = ?`,
        [data.tenant_menu_item_id, tenantId]
      );
      if (itemRows.length === 0) throw { status: 400, message: 'Invalid menu item' };
      if (!itemRows[0].is_active || !itemRows[0].show_on_pos) {
        throw { status: 400, message: 'Menu item is not available on POS' };
      }
      const isWeighted = !!itemRows[0].is_weighted;

      // Base price
      const [priceRows] = await conn.query<RowDataPacket[]>(
        `SELECT price, weight_price_per_100g FROM tenant_menu_item_prices
         WHERE tenant_menu_item_id = ?
           AND (store_id = ? OR store_id IS NULL)
           AND currency_id = ? AND is_active = 1
         ORDER BY (store_id IS NOT NULL) DESC LIMIT 1`,
        [data.tenant_menu_item_id, order.store_id, order.currency_id]
      );
      let basePrice = priceRows.length > 0 ? Number(priceRows[0].price) : 0;
      const weightPer100g = priceRows.length > 0 && priceRows[0].weight_price_per_100g != null
        ? Number(priceRows[0].weight_price_per_100g) : null;

      // Weighted pricing: override base price with kg * (price/100g) * 10
      let weightedPortion: number | null = null;
      if (isWeighted) {
        const grams = Number(data.weight_grams) || 0;
        if (grams <= 0) throw { status: 400, message: 'weight_grams is required for weighted items' };
        weightedPortion = grams;
        if (weightPer100g != null) {
          basePrice = Math.round(((grams / 100) * weightPer100g) * 100) / 100;
        }
      }

      // Selected addons — resolve names + prices from DB to prevent tampering
      const selectedAddons = Array.isArray(data.selected_addons) ? data.selected_addons : [];
      const addonSnapshot: any[] = [];
      let addonTotal = 0;
      if (selectedAddons.length > 0) {
        const ids = selectedAddons.map(a => Number(a.tenant_addon_id)).filter(Boolean);
        if (ids.length > 0) {
          const placeholders = ids.map(() => '?').join(',');
          const [rows] = await conn.query<RowDataPacket[]>(
            `SELECT a.id, a.tenant_addon_type_id, at.code as addon_type_code,
                    COALESCE(ap_store.price, ap_any.price, 0) as price
             FROM tenant_addons a
             JOIN tenant_addon_types at ON at.id = a.tenant_addon_type_id
             LEFT JOIN tenant_addon_prices ap_store
               ON ap_store.tenant_addon_id = a.id AND ap_store.store_id = ?
              AND ap_store.currency_id = ? AND ap_store.is_active = 1
             LEFT JOIN tenant_addon_prices ap_any
               ON ap_any.tenant_addon_id = a.id AND ap_any.store_id IS NULL
              AND ap_any.currency_id = ? AND ap_any.is_active = 1
             WHERE a.id IN (${placeholders}) AND a.tenant_id = ? AND a.is_active = 1`,
            [order.store_id, order.currency_id, order.currency_id, ...ids, tenantId]
          );
          const priceMap: Record<number, any> = {};
          for (const r of rows) priceMap[Number(r.id)] = r;

          // Fetch name translations
          const [trans] = await conn.query<RowDataPacket[]>(
            `SELECT t.tenant_addon_id, t.name, l.code as language_code
             FROM tenant_addon_translations t
             JOIN languages l ON l.id = t.language_id
             WHERE t.tenant_addon_id IN (${placeholders})
             ORDER BY (l.code = 'en') DESC, l.sort_order ASC`,
            ids
          );
          const nameMap: Record<number, string> = {};
          for (const tr of trans) {
            const id = Number(tr.tenant_addon_id);
            if (!nameMap[id]) nameMap[id] = tr.name;
          }

          for (const sa of selectedAddons) {
            const row = priceMap[Number(sa.tenant_addon_id)];
            if (!row) continue;
            const qty = sa.quantity && sa.quantity > 0 ? sa.quantity : 1;
            const price = Number(row.price) || 0;
            addonTotal += price * qty;
            addonSnapshot.push({
              addon_id: Number(row.id),
              addon_type_id: Number(row.tenant_addon_type_id),
              addon_type_code: row.addon_type_code,
              name: nameMap[Number(row.id)] || `Addon #${row.id}`,
              price,
              quantity: qty,
            });
          }
        }
      }

      // Ingredients snapshot (removed ones)
      const removedIngredientIds = Array.isArray(data.removed_ingredient_ids) ? data.removed_ingredient_ids : [];
      let ingredientSnapshot: any[] = [];
      if (removedIngredientIds.length > 0) {
        const ids = removedIngredientIds.map(i => Number(i)).filter(Boolean);
        if (ids.length > 0) {
          const placeholders = ids.map(() => '?').join(',');
          const [rows] = await conn.query<RowDataPacket[]>(
            `SELECT ing.id,
               (SELECT t.name FROM tenant_ingredient_translations t
                  JOIN languages l ON l.id = t.language_id
                  WHERE t.tenant_ingredient_id = ing.id
                  ORDER BY (l.code = 'en') DESC, l.sort_order ASC LIMIT 1) as name
             FROM tenant_ingredients ing
             WHERE ing.id IN (${placeholders}) AND ing.tenant_id = ?`,
            [...ids, tenantId]
          );
          ingredientSnapshot = (rows as any[]).map(r => ({
            ingredient_id: Number(r.id),
            name: r.name || `Ingredient #${r.id}`,
            removed: true,
          }));
        }
      }

      // Default order item status (prefer 'pending')
      const [statusRows] = await conn.query<RowDataPacket[]>(
        `SELECT id FROM tenant_order_item_statuses
         WHERE tenant_id = ? AND is_active = 1
         ORDER BY (code = 'pending') DESC, sort_order ASC, id ASC LIMIT 1`,
        [tenantId]
      );
      if (statusRows.length === 0) throw { status: 400, message: 'No active tenant_order_item_statuses configured' };
      const statusId = Number(statusRows[0].id);

      const qty = data.quantity && data.quantity > 0 ? data.quantity : 1;
      const unitPrice = Math.round((basePrice + addonTotal) * 100) / 100;
      const totalPrice = Math.round(qty * unitPrice * 100) / 100;

      const [insertResult] = await conn.query<ResultSetHeader>(
        `INSERT INTO order_items
         (order_id, tenant_menu_item_id, tenant_order_item_status_id, quantity, unit_price, total_price,
          weighted_portion, selected_addons, selected_ingredients, notes,
          seat_number, course_code, course_hold)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.order_id, data.tenant_menu_item_id, statusId, qty, unitPrice, totalPrice,
          weightedPortion,
          addonSnapshot.length > 0 ? JSON.stringify(addonSnapshot) : null,
          ingredientSnapshot.length > 0 ? JSON.stringify(ingredientSnapshot) : null,
          data.notes ?? null,
          data.seat_number ?? null,
          data.course_code ?? null,
          data.course_hold ? 1 : 0,
        ]
      );

      // Recompute order totals (mirrors quickAdd)
      const [sumRows] = await conn.query<RowDataPacket[]>(
        'SELECT COALESCE(SUM(total_price), 0) as subtotal FROM order_items WHERE order_id = ?',
        [data.order_id]
      );
      const subtotal = Number(sumRows[0]?.subtotal) || 0;
      const [tr] = await conn.query<RowDataPacket[]>(
        'SELECT tax_amount, service_charge, discount_amount FROM orders WHERE id = ?',
        [data.order_id]
      );
      const tax = Number(tr[0]?.tax_amount) || 0;
      const service = Number(tr[0]?.service_charge) || 0;
      const discount = Number(tr[0]?.discount_amount) || 0;
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
