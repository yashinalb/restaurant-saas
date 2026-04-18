import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';

type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid';

interface PaymentInput {
  id?: number;
  tenant_payment_type_id?: number | null;
  currency_id: number;
  amount: number;
  payment_date: string;
  reference_number?: string | null;
  notes?: string | null;
  paid_by: number;
}

interface ExpenseInput {
  store_id?: number | null;
  tenant_expense_source_id: number;
  invoice_number?: string | null;
  description: string;
  amount: number;
  currency_id: number;
  due_date?: string | null;
  attachment_url?: string | null;
  notes?: string | null;
  created_by: number;
  payments?: PaymentInput[];
}

export class ExpenseService {
  private static async recomputeStatus(conn: PoolConnection, expenseId: number): Promise<void> {
    const [rows] = await conn.query<RowDataPacket[]>(
      'SELECT amount FROM expenses WHERE id = ?', [expenseId]
    );
    if (rows.length === 0) return;
    const amount = Number(rows[0].amount) || 0;

    const [payRows] = await conn.query<RowDataPacket[]>(
      'SELECT COALESCE(SUM(amount), 0) as paid FROM expense_payments WHERE expense_id = ?',
      [expenseId]
    );
    const paid = Number(payRows[0]?.paid) || 0;

    let status: PaymentStatus = 'unpaid';
    if (paid >= amount && amount > 0) status = 'paid';
    else if (paid > 0) status = 'partially_paid';

    await conn.query('UPDATE expenses SET payment_status = ? WHERE id = ?', [status, expenseId]);
  }

  private static async syncPayments(
    conn: PoolConnection,
    tenantId: number,
    expenseId: number,
    payments: PaymentInput[] | undefined
  ): Promise<void> {
    if (payments === undefined) return;
    await conn.query('DELETE FROM expense_payments WHERE expense_id = ?', [expenseId]);

    for (const p of payments) {
      if (p.amount == null || !p.payment_date || !p.currency_id || !p.paid_by) {
        throw { status: 400, message: 'Each payment requires amount, payment_date, currency_id, paid_by' };
      }

      if (p.tenant_payment_type_id) {
        const [pt] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM tenant_payment_types WHERE id = ? AND tenant_id = ?',
          [p.tenant_payment_type_id, tenantId]
        );
        if (pt.length === 0) throw { status: 400, message: `Invalid payment type: ${p.tenant_payment_type_id}` };
      }

      await conn.query(
        `INSERT INTO expense_payments
         (expense_id, tenant_payment_type_id, currency_id, amount, payment_date, reference_number, notes, paid_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [expenseId, p.tenant_payment_type_id ?? null, p.currency_id, p.amount,
         p.payment_date, p.reference_number ?? null, p.notes ?? null, p.paid_by]
      );
    }
  }

  static async getAll(tenantId: number, filters?: {
    store_id?: number;
    tenant_expense_source_id?: number;
    payment_status?: PaymentStatus;
    from_date?: string;
    to_date?: string;
    search?: string;
    overdue_only?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let query = `
      SELECT e.*,
        s.name as store_name,
        es.id as source_id,
        c.code as currency_code, c.symbol as currency_symbol,
        ec.id as category_id,
        (SELECT COALESCE(SUM(amount), 0) FROM expense_payments WHERE expense_id = e.id) as amount_paid,
        (SELECT COUNT(*) FROM expense_payments WHERE expense_id = e.id) as payment_count
      FROM expenses e
      LEFT JOIN stores s ON s.id = e.store_id
      LEFT JOIN tenant_expense_sources es ON es.id = e.tenant_expense_source_id
      LEFT JOIN tenant_expense_categories ec ON ec.id = es.tenant_expense_category_id
      LEFT JOIN currencies c ON c.id = e.currency_id
      WHERE e.tenant_id = ?
    `;
    const params: any[] = [tenantId];

    if (filters?.store_id) { query += ' AND e.store_id = ?'; params.push(filters.store_id); }
    if (filters?.tenant_expense_source_id) { query += ' AND e.tenant_expense_source_id = ?'; params.push(filters.tenant_expense_source_id); }
    if (filters?.payment_status) { query += ' AND e.payment_status = ?'; params.push(filters.payment_status); }
    if (filters?.from_date) { query += ' AND e.created_at >= ?'; params.push(filters.from_date); }
    if (filters?.to_date) { query += ' AND e.created_at <= ?'; params.push(filters.to_date); }
    if (filters?.search) {
      query += ' AND (e.description LIKE ? OR e.invoice_number LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s);
    }
    if (filters?.overdue_only) {
      query += ` AND e.payment_status != 'paid' AND e.due_date IS NOT NULL AND e.due_date < CURDATE()`;
    }

    query += ' ORDER BY e.created_at DESC';
    const limit = Math.min(filters?.limit ?? 100, 500);
    const offset = filters?.offset ?? 0;
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    // Attach source translations for display
    for (const row of rows) {
      const [trans] = await pool.query<RowDataPacket[]>(
        `SELECT t.name, l.code as language_code
         FROM tenant_expense_source_translations t
         JOIN languages l ON t.language_id = l.id
         WHERE t.tenant_expense_source_id = ?`,
        [row.tenant_expense_source_id]
      );
      row.source_translations = trans;
    }

    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT e.*,
        s.name as store_name,
        c.code as currency_code, c.symbol as currency_symbol,
        es.tenant_expense_category_id as category_id
      FROM expenses e
      LEFT JOIN stores s ON s.id = e.store_id
      LEFT JOIN currencies c ON c.id = e.currency_id
      LEFT JOIN tenant_expense_sources es ON es.id = e.tenant_expense_source_id
      WHERE e.id = ? AND e.tenant_id = ?`,
      [id, tenantId]
    );
    if (rows.length === 0) return null;
    const expense = rows[0];

    const [payments] = await pool.query<RowDataPacket[]>(
      `SELECT ep.*,
        pt.code as payment_type_code,
        cur.code as payment_currency_code, cur.symbol as payment_currency_symbol,
        au.email as paid_by_email, au.first_name as paid_by_first_name, au.last_name as paid_by_last_name
       FROM expense_payments ep
       LEFT JOIN tenant_payment_types pt ON pt.id = ep.tenant_payment_type_id
       LEFT JOIN currencies cur ON cur.id = ep.currency_id
       LEFT JOIN admin_users au ON au.id = ep.paid_by
       WHERE ep.expense_id = ?
       ORDER BY ep.payment_date DESC, ep.id DESC`,
      [id]
    );
    expense.payments = payments;

    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    expense.amount_paid = totalPaid;
    expense.balance = Math.round((Number(expense.amount) - totalPaid) * 100) / 100;

    return expense;
  }

  static async create(tenantId: number, data: ExpenseInput): Promise<number> {
    if (!data.tenant_expense_source_id || !data.description?.trim() || data.amount == null || !data.currency_id || !data.created_by) {
      throw { status: 400, message: 'tenant_expense_source_id, description, amount, currency_id, and created_by are required' };
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Validate source belongs to tenant
      const [srcCheck] = await conn.query<RowDataPacket[]>(
        `SELECT s.id FROM tenant_expense_sources s
         JOIN tenant_expense_categories c ON c.id = s.tenant_expense_category_id
         WHERE s.id = ? AND c.tenant_id = ?`,
        [data.tenant_expense_source_id, tenantId]
      );
      if (srcCheck.length === 0) throw { status: 400, message: 'Invalid expense source' };

      // Validate store (if provided)
      if (data.store_id) {
        const [storeCheck] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM stores WHERE id = ? AND tenant_id = ?', [data.store_id, tenantId]
        );
        if (storeCheck.length === 0) throw { status: 400, message: 'Invalid store' };
      }

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO expenses
         (tenant_id, store_id, tenant_expense_source_id, invoice_number, description,
          amount, currency_id, due_date, payment_status, attachment_url, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', ?, ?, ?)`,
        [
          tenantId,
          data.store_id ?? null,
          data.tenant_expense_source_id,
          data.invoice_number ?? null,
          data.description.trim(),
          data.amount,
          data.currency_id,
          data.due_date ?? null,
          data.attachment_url ?? null,
          data.notes ?? null,
          data.created_by,
        ]
      );
      const expenseId = result.insertId;

      await this.syncPayments(conn, tenantId, expenseId, data.payments);
      await this.recomputeStatus(conn, expenseId);

      await conn.commit();
      return expenseId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  static async update(tenantId: number, id: number, data: Partial<ExpenseInput>): Promise<boolean> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM expenses WHERE id = ? AND tenant_id = ?', [id, tenantId]
      );
      if (existing.length === 0) throw { status: 404, message: 'Expense not found' };

      if (data.tenant_expense_source_id) {
        const [srcCheck] = await conn.query<RowDataPacket[]>(
          `SELECT s.id FROM tenant_expense_sources s
           JOIN tenant_expense_categories c ON c.id = s.tenant_expense_category_id
           WHERE s.id = ? AND c.tenant_id = ?`,
          [data.tenant_expense_source_id, tenantId]
        );
        if (srcCheck.length === 0) throw { status: 400, message: 'Invalid expense source' };
      }

      if (data.store_id) {
        const [storeCheck] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM stores WHERE id = ? AND tenant_id = ?', [data.store_id, tenantId]
        );
        if (storeCheck.length === 0) throw { status: 400, message: 'Invalid store' };
      }

      const fields: string[] = [];
      const values: any[] = [];
      const set = (col: string, val: any) => { fields.push(`${col} = ?`); values.push(val); };

      if (data.store_id !== undefined) set('store_id', data.store_id ?? null);
      if (data.tenant_expense_source_id !== undefined) set('tenant_expense_source_id', data.tenant_expense_source_id);
      if (data.invoice_number !== undefined) set('invoice_number', data.invoice_number ?? null);
      if (data.description !== undefined) set('description', data.description);
      if (data.amount !== undefined) set('amount', data.amount);
      if (data.currency_id !== undefined) set('currency_id', data.currency_id);
      if (data.due_date !== undefined) set('due_date', data.due_date ?? null);
      if (data.attachment_url !== undefined) set('attachment_url', data.attachment_url ?? null);
      if (data.notes !== undefined) set('notes', data.notes ?? null);

      if (fields.length > 0) {
        values.push(id, tenantId);
        await conn.query(`UPDATE expenses SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`, values);
      }

      await this.syncPayments(conn, tenantId, id, data.payments);
      await this.recomputeStatus(conn, id);

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
      'DELETE FROM expenses WHERE id = ? AND tenant_id = ?', [id, tenantId]
    );
    return result.affectedRows > 0;
  }

  static async addPayment(tenantId: number, expenseId: number, payment: PaymentInput): Promise<number> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [exp] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM expenses WHERE id = ? AND tenant_id = ?', [expenseId, tenantId]
      );
      if (exp.length === 0) throw { status: 404, message: 'Expense not found' };

      if (payment.amount == null || !payment.payment_date || !payment.currency_id || !payment.paid_by) {
        throw { status: 400, message: 'amount, payment_date, currency_id, paid_by are required' };
      }

      if (payment.tenant_payment_type_id) {
        const [pt] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM tenant_payment_types WHERE id = ? AND tenant_id = ?',
          [payment.tenant_payment_type_id, tenantId]
        );
        if (pt.length === 0) throw { status: 400, message: 'Invalid payment type' };
      }

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO expense_payments
         (expense_id, tenant_payment_type_id, currency_id, amount, payment_date, reference_number, notes, paid_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [expenseId, payment.tenant_payment_type_id ?? null, payment.currency_id, payment.amount,
         payment.payment_date, payment.reference_number ?? null, payment.notes ?? null, payment.paid_by]
      );

      await this.recomputeStatus(conn, expenseId);
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
        `SELECT ep.expense_id
         FROM expense_payments ep
         JOIN expenses e ON e.id = ep.expense_id
         WHERE ep.id = ? AND e.tenant_id = ?`,
        [paymentId, tenantId]
      );
      if (rows.length === 0) {
        await conn.commit();
        return false;
      }
      const expenseId = Number(rows[0].expense_id);

      const [result] = await conn.query<ResultSetHeader>(
        'DELETE FROM expense_payments WHERE id = ?', [paymentId]
      );

      await this.recomputeStatus(conn, expenseId);
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
