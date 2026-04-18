import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';

interface DailyReportInput {
  store_id: number;
  report_date: string; // YYYY-MM-DD
  currency_id: number;
  total_orders?: number;
  total_revenue?: number;
  total_tax?: number;
  total_tips?: number;
  total_discounts?: number;
  total_refunds?: number;
  total_expenses?: number;
  order_count_by_type?: any;
  payment_breakdown?: any;
}

export class DailyReportSnapshotService {
  static async getAll(tenantId: number, filters?: {
    store_id?: number;
    currency_id?: number;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let query = `
      SELECT d.*,
        s.name as store_name,
        c.code as currency_code, c.symbol as currency_symbol
      FROM daily_report_snapshots d
      LEFT JOIN stores s ON s.id = d.store_id
      LEFT JOIN currencies c ON c.id = d.currency_id
      WHERE d.tenant_id = ?
    `;
    const params: any[] = [tenantId];

    if (filters?.store_id) { query += ' AND d.store_id = ?'; params.push(filters.store_id); }
    if (filters?.currency_id) { query += ' AND d.currency_id = ?'; params.push(filters.currency_id); }
    if (filters?.from_date) { query += ' AND d.report_date >= ?'; params.push(filters.from_date); }
    if (filters?.to_date) { query += ' AND d.report_date <= ?'; params.push(filters.to_date); }

    query += ' ORDER BY d.report_date DESC, d.id DESC';
    const limit = Math.min(filters?.limit ?? 100, 500);
    const offset = filters?.offset ?? 0;
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT d.*,
        s.name as store_name,
        c.code as currency_code, c.symbol as currency_symbol
       FROM daily_report_snapshots d
       LEFT JOIN stores s ON s.id = d.store_id
       LEFT JOIN currencies c ON c.id = d.currency_id
       WHERE d.id = ? AND d.tenant_id = ?`,
      [id, tenantId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  static async create(tenantId: number, data: DailyReportInput): Promise<number> {
    if (!data.store_id || !data.report_date || !data.currency_id) {
      throw { status: 400, message: 'store_id, report_date, and currency_id are required' };
    }

    // Validate FKs
    const [storeCheck] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM stores WHERE id = ? AND tenant_id = ?', [data.store_id, tenantId]
    );
    if (storeCheck.length === 0) throw { status: 400, message: 'Invalid store' };

    // Check unique
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM daily_report_snapshots WHERE tenant_id = ? AND store_id = ? AND report_date = ? AND currency_id = ?',
      [tenantId, data.store_id, data.report_date, data.currency_id]
    );
    if (existing.length > 0) {
      throw { status: 409, message: 'Snapshot already exists for this store + date + currency' };
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO daily_report_snapshots
       (tenant_id, store_id, report_date, total_orders, total_revenue, total_tax,
        total_tips, total_discounts, total_refunds, total_expenses,
        order_count_by_type, payment_breakdown, currency_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        data.store_id,
        data.report_date,
        data.total_orders ?? 0,
        data.total_revenue ?? 0,
        data.total_tax ?? 0,
        data.total_tips ?? 0,
        data.total_discounts ?? 0,
        data.total_refunds ?? 0,
        data.total_expenses ?? 0,
        data.order_count_by_type ? JSON.stringify(data.order_count_by_type) : null,
        data.payment_breakdown ? JSON.stringify(data.payment_breakdown) : null,
        data.currency_id,
      ]
    );
    return result.insertId;
  }

  static async update(tenantId: number, id: number, data: Partial<DailyReportInput>): Promise<boolean> {
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM daily_report_snapshots WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    if (existing.length === 0) throw { status: 404, message: 'Snapshot not found' };

    const fields: string[] = [];
    const values: any[] = [];
    const set = (col: string, val: any) => { fields.push(`${col} = ?`); values.push(val); };

    if (data.store_id !== undefined) set('store_id', data.store_id);
    if (data.report_date !== undefined) set('report_date', data.report_date);
    if (data.currency_id !== undefined) set('currency_id', data.currency_id);
    if (data.total_orders !== undefined) set('total_orders', data.total_orders);
    if (data.total_revenue !== undefined) set('total_revenue', data.total_revenue);
    if (data.total_tax !== undefined) set('total_tax', data.total_tax);
    if (data.total_tips !== undefined) set('total_tips', data.total_tips);
    if (data.total_discounts !== undefined) set('total_discounts', data.total_discounts);
    if (data.total_refunds !== undefined) set('total_refunds', data.total_refunds);
    if (data.total_expenses !== undefined) set('total_expenses', data.total_expenses);
    if (data.order_count_by_type !== undefined) set('order_count_by_type', data.order_count_by_type ? JSON.stringify(data.order_count_by_type) : null);
    if (data.payment_breakdown !== undefined) set('payment_breakdown', data.payment_breakdown ? JSON.stringify(data.payment_breakdown) : null);

    if (fields.length > 0) {
      values.push(id, tenantId);
      await pool.query(
        `UPDATE daily_report_snapshots SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`,
        values
      );
    }
    return true;
  }

  static async delete(tenantId: number, id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM daily_report_snapshots WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Auto-generate a snapshot from actual data for a given store/date/currency.
   * Aggregates: orders, revenue, tax, tips, discounts, refunds, expenses,
   * plus order_count_by_type and payment_breakdown JSON.
   * Upserts (deletes any existing snapshot for the same key first).
   */
  static async generate(tenantId: number, params: {
    store_id: number;
    report_date: string;
    currency_id: number;
  }): Promise<number> {
    const { store_id, report_date, currency_id } = params;
    if (!store_id || !report_date || !currency_id) {
      throw { status: 400, message: 'store_id, report_date, and currency_id are required' };
    }

    const [storeCheck] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM stores WHERE id = ? AND tenant_id = ?', [store_id, tenantId]
    );
    if (storeCheck.length === 0) throw { status: 400, message: 'Invalid store' };

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Date range: whole day
      const dayStart = `${report_date} 00:00:00`;
      const dayEnd = `${report_date} 23:59:59`;

      // Order totals + revenue/tax/tips/discounts (via transactions for this store+currency+date)
      const [txnAgg] = await conn.query<RowDataPacket[]>(
        `SELECT
           COUNT(DISTINCT t.order_id) as total_orders,
           COALESCE(SUM(t.total_amount), 0) as total_revenue,
           COALESCE(SUM(t.vat_amount), 0) as total_tax,
           COALESCE(SUM(t.service_charge), 0) as total_tips
         FROM transactions t
         WHERE t.tenant_id = ? AND t.store_id = ? AND t.currency_id = ?
           AND t.created_at BETWEEN ? AND ?`,
        [tenantId, store_id, currency_id, dayStart, dayEnd]
      );
      const txnTotals = txnAgg[0];

      // Discounts from orders table (if store tracks it there)
      const [orderAgg] = await conn.query<RowDataPacket[]>(
        `SELECT
           COALESCE(SUM(o.discount_amount), 0) as total_discounts
         FROM orders o
         WHERE o.tenant_id = ? AND o.store_id = ? AND o.created_at BETWEEN ? AND ?`,
        [tenantId, store_id, dayStart, dayEnd]
      ).catch(() => [[{ total_discounts: 0 }]] as any);
      const orderTotals = (orderAgg as any)[0] ?? { total_discounts: 0 };

      // Order count by type
      const [byType] = await conn.query<RowDataPacket[]>(
        `SELECT ot.code, COUNT(*) as cnt
         FROM orders o
         LEFT JOIN tenant_order_types ot ON ot.id = o.tenant_order_type_id
         WHERE o.tenant_id = ? AND o.store_id = ? AND o.created_at BETWEEN ? AND ?
         GROUP BY ot.code`,
        [tenantId, store_id, dayStart, dayEnd]
      ).catch(() => [[]] as any);
      const orderCountByType: Record<string, number> = {};
      for (const r of (byType as any[])) {
        orderCountByType[r.code || 'unknown'] = Number(r.cnt) || 0;
      }

      // Payment breakdown from transaction_payments
      const [byPayment] = await conn.query<RowDataPacket[]>(
        `SELECT pt.code, COALESCE(SUM(tp.amount), 0) as total
         FROM transaction_payments tp
         JOIN transactions t ON t.id = tp.transaction_id
         LEFT JOIN tenant_payment_types pt ON pt.id = tp.tenant_payment_type_id
         WHERE t.tenant_id = ? AND t.store_id = ? AND tp.currency_id = ?
           AND t.created_at BETWEEN ? AND ?
         GROUP BY pt.code`,
        [tenantId, store_id, currency_id, dayStart, dayEnd]
      ).catch(() => [[]] as any);
      const paymentBreakdown: Record<string, number> = {};
      for (const r of (byPayment as any[])) {
        paymentBreakdown[r.code || 'unknown'] = Number(r.total) || 0;
      }

      // Total expenses for the day (store-level + tenant-level attributable to this store)
      const [expAgg] = await conn.query<RowDataPacket[]>(
        `SELECT COALESCE(SUM(amount), 0) as total_expenses
         FROM expenses
         WHERE tenant_id = ? AND currency_id = ?
           AND (store_id = ? OR store_id IS NULL)
           AND created_at BETWEEN ? AND ?`,
        [tenantId, currency_id, store_id, dayStart, dayEnd]
      );
      const totalExpenses = Number(expAgg[0]?.total_expenses) || 0;

      // Upsert: remove any existing row then insert fresh
      await conn.query(
        `DELETE FROM daily_report_snapshots
         WHERE tenant_id = ? AND store_id = ? AND report_date = ? AND currency_id = ?`,
        [tenantId, store_id, report_date, currency_id]
      );

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO daily_report_snapshots
         (tenant_id, store_id, report_date, total_orders, total_revenue, total_tax,
          total_tips, total_discounts, total_refunds, total_expenses,
          order_count_by_type, payment_breakdown, currency_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tenantId,
          store_id,
          report_date,
          Number(txnTotals?.total_orders) || 0,
          Number(txnTotals?.total_revenue) || 0,
          Number(txnTotals?.total_tax) || 0,
          Number(txnTotals?.total_tips) || 0,
          Number(orderTotals.total_discounts) || 0,
          0, // total_refunds - not tracked in current schema; keeping 0
          totalExpenses,
          JSON.stringify(orderCountByType),
          JSON.stringify(paymentBreakdown),
          currency_id,
        ]
      );

      await conn.commit();
      return result.insertId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}
