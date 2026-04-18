import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

type KdsStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
const VALID_STATUS: KdsStatus[] = ['pending', 'preparing', 'ready', 'served', 'cancelled'];

interface KdsOrderInput {
  store_id: number;
  order_id: number;
  order_item_id: number;
  tenant_order_destination_id: number;
  status?: KdsStatus;
  priority?: number;
  estimated_prep_time?: number | null;
  notes?: string | null;
}

export class KdsOrderService {
  static async getAll(tenantId: number, filters?: {
    store_id?: number;
    tenant_order_destination_id?: number;
    status?: KdsStatus;
    order_id?: number;
    active_only?: boolean;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let query = `
      SELECT k.*,
        s.name as store_name,
        o.order_number,
        oi.quantity as item_quantity,
        oi.notes as item_notes,
        oi.tenant_menu_item_id as menu_item_id,
        tod.id as destination_id
      FROM kds_orders k
      LEFT JOIN stores s ON s.id = k.store_id
      LEFT JOIN orders o ON o.id = k.order_id
      LEFT JOIN order_items oi ON oi.id = k.order_item_id
      LEFT JOIN tenant_order_destinations tod ON tod.id = k.tenant_order_destination_id
      WHERE k.tenant_id = ?
    `;
    const params: any[] = [tenantId];

    if (filters?.store_id) { query += ' AND k.store_id = ?'; params.push(filters.store_id); }
    if (filters?.tenant_order_destination_id) { query += ' AND k.tenant_order_destination_id = ?'; params.push(filters.tenant_order_destination_id); }
    if (filters?.status) { query += ' AND k.status = ?'; params.push(filters.status); }
    if (filters?.order_id) { query += ' AND k.order_id = ?'; params.push(filters.order_id); }
    if (filters?.active_only) {
      query += ` AND k.status IN ('pending', 'preparing', 'ready')`;
    }
    if (filters?.from_date) { query += ' AND k.created_at >= ?'; params.push(filters.from_date); }
    if (filters?.to_date) { query += ' AND k.created_at <= ?'; params.push(filters.to_date); }

    // Priority first (rush on top), then oldest first (FIFO)
    query += ' ORDER BY k.priority DESC, k.created_at ASC';

    const limit = Math.min(filters?.limit ?? 200, 1000);
    const offset = filters?.offset ?? 0;
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    // Attach menu item translations for name rendering
    for (const row of rows) {
      if (row.menu_item_id) {
        const [trans] = await pool.query<RowDataPacket[]>(
          `SELECT t.name, l.code as language_code
           FROM tenant_menu_item_translations t
           JOIN languages l ON t.language_id = l.id
           WHERE t.tenant_menu_item_id = ?`,
          [row.menu_item_id]
        );
        row.menu_item_translations = trans;
        const en = trans.find(t => t.language_code === 'en');
        row.menu_item_name = en?.name || trans[0]?.name || null;
      }
    }

    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT k.*,
        s.name as store_name,
        o.order_number,
        oi.quantity as item_quantity,
        oi.notes as item_notes,
        oi.tenant_menu_item_id as menu_item_id
      FROM kds_orders k
      LEFT JOIN stores s ON s.id = k.store_id
      LEFT JOIN orders o ON o.id = k.order_id
      LEFT JOIN order_items oi ON oi.id = k.order_item_id
      WHERE k.id = ? AND k.tenant_id = ?`,
      [id, tenantId]
    );
    if (rows.length === 0) return null;
    const row = rows[0];

    if (row.menu_item_id) {
      const [trans] = await pool.query<RowDataPacket[]>(
        `SELECT t.name, l.code as language_code
         FROM tenant_menu_item_translations t
         JOIN languages l ON t.language_id = l.id
         WHERE t.tenant_menu_item_id = ?`,
        [row.menu_item_id]
      );
      row.menu_item_translations = trans;
      const en = trans.find(t => t.language_code === 'en');
      row.menu_item_name = en?.name || trans[0]?.name || null;
    }

    return row;
  }

  static async create(tenantId: number, data: KdsOrderInput): Promise<number> {
    if (!data.store_id || !data.order_id || !data.order_item_id || !data.tenant_order_destination_id) {
      throw { status: 400, message: 'store_id, order_id, order_item_id, and tenant_order_destination_id are required' };
    }

    // Validate FKs
    const [storeCheck] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM stores WHERE id = ? AND tenant_id = ?', [data.store_id, tenantId]
    );
    if (storeCheck.length === 0) throw { status: 400, message: 'Invalid store' };

    const [orderCheck] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM orders WHERE id = ? AND tenant_id = ?', [data.order_id, tenantId]
    );
    if (orderCheck.length === 0) throw { status: 400, message: 'Invalid order' };

    const [itemCheck] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM order_items WHERE id = ? AND order_id = ?', [data.order_item_id, data.order_id]
    );
    if (itemCheck.length === 0) throw { status: 400, message: 'Invalid order item' };

    const [destCheck] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM tenant_order_destinations WHERE id = ? AND tenant_id = ?',
      [data.tenant_order_destination_id, tenantId]
    );
    if (destCheck.length === 0) throw { status: 400, message: 'Invalid order destination' };

    const status = data.status ?? 'pending';
    if (!VALID_STATUS.includes(status)) throw { status: 400, message: `Invalid status: ${status}` };

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO kds_orders
       (tenant_id, store_id, order_id, order_item_id, tenant_order_destination_id,
        status, priority, estimated_prep_time, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        data.store_id,
        data.order_id,
        data.order_item_id,
        data.tenant_order_destination_id,
        status,
        data.priority ?? 0,
        data.estimated_prep_time ?? null,
        data.notes ?? null,
      ]
    );
    return result.insertId;
  }

  static async update(tenantId: number, id: number, data: Partial<KdsOrderInput>): Promise<boolean> {
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id, status, started_at, completed_at FROM kds_orders WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    if (existing.length === 0) throw { status: 404, message: 'KDS order not found' };
    const current = existing[0];

    const fields: string[] = [];
    const values: any[] = [];
    const set = (col: string, val: any) => { fields.push(`${col} = ?`); values.push(val); };

    if (data.store_id !== undefined) set('store_id', data.store_id);
    if (data.tenant_order_destination_id !== undefined) set('tenant_order_destination_id', data.tenant_order_destination_id);
    if (data.priority !== undefined) set('priority', data.priority);
    if (data.estimated_prep_time !== undefined) set('estimated_prep_time', data.estimated_prep_time ?? null);
    if (data.notes !== undefined) set('notes', data.notes ?? null);

    if (data.status !== undefined) {
      if (!VALID_STATUS.includes(data.status)) throw { status: 400, message: `Invalid status: ${data.status}` };
      set('status', data.status);

      // Auto-timestamp transitions
      if (data.status === 'preparing' && !current.started_at) {
        set('started_at', new Date());
      }
      if ((data.status === 'ready' || data.status === 'served') && !current.completed_at) {
        set('completed_at', new Date());
      }
    }

    if (fields.length > 0) {
      values.push(id, tenantId);
      await pool.query(
        `UPDATE kds_orders SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`,
        values
      );
    }
    return true;
  }

  static async updateStatus(tenantId: number, id: number, status: KdsStatus): Promise<boolean> {
    if (!VALID_STATUS.includes(status)) throw { status: 400, message: `Invalid status: ${status}` };
    return this.update(tenantId, id, { status });
  }

  static async delete(tenantId: number, id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM kds_orders WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    return result.affectedRows > 0;
  }
}
