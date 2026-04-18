import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';

type OrderStatus = 'open' | 'closed' | 'cancelled' | 'void';
const VALID_STATUSES: OrderStatus[] = ['open', 'closed', 'cancelled', 'void'];

interface OrderItemInput {
  id?: number;
  tenant_menu_item_id: number;
  tenant_order_item_status_id: number;
  quantity: number;
  unit_price: number;
  weighted_portion?: number | null;
  selected_addons?: any | null;
  selected_ingredients?: any | null;
  notes?: string | null;
}

interface OrderInput {
  store_id: number;
  tenant_order_source_id: number;
  tenant_order_type_id: number;
  currency_id: number;
  tenant_customer_id?: number | null;
  tenant_waiter_id?: number | null;
  table_id?: number | null;
  tenant_payment_status_id?: number | null;
  order_status?: OrderStatus;
  service_charge?: number;
  discount_amount?: number;
  tax_amount?: number;
  is_joined?: boolean;
  joined_tables?: number[] | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  delivery_address?: string | null;
  notes?: string | null;
  items?: OrderItemInput[];
}

export class OrderService {
  private static async generateOrderNumber(conn: PoolConnection, tenantId: number, storeId: number): Promise<string> {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const prefix = `${yyyy}${mm}${dd}`;

    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT COUNT(*) as cnt FROM orders
       WHERE tenant_id = ? AND store_id = ? AND order_number LIKE ?`,
      [tenantId, storeId, `${prefix}-%`]
    );
    const next = String((rows[0]?.cnt as number ?? 0) + 1).padStart(4, '0');
    return `${prefix}-${next}`;
  }

  private static recomputeTotal(subtotal: number, tax: number, service: number, discount: number): number {
    const total = subtotal + tax + service - discount;
    return Math.round(total * 100) / 100;
  }

  private static async syncItemsAndTotals(conn: PoolConnection, orderId: number, items: OrderItemInput[] | undefined, overrides: { tax_amount?: number; service_charge?: number; discount_amount?: number }): Promise<void> {
    if (items !== undefined) {
      await conn.query('DELETE FROM order_items WHERE order_id = ?', [orderId]);
      for (const it of items) {
        const qty = it.quantity ?? 1;
        const unit = Number(it.unit_price) || 0;
        const total = Math.round(qty * unit * 100) / 100;
        await conn.query(
          `INSERT INTO order_items
           (order_id, tenant_menu_item_id, tenant_order_item_status_id, quantity, unit_price, total_price,
            weighted_portion, selected_addons, selected_ingredients, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderId, it.tenant_menu_item_id, it.tenant_order_item_status_id, qty, unit, total,
           it.weighted_portion ?? null,
           it.selected_addons ? JSON.stringify(it.selected_addons) : null,
           it.selected_ingredients ? JSON.stringify(it.selected_ingredients) : null,
           it.notes ?? null]
        );
      }
    }

    const [sumRows] = await conn.query<RowDataPacket[]>(
      'SELECT COALESCE(SUM(total_price), 0) as subtotal FROM order_items WHERE order_id = ?', [orderId]
    );
    const subtotal = Number(sumRows[0]?.subtotal) || 0;

    const [currentRows] = await conn.query<RowDataPacket[]>(
      'SELECT tax_amount, service_charge, discount_amount FROM orders WHERE id = ?', [orderId]
    );
    const current = currentRows[0];
    const tax = overrides.tax_amount ?? Number(current?.tax_amount) ?? 0;
    const service = overrides.service_charge ?? Number(current?.service_charge) ?? 0;
    const discount = overrides.discount_amount ?? Number(current?.discount_amount) ?? 0;
    const total = this.recomputeTotal(subtotal, tax, service, discount);

    await conn.query(
      'UPDATE orders SET subtotal = ?, tax_amount = ?, service_charge = ?, discount_amount = ?, total = ? WHERE id = ?',
      [subtotal, tax, service, discount, total, orderId]
    );
  }

  static async getAll(tenantId: number, filters?: {
    store_id?: number; order_status?: string; tenant_customer_id?: number; tenant_waiter_id?: number;
    table_id?: number; from_date?: string; to_date?: string; limit?: number; offset?: number;
  }): Promise<any[]> {
    let query = `
      SELECT o.*,
        s.name as store_name,
        c.name as customer_name,
        w.name as waiter_name,
        t.name as table_name,
        cur.code as currency_code
      FROM orders o
      LEFT JOIN stores s ON s.id = o.store_id
      LEFT JOIN tenant_customers c ON c.id = o.tenant_customer_id
      LEFT JOIN tenant_waiters w ON w.id = o.tenant_waiter_id
      LEFT JOIN tenant_table_structures t ON t.id = o.table_id
      LEFT JOIN currencies cur ON cur.id = o.currency_id
      WHERE o.tenant_id = ?
    `;
    const params: any[] = [tenantId];
    if (filters?.store_id) { query += ' AND o.store_id = ?'; params.push(filters.store_id); }
    if (filters?.order_status) { query += ' AND o.order_status = ?'; params.push(filters.order_status); }
    if (filters?.tenant_customer_id) { query += ' AND o.tenant_customer_id = ?'; params.push(filters.tenant_customer_id); }
    if (filters?.tenant_waiter_id) { query += ' AND o.tenant_waiter_id = ?'; params.push(filters.tenant_waiter_id); }
    if (filters?.table_id) { query += ' AND o.table_id = ?'; params.push(filters.table_id); }
    if (filters?.from_date) { query += ' AND o.created_at >= ?'; params.push(filters.from_date); }
    if (filters?.to_date) { query += ' AND o.created_at <= ?'; params.push(filters.to_date); }
    query += ' ORDER BY o.created_at DESC';
    const limit = Math.min(filters?.limit ?? 100, 500);
    const offset = filters?.offset ?? 0;
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    for (const row of rows) {
      const [countRows] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as item_count FROM order_items WHERE order_id = ?', [row.id]
      );
      row.item_count = Number(countRows[0]?.item_count) || 0;
    }
    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT o.*,
         s.name as store_name,
         c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
         w.name as waiter_name,
         t.name as table_name,
         cur.code as currency_code, cur.symbol as currency_symbol
       FROM orders o
       LEFT JOIN stores s ON s.id = o.store_id
       LEFT JOIN tenant_customers c ON c.id = o.tenant_customer_id
       LEFT JOIN tenant_waiters w ON w.id = o.tenant_waiter_id
       LEFT JOIN tenant_table_structures t ON t.id = o.table_id
       LEFT JOIN currencies cur ON cur.id = o.currency_id
       WHERE o.id = ? AND o.tenant_id = ?`, [id, tenantId]
    );
    if (rows.length === 0) return null;
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT oi.*,
         (SELECT t.name FROM tenant_menu_item_translations t
            JOIN languages l ON l.id = t.language_id
            WHERE t.tenant_menu_item_id = oi.tenant_menu_item_id
            ORDER BY (l.code = 'en') DESC, l.sort_order ASC LIMIT 1) as menu_item_name,
         ois.code as status_code
       FROM order_items oi
       LEFT JOIN tenant_order_item_statuses ois ON ois.id = oi.tenant_order_item_status_id
       WHERE oi.order_id = ?
       ORDER BY oi.id ASC`, [id]
    );
    return { ...rows[0], items };
  }

  static async create(tenantId: number, data: OrderInput): Promise<number> {
    if (data.order_status && !VALID_STATUSES.includes(data.order_status)) {
      throw { status: 400, message: 'Invalid order status' };
    }
    if (!data.store_id || !data.tenant_order_source_id || !data.tenant_order_type_id || !data.currency_id) {
      throw { status: 400, message: 'store_id, tenant_order_source_id, tenant_order_type_id and currency_id are required' };
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [storeCheck] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM stores WHERE id = ? AND tenant_id = ?', [data.store_id, tenantId]
      );
      if (storeCheck.length === 0) throw { status: 400, message: 'Invalid store' };

      const orderNumber = await this.generateOrderNumber(conn, tenantId, data.store_id);
      const tax = data.tax_amount ?? 0;
      const service = data.service_charge ?? 0;
      const discount = data.discount_amount ?? 0;

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO orders
         (tenant_id, store_id, order_number, tenant_customer_id, tenant_waiter_id, table_id,
          tenant_order_source_id, tenant_order_type_id, tenant_payment_status_id, order_status,
          subtotal, tax_amount, service_charge, discount_amount, total, currency_id,
          is_joined, joined_tables, guest_name, guest_phone, delivery_address, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
        [tenantId, data.store_id, orderNumber,
         data.tenant_customer_id ?? null, data.tenant_waiter_id ?? null, data.table_id ?? null,
         data.tenant_order_source_id, data.tenant_order_type_id, data.tenant_payment_status_id ?? null,
         data.order_status ?? 'open',
         tax, service, discount, data.currency_id,
         data.is_joined ? 1 : 0,
         data.joined_tables ? JSON.stringify(data.joined_tables) : null,
         data.guest_name ?? null, data.guest_phone ?? null, data.delivery_address ?? null, data.notes ?? null]
      );
      const orderId = result.insertId;

      await this.syncItemsAndTotals(conn, orderId, data.items, { tax_amount: tax, service_charge: service, discount_amount: discount });

      await conn.commit();
      return orderId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  static async update(tenantId: number, id: number, data: Partial<OrderInput>): Promise<boolean> {
    if (data.order_status && !VALID_STATUSES.includes(data.order_status)) {
      throw { status: 400, message: 'Invalid order status' };
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM orders WHERE id = ? AND tenant_id = ?', [id, tenantId]
      );
      if (existing.length === 0) throw { status: 404, message: 'Order not found' };

      const fields: string[] = []; const values: any[] = [];
      const setField = (col: string, val: any) => { fields.push(`${col} = ?`); values.push(val); };
      if (data.store_id !== undefined) setField('store_id', data.store_id);
      if (data.tenant_customer_id !== undefined) setField('tenant_customer_id', data.tenant_customer_id ?? null);
      if (data.tenant_waiter_id !== undefined) setField('tenant_waiter_id', data.tenant_waiter_id ?? null);
      if (data.table_id !== undefined) setField('table_id', data.table_id ?? null);
      if (data.tenant_order_source_id !== undefined) setField('tenant_order_source_id', data.tenant_order_source_id);
      if (data.tenant_order_type_id !== undefined) setField('tenant_order_type_id', data.tenant_order_type_id);
      if (data.tenant_payment_status_id !== undefined) setField('tenant_payment_status_id', data.tenant_payment_status_id ?? null);
      if (data.order_status !== undefined) setField('order_status', data.order_status);
      if (data.currency_id !== undefined) setField('currency_id', data.currency_id);
      if (data.is_joined !== undefined) setField('is_joined', data.is_joined ? 1 : 0);
      if (data.joined_tables !== undefined) setField('joined_tables', data.joined_tables ? JSON.stringify(data.joined_tables) : null);
      if (data.guest_name !== undefined) setField('guest_name', data.guest_name ?? null);
      if (data.guest_phone !== undefined) setField('guest_phone', data.guest_phone ?? null);
      if (data.delivery_address !== undefined) setField('delivery_address', data.delivery_address ?? null);
      if (data.notes !== undefined) setField('notes', data.notes ?? null);

      if (fields.length > 0) {
        values.push(id, tenantId);
        await conn.query(`UPDATE orders SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`, values);
      }

      await this.syncItemsAndTotals(conn, id, data.items, {
        tax_amount: data.tax_amount, service_charge: data.service_charge, discount_amount: data.discount_amount,
      });

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
      'DELETE FROM orders WHERE id = ? AND tenant_id = ?', [id, tenantId]
    );
    return result.affectedRows > 0;
  }
}
