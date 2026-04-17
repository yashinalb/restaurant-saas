import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';

type PaymentMode = 'full' | 'partial' | 'per_item' | 'mixed';
const VALID_MODES: PaymentMode[] = ['full', 'partial', 'per_item', 'mixed'];

interface PaymentInput {
  id?: number;
  tenant_payment_type_id: number;
  currency_id: number;
  amount: number;
  amount_due?: number | null;
  payment_mode?: PaymentMode;
  paid_items?: any | null;
  exchange_rate?: number | null;
  reference_number?: string | null;
  notes?: string | null;
}

interface TransactionInput {
  store_id: number;
  order_id: number;
  tenant_payment_status_id: number;
  currency_id: number;
  amount_before_vat: number;
  vat_amount: number;
  service_charge?: number;
  total_amount: number;
  is_joined?: boolean;
  joined_to_transaction_id?: number | null;
  notes?: string | null;
  payments?: PaymentInput[];
}

export class TransactionService {
  private static async recomputeTotals(conn: PoolConnection, transactionId: number): Promise<void> {
    const [txnRows] = await conn.query<RowDataPacket[]>(
      'SELECT total_amount, currency_id FROM transactions WHERE id = ?', [transactionId]
    );
    if (txnRows.length === 0) return;
    const total = Number(txnRows[0].total_amount) || 0;
    const txnCurrencyId = txnRows[0].currency_id;

    const [paymentRows] = await conn.query<RowDataPacket[]>(
      'SELECT amount, currency_id, exchange_rate FROM transaction_payments WHERE transaction_id = ?',
      [transactionId]
    );
    let paid = 0;
    for (const p of paymentRows) {
      const amt = Number(p.amount) || 0;
      const rate = p.currency_id === txnCurrencyId ? 1 : (Number(p.exchange_rate) || 1);
      paid += amt * rate;
    }
    paid = Math.round(paid * 100) / 100;
    const remaining = Math.round((total - paid) * 100) / 100;

    await conn.query(
      'UPDATE transactions SET total_paid = ?, amount_remaining = ? WHERE id = ?',
      [paid, remaining, transactionId]
    );
  }

  private static async syncPayments(conn: PoolConnection, transactionId: number, payments: PaymentInput[] | undefined): Promise<void> {
    if (payments === undefined) return;
    await conn.query('DELETE FROM transaction_payments WHERE transaction_id = ?', [transactionId]);
    for (const p of payments) {
      const mode = p.payment_mode ?? 'full';
      if (!VALID_MODES.includes(mode)) throw { status: 400, message: `Invalid payment_mode: ${mode}` };
      await conn.query(
        `INSERT INTO transaction_payments
         (transaction_id, tenant_payment_type_id, currency_id, amount, amount_due, payment_mode,
          paid_items, exchange_rate, reference_number, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [transactionId, p.tenant_payment_type_id, p.currency_id, p.amount,
         p.amount_due ?? null, mode,
         p.paid_items ? JSON.stringify(p.paid_items) : null,
         p.exchange_rate ?? null,
         p.reference_number ?? null,
         p.notes ?? null]
      );
    }
  }

  static async getAll(tenantId: number, filters?: {
    store_id?: number; order_id?: number; tenant_payment_status_id?: number;
    from_date?: string; to_date?: string; limit?: number; offset?: number;
  }): Promise<any[]> {
    let query = `
      SELECT t.*,
        s.name as store_name,
        o.order_number,
        cur.code as currency_code,
        cur.symbol as currency_symbol,
        ps.code as payment_status_code
      FROM transactions t
      LEFT JOIN stores s ON s.id = t.store_id
      LEFT JOIN orders o ON o.id = t.order_id
      LEFT JOIN currencies cur ON cur.id = t.currency_id
      LEFT JOIN tenant_payment_statuses ps ON ps.id = t.tenant_payment_status_id
      WHERE t.tenant_id = ?
    `;
    const params: any[] = [tenantId];
    if (filters?.store_id) { query += ' AND t.store_id = ?'; params.push(filters.store_id); }
    if (filters?.order_id) { query += ' AND t.order_id = ?'; params.push(filters.order_id); }
    if (filters?.tenant_payment_status_id) { query += ' AND t.tenant_payment_status_id = ?'; params.push(filters.tenant_payment_status_id); }
    if (filters?.from_date) { query += ' AND t.created_at >= ?'; params.push(filters.from_date); }
    if (filters?.to_date) { query += ' AND t.created_at <= ?'; params.push(filters.to_date); }
    query += ' ORDER BY t.created_at DESC';
    const limit = Math.min(filters?.limit ?? 100, 500);
    const offset = filters?.offset ?? 0;
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    for (const row of rows) {
      const [cnt] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as payment_count FROM transaction_payments WHERE transaction_id = ?', [row.id]
      );
      row.payment_count = Number(cnt[0]?.payment_count) || 0;
    }
    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT t.*,
         s.name as store_name,
         o.order_number,
         cur.code as currency_code, cur.symbol as currency_symbol,
         ps.code as payment_status_code
       FROM transactions t
       LEFT JOIN stores s ON s.id = t.store_id
       LEFT JOIN orders o ON o.id = t.order_id
       LEFT JOIN currencies cur ON cur.id = t.currency_id
       LEFT JOIN tenant_payment_statuses ps ON ps.id = t.tenant_payment_status_id
       WHERE t.id = ? AND t.tenant_id = ?`, [id, tenantId]
    );
    if (rows.length === 0) return null;
    const [payments] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, pt.code as payment_type_code, cur.code as payment_currency_code, cur.symbol as payment_currency_symbol
       FROM transaction_payments p
       LEFT JOIN tenant_payment_types pt ON pt.id = p.tenant_payment_type_id
       LEFT JOIN currencies cur ON cur.id = p.currency_id
       WHERE p.transaction_id = ?
       ORDER BY p.id ASC`, [id]
    );
    return { ...rows[0], payments };
  }

  static async create(tenantId: number, data: TransactionInput): Promise<number> {
    if (!data.store_id || !data.order_id || !data.tenant_payment_status_id || !data.currency_id) {
      throw { status: 400, message: 'store_id, order_id, tenant_payment_status_id, and currency_id are required' };
    }
    if (data.total_amount === undefined || data.amount_before_vat === undefined || data.vat_amount === undefined) {
      throw { status: 400, message: 'amount_before_vat, vat_amount, and total_amount are required' };
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [storeCheck] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM stores WHERE id = ? AND tenant_id = ?', [data.store_id, tenantId]
      );
      if (storeCheck.length === 0) throw { status: 400, message: 'Invalid store' };

      const [orderCheck] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM orders WHERE id = ? AND tenant_id = ?', [data.order_id, tenantId]
      );
      if (orderCheck.length === 0) throw { status: 400, message: 'Invalid order' };

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO transactions
         (tenant_id, store_id, order_id, tenant_payment_status_id, currency_id,
          amount_before_vat, vat_amount, service_charge, total_amount, total_paid, amount_remaining,
          is_joined, joined_to_transaction_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
        [tenantId, data.store_id, data.order_id, data.tenant_payment_status_id, data.currency_id,
         data.amount_before_vat, data.vat_amount, data.service_charge ?? 0, data.total_amount,
         data.total_amount,
         data.is_joined ? 1 : 0, data.joined_to_transaction_id ?? null,
         data.notes ?? null]
      );
      const txnId = result.insertId;

      await this.syncPayments(conn, txnId, data.payments);
      await this.recomputeTotals(conn, txnId);

      await conn.commit();
      return txnId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  static async update(tenantId: number, id: number, data: Partial<TransactionInput>): Promise<boolean> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM transactions WHERE id = ? AND tenant_id = ?', [id, tenantId]
      );
      if (existing.length === 0) throw { status: 404, message: 'Transaction not found' };

      const fields: string[] = []; const values: any[] = [];
      const set = (col: string, val: any) => { fields.push(`${col} = ?`); values.push(val); };
      if (data.store_id !== undefined) set('store_id', data.store_id);
      if (data.order_id !== undefined) set('order_id', data.order_id);
      if (data.tenant_payment_status_id !== undefined) set('tenant_payment_status_id', data.tenant_payment_status_id);
      if (data.currency_id !== undefined) set('currency_id', data.currency_id);
      if (data.amount_before_vat !== undefined) set('amount_before_vat', data.amount_before_vat);
      if (data.vat_amount !== undefined) set('vat_amount', data.vat_amount);
      if (data.service_charge !== undefined) set('service_charge', data.service_charge);
      if (data.total_amount !== undefined) set('total_amount', data.total_amount);
      if (data.is_joined !== undefined) set('is_joined', data.is_joined ? 1 : 0);
      if (data.joined_to_transaction_id !== undefined) set('joined_to_transaction_id', data.joined_to_transaction_id ?? null);
      if (data.notes !== undefined) set('notes', data.notes ?? null);

      if (fields.length > 0) {
        values.push(id, tenantId);
        await conn.query(
          `UPDATE transactions SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`, values
        );
      }

      await this.syncPayments(conn, id, data.payments);
      await this.recomputeTotals(conn, id);

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
      'DELETE FROM transactions WHERE id = ? AND tenant_id = ?', [id, tenantId]
    );
    return result.affectedRows > 0;
  }
}
