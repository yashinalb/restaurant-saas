import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';

interface PaymentInput {
  id?: number;
  tenant_payment_type_id: number;
  paid_by: number;
  payment_amount: number;
  payment_date: string;
  currency_id: number;
  reference_number?: string | null;
  notes?: string | null;
}

interface SupplierCreditInput {
  tenant_supplier_id: number;
  supplier_invoice_id?: number | null;
  credit_amount: number;
  currency_id: number;
  payments?: PaymentInput[];
}

export class SupplierCreditService {
  private static async recomputeTotals(conn: PoolConnection, creditId: number): Promise<void> {
    const [creditRows] = await conn.query<RowDataPacket[]>(
      'SELECT credit_amount FROM supplier_credits WHERE id = ?', [creditId]
    );
    if (creditRows.length === 0) return;
    const creditAmount = Number(creditRows[0].credit_amount) || 0;

    const [payRows] = await conn.query<RowDataPacket[]>(
      'SELECT COALESCE(SUM(payment_amount), 0) as paid FROM supplier_payment_records WHERE supplier_credit_id = ?',
      [creditId]
    );
    const paid = Number(payRows[0]?.paid) || 0;
    const balance = Math.round((creditAmount - paid) * 100) / 100;

    await conn.query(
      'UPDATE supplier_credits SET amount_paid = ?, balance = ? WHERE id = ?',
      [paid, balance, creditId]
    );
  }

  private static async syncPayments(
    conn: PoolConnection,
    tenantId: number,
    creditId: number,
    payments: PaymentInput[] | undefined
  ): Promise<void> {
    if (payments === undefined) return;
    await conn.query('DELETE FROM supplier_payment_records WHERE supplier_credit_id = ? AND tenant_id = ?', [creditId, tenantId]);

    for (const p of payments) {
      if (!p.tenant_payment_type_id || !p.paid_by || p.payment_amount == null || !p.payment_date || !p.currency_id) {
        throw { status: 400, message: 'Each payment requires tenant_payment_type_id, paid_by, payment_amount, payment_date, currency_id' };
      }

      const [pt] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM tenant_payment_types WHERE id = ? AND tenant_id = ?',
        [p.tenant_payment_type_id, tenantId]
      );
      if (pt.length === 0) throw { status: 400, message: `Invalid payment type: ${p.tenant_payment_type_id}` };

      await conn.query(
        `INSERT INTO supplier_payment_records
         (tenant_id, supplier_credit_id, tenant_payment_type_id, paid_by,
          payment_amount, payment_date, currency_id, reference_number, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tenantId, creditId, p.tenant_payment_type_id, p.paid_by,
         p.payment_amount, p.payment_date, p.currency_id,
         p.reference_number ?? null, p.notes ?? null]
      );
    }
  }

  static async getAll(tenantId: number, filters?: {
    tenant_supplier_id?: number;
    supplier_invoice_id?: number;
    unpaid_only?: boolean;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let query = `
      SELECT sc.*,
        s.name as supplier_name,
        inv.invoice_number,
        c.code as currency_code, c.symbol as currency_symbol,
        (SELECT COUNT(*) FROM supplier_payment_records WHERE supplier_credit_id = sc.id) as payment_count
      FROM supplier_credits sc
      LEFT JOIN tenant_suppliers s ON s.id = sc.tenant_supplier_id
      LEFT JOIN supplier_invoices inv ON inv.id = sc.supplier_invoice_id
      LEFT JOIN currencies c ON c.id = sc.currency_id
      WHERE sc.tenant_id = ?
    `;
    const params: any[] = [tenantId];

    if (filters?.tenant_supplier_id) { query += ' AND sc.tenant_supplier_id = ?'; params.push(filters.tenant_supplier_id); }
    if (filters?.supplier_invoice_id) { query += ' AND sc.supplier_invoice_id = ?'; params.push(filters.supplier_invoice_id); }
    if (filters?.unpaid_only) { query += ' AND sc.balance > 0'; }
    if (filters?.from_date) { query += ' AND sc.created_at >= ?'; params.push(filters.from_date); }
    if (filters?.to_date) { query += ' AND sc.created_at <= ?'; params.push(filters.to_date); }

    query += ' ORDER BY sc.created_at DESC';
    const limit = Math.min(filters?.limit ?? 100, 500);
    const offset = filters?.offset ?? 0;
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT sc.*,
        s.name as supplier_name,
        inv.invoice_number,
        c.code as currency_code, c.symbol as currency_symbol
      FROM supplier_credits sc
      LEFT JOIN tenant_suppliers s ON s.id = sc.tenant_supplier_id
      LEFT JOIN supplier_invoices inv ON inv.id = sc.supplier_invoice_id
      LEFT JOIN currencies c ON c.id = sc.currency_id
      WHERE sc.id = ? AND sc.tenant_id = ?`,
      [id, tenantId]
    );
    if (rows.length === 0) return null;
    const credit = rows[0];

    const [payments] = await pool.query<RowDataPacket[]>(
      `SELECT spr.*,
        pt.code as payment_type_code,
        au.email as paid_by_email, au.first_name as paid_by_first_name, au.last_name as paid_by_last_name,
        cur.code as payment_currency_code, cur.symbol as payment_currency_symbol
       FROM supplier_payment_records spr
       LEFT JOIN tenant_payment_types pt ON pt.id = spr.tenant_payment_type_id
       LEFT JOIN admin_users au ON au.id = spr.paid_by
       LEFT JOIN currencies cur ON cur.id = spr.currency_id
       WHERE spr.supplier_credit_id = ?
       ORDER BY spr.payment_date DESC, spr.id DESC`,
      [id]
    );
    credit.payments = payments;
    return credit;
  }

  static async create(tenantId: number, data: SupplierCreditInput): Promise<number> {
    if (!data.tenant_supplier_id || !data.currency_id || data.credit_amount == null) {
      throw { status: 400, message: 'tenant_supplier_id, currency_id, and credit_amount are required' };
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [supplierCheck] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM tenant_suppliers WHERE id = ? AND tenant_id = ?',
        [data.tenant_supplier_id, tenantId]
      );
      if (supplierCheck.length === 0) throw { status: 400, message: 'Invalid supplier' };

      if (data.supplier_invoice_id) {
        const [invoiceCheck] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM supplier_invoices WHERE id = ? AND tenant_id = ?',
          [data.supplier_invoice_id, tenantId]
        );
        if (invoiceCheck.length === 0) throw { status: 400, message: 'Invalid supplier invoice' };
      }

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO supplier_credits
         (tenant_id, tenant_supplier_id, supplier_invoice_id, credit_amount, amount_paid, balance, currency_id)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
        [tenantId, data.tenant_supplier_id, data.supplier_invoice_id ?? null,
         data.credit_amount, data.credit_amount, data.currency_id]
      );
      const creditId = result.insertId;

      await this.syncPayments(conn, tenantId, creditId, data.payments);
      await this.recomputeTotals(conn, creditId);

      await conn.commit();
      return creditId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  static async update(tenantId: number, id: number, data: Partial<SupplierCreditInput>): Promise<boolean> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM supplier_credits WHERE id = ? AND tenant_id = ?',
        [id, tenantId]
      );
      if (existing.length === 0) throw { status: 404, message: 'Supplier credit not found' };

      const fields: string[] = [];
      const values: any[] = [];
      const set = (col: string, val: any) => { fields.push(`${col} = ?`); values.push(val); };

      if (data.tenant_supplier_id !== undefined) set('tenant_supplier_id', data.tenant_supplier_id);
      if (data.supplier_invoice_id !== undefined) set('supplier_invoice_id', data.supplier_invoice_id ?? null);
      if (data.credit_amount !== undefined) set('credit_amount', data.credit_amount);
      if (data.currency_id !== undefined) set('currency_id', data.currency_id);

      if (fields.length > 0) {
        values.push(id, tenantId);
        await conn.query(
          `UPDATE supplier_credits SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`,
          values
        );
      }

      await this.syncPayments(conn, tenantId, id, data.payments);
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
      'DELETE FROM supplier_credits WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Add a single payment to an existing credit (convenience for standalone payment flow)
   */
  static async addPayment(tenantId: number, creditId: number, payment: PaymentInput): Promise<number> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [credit] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM supplier_credits WHERE id = ? AND tenant_id = ?',
        [creditId, tenantId]
      );
      if (credit.length === 0) throw { status: 404, message: 'Credit not found' };

      if (!payment.tenant_payment_type_id || !payment.paid_by || payment.payment_amount == null || !payment.payment_date || !payment.currency_id) {
        throw { status: 400, message: 'tenant_payment_type_id, paid_by, payment_amount, payment_date, currency_id are required' };
      }

      const [pt] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM tenant_payment_types WHERE id = ? AND tenant_id = ?',
        [payment.tenant_payment_type_id, tenantId]
      );
      if (pt.length === 0) throw { status: 400, message: 'Invalid payment type' };

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO supplier_payment_records
         (tenant_id, supplier_credit_id, tenant_payment_type_id, paid_by,
          payment_amount, payment_date, currency_id, reference_number, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tenantId, creditId, payment.tenant_payment_type_id, payment.paid_by,
         payment.payment_amount, payment.payment_date, payment.currency_id,
         payment.reference_number ?? null, payment.notes ?? null]
      );

      await this.recomputeTotals(conn, creditId);
      await conn.commit();
      return result.insertId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  static async deletePayment(tenantId: number, paymentId: number): Promise<boolean> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.query<RowDataPacket[]>(
        'SELECT supplier_credit_id FROM supplier_payment_records WHERE id = ? AND tenant_id = ?',
        [paymentId, tenantId]
      );
      if (rows.length === 0) {
        await conn.commit();
        return false;
      }
      const creditId = Number(rows[0].supplier_credit_id);

      const [result] = await conn.query<ResultSetHeader>(
        'DELETE FROM supplier_payment_records WHERE id = ? AND tenant_id = ?',
        [paymentId, tenantId]
      );

      await this.recomputeTotals(conn, creditId);
      await conn.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}
