import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface CreateInput {
  store_id: number;
  opening_amount: number;
  currency_id: number;
  opened_by: number;
  opened_at?: string;
  notes?: string | null;
}

interface UpdateInput {
  store_id?: number;
  opening_amount?: number;
  closing_amount?: number | null;
  expected_amount?: number | null;
  currency_id?: number;
  opened_at?: string;
  closed_at?: string | null;
  closed_by?: number | null;
  notes?: string | null;
}

interface CloseInput {
  closing_amount: number;
  expected_amount?: number | null;
  closed_by: number;
  notes?: string | null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export class CashRegisterSessionService {
  static async getAll(tenantId: number, filters?: {
    store_id?: number;
    currency_id?: number;
    status?: 'open' | 'closed';
    from_date?: string;
    to_date?: string;
    opened_by?: number;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let query = `
      SELECT sess.*,
        s.name as store_name,
        c.code as currency_code, c.symbol as currency_symbol,
        ob.email as opened_by_email, ob.first_name as opened_by_first_name, ob.last_name as opened_by_last_name,
        cb.email as closed_by_email, cb.first_name as closed_by_first_name, cb.last_name as closed_by_last_name
      FROM cash_register_sessions sess
      LEFT JOIN stores s ON s.id = sess.store_id
      LEFT JOIN currencies c ON c.id = sess.currency_id
      LEFT JOIN admin_users ob ON ob.id = sess.opened_by
      LEFT JOIN admin_users cb ON cb.id = sess.closed_by
      WHERE sess.tenant_id = ?
    `;
    const params: any[] = [tenantId];

    if (filters?.store_id) { query += ' AND sess.store_id = ?'; params.push(filters.store_id); }
    if (filters?.currency_id) { query += ' AND sess.currency_id = ?'; params.push(filters.currency_id); }
    if (filters?.opened_by) { query += ' AND sess.opened_by = ?'; params.push(filters.opened_by); }
    if (filters?.status === 'open') { query += ' AND sess.closed_at IS NULL'; }
    if (filters?.status === 'closed') { query += ' AND sess.closed_at IS NOT NULL'; }
    if (filters?.from_date) { query += ' AND sess.opened_at >= ?'; params.push(filters.from_date); }
    if (filters?.to_date) { query += ' AND sess.opened_at <= ?'; params.push(filters.to_date); }

    query += ' ORDER BY sess.opened_at DESC';
    const limit = Math.min(filters?.limit ?? 100, 500);
    const offset = filters?.offset ?? 0;
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT sess.*,
        s.name as store_name,
        c.code as currency_code, c.symbol as currency_symbol,
        ob.email as opened_by_email, ob.first_name as opened_by_first_name, ob.last_name as opened_by_last_name,
        cb.email as closed_by_email, cb.first_name as closed_by_first_name, cb.last_name as closed_by_last_name
       FROM cash_register_sessions sess
       LEFT JOIN stores s ON s.id = sess.store_id
       LEFT JOIN currencies c ON c.id = sess.currency_id
       LEFT JOIN admin_users ob ON ob.id = sess.opened_by
       LEFT JOIN admin_users cb ON cb.id = sess.closed_by
       WHERE sess.id = ? AND sess.tenant_id = ?`,
      [id, tenantId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  static async create(tenantId: number, data: CreateInput): Promise<number> {
    if (!data.store_id || data.opening_amount == null || !data.currency_id || !data.opened_by) {
      throw { status: 400, message: 'store_id, opening_amount, currency_id, and opened_by are required' };
    }

    const [storeCheck] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM stores WHERE id = ? AND tenant_id = ?', [data.store_id, tenantId]
    );
    if (storeCheck.length === 0) throw { status: 400, message: 'Invalid store' };

    // Prevent multiple open sessions for same store + currency
    const [openCheck] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM cash_register_sessions
       WHERE tenant_id = ? AND store_id = ? AND currency_id = ? AND closed_at IS NULL`,
      [tenantId, data.store_id, data.currency_id]
    );
    if (openCheck.length > 0) {
      throw { status: 409, message: 'An open session already exists for this store and currency' };
    }

    const openedAt = data.opened_at || new Date().toISOString().slice(0, 19).replace('T', ' ');

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO cash_register_sessions
       (tenant_id, store_id, opened_by, opening_amount, currency_id, opened_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        data.store_id,
        data.opened_by,
        data.opening_amount,
        data.currency_id,
        openedAt,
        data.notes ?? null,
      ]
    );
    return result.insertId;
  }

  static async update(tenantId: number, id: number, data: UpdateInput): Promise<boolean> {
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT opening_amount, closing_amount, expected_amount FROM cash_register_sessions WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    if (existing.length === 0) throw { status: 404, message: 'Session not found' };
    const current = existing[0];

    const fields: string[] = [];
    const values: any[] = [];
    const set = (col: string, val: any) => { fields.push(`${col} = ?`); values.push(val); };

    if (data.store_id !== undefined) set('store_id', data.store_id);
    if (data.opening_amount !== undefined) set('opening_amount', data.opening_amount);
    if (data.currency_id !== undefined) set('currency_id', data.currency_id);
    if (data.opened_at !== undefined) set('opened_at', data.opened_at);
    if (data.notes !== undefined) set('notes', data.notes ?? null);

    let finalClosing = current.closing_amount;
    let finalExpected = current.expected_amount;

    if (data.closing_amount !== undefined) {
      set('closing_amount', data.closing_amount ?? null);
      finalClosing = data.closing_amount;
    }
    if (data.expected_amount !== undefined) {
      set('expected_amount', data.expected_amount ?? null);
      finalExpected = data.expected_amount;
    }
    if (data.closed_at !== undefined) set('closed_at', data.closed_at ?? null);
    if (data.closed_by !== undefined) set('closed_by', data.closed_by ?? null);

    // Recompute difference whenever closing or expected is touched
    if (data.closing_amount !== undefined || data.expected_amount !== undefined) {
      if (finalClosing != null && finalExpected != null) {
        set('difference', round2(Number(finalClosing) - Number(finalExpected)));
      } else {
        set('difference', null);
      }
    }

    if (fields.length > 0) {
      values.push(id, tenantId);
      await pool.query(
        `UPDATE cash_register_sessions SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`,
        values
      );
    }
    return true;
  }

  static async close(tenantId: number, id: number, data: CloseInput): Promise<boolean> {
    if (data.closing_amount == null || !data.closed_by) {
      throw { status: 400, message: 'closing_amount and closed_by are required' };
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT opening_amount, closed_at FROM cash_register_sessions WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    if (rows.length === 0) throw { status: 404, message: 'Session not found' };
    if (rows[0].closed_at) throw { status: 400, message: 'Session is already closed' };

    // If expected_amount isn't provided, fall back to opening_amount (caller may compute expected externally)
    const expected = data.expected_amount != null ? Number(data.expected_amount) : Number(rows[0].opening_amount);
    const difference = round2(Number(data.closing_amount) - expected);
    const closedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await pool.query(
      `UPDATE cash_register_sessions
       SET closing_amount = ?, expected_amount = ?, difference = ?, closed_at = ?, closed_by = ?, notes = COALESCE(?, notes)
       WHERE id = ? AND tenant_id = ?`,
      [data.closing_amount, expected, difference, closedAt, data.closed_by, data.notes ?? null, id, tenantId]
    );
    return true;
  }

  static async delete(tenantId: number, id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM cash_register_sessions WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    return result.affectedRows > 0;
  }
}
