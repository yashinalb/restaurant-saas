import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import { CashRegisterSessionService } from './cashRegisterSessionService.js';

interface ShiftLookup {
  store_id: number;
  currency_id: number;
}

export class PosShiftService {
  /**
   * Return the open shift for (store, currency) if one exists, or null.
   */
  static async getActive(tenantId: number, params: ShiftLookup): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT sess.*,
        ob.email as opened_by_email, ob.first_name as opened_by_first_name, ob.last_name as opened_by_last_name,
        c.code as currency_code, c.symbol as currency_symbol,
        s.name as store_name, s.receipt_printer_ip
       FROM cash_register_sessions sess
       LEFT JOIN admin_users ob ON ob.id = sess.opened_by
       LEFT JOIN currencies c ON c.id = sess.currency_id
       LEFT JOIN stores s ON s.id = sess.store_id
       WHERE sess.tenant_id = ? AND sess.store_id = ? AND sess.currency_id = ? AND sess.closed_at IS NULL
       ORDER BY sess.opened_at DESC LIMIT 1`,
      [tenantId, params.store_id, params.currency_id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Throws if no open shift exists. Used by payment gating.
   */
  static async requireActive(conn: PoolConnection, tenantId: number, params: ShiftLookup): Promise<any> {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT id, opened_by, opening_amount FROM cash_register_sessions
       WHERE tenant_id = ? AND store_id = ? AND currency_id = ? AND closed_at IS NULL
       ORDER BY opened_at DESC LIMIT 1`,
      [tenantId, params.store_id, params.currency_id]
    );
    if (rows.length === 0) {
      throw { status: 409, code: 'shift_closed', message: 'No open cash register session for this store and currency. Start a shift before taking payments.' };
    }
    return rows[0];
  }

  /**
   * Compute expected cash on hand: opening amount + cash payments (in this currency)
   * taken during the session window.
   */
  static async computeExpectedCash(tenantId: number, sessionId: number): Promise<{
    opening: number;
    cash_received: number;
    expected: number;
  }> {
    const [sessRows] = await pool.query<RowDataPacket[]>(
      `SELECT s.id, s.opened_at, s.closed_at, s.store_id, s.currency_id, s.opening_amount
       FROM cash_register_sessions s
       WHERE s.id = ? AND s.tenant_id = ?`,
      [sessionId, tenantId]
    );
    if (sessRows.length === 0) throw { status: 404, message: 'Session not found' };
    const sess = sessRows[0];
    const opening = Number(sess.opening_amount) || 0;
    const windowEnd = sess.closed_at || new Date();

    const [cashRows] = await pool.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(tp.amount), 0) as cash
       FROM transaction_payments tp
       JOIN transactions t ON t.id = tp.transaction_id
       JOIN tenant_payment_types pt ON pt.id = tp.tenant_payment_type_id
       WHERE t.tenant_id = ? AND t.store_id = ? AND tp.currency_id = ?
         AND t.created_at BETWEEN ? AND ?
         AND pt.code = 'cash'`,
      [tenantId, sess.store_id, sess.currency_id, sess.opened_at, windowEnd]
    );
    const cashReceived = Number(cashRows[0]?.cash) || 0;
    const expected = Math.round((opening + cashReceived) * 100) / 100;
    return { opening, cash_received: cashReceived, expected };
  }

  /**
   * Open a shift (thin wrapper around CashRegisterSessionService.create).
   */
  static async open(tenantId: number, params: {
    store_id: number;
    currency_id: number;
    opening_amount: number;
    opened_by: number;
    notes?: string | null;
  }): Promise<number> {
    return CashRegisterSessionService.create(tenantId, {
      store_id: params.store_id,
      currency_id: params.currency_id,
      opening_amount: params.opening_amount,
      opened_by: params.opened_by,
      notes: params.notes ?? null,
    });
  }

  /**
   * Close the active shift for (store, currency), auto-computing expected cash
   * from transaction_payments during the session window when not provided.
   */
  static async close(tenantId: number, params: {
    store_id: number;
    currency_id: number;
    closing_amount: number;
    expected_amount?: number | null;
    closed_by: number;
    notes?: string | null;
  }): Promise<{ session_id: number; opening: number; cash_received: number; expected: number; closing: number; difference: number; }> {
    const active = await this.getActive(tenantId, { store_id: params.store_id, currency_id: params.currency_id });
    if (!active) throw { status: 404, message: 'No open shift to close' };
    const sessionId = Number(active.id);

    const computed = await this.computeExpectedCash(tenantId, sessionId);
    const expected = params.expected_amount != null ? Number(params.expected_amount) : computed.expected;

    await CashRegisterSessionService.close(tenantId, sessionId, {
      closing_amount: params.closing_amount,
      expected_amount: expected,
      closed_by: params.closed_by,
      notes: params.notes ?? null,
    });

    const difference = Math.round((Number(params.closing_amount) - expected) * 100) / 100;
    return {
      session_id: sessionId,
      opening: computed.opening,
      cash_received: computed.cash_received,
      expected,
      closing: Number(params.closing_amount),
      difference,
    };
  }

  /**
   * Send an ESC/POS drawer-open pulse (ESC p 0 25 250) to the store's receipt
   * printer. Best-effort; never throws.
   */
  static async pulseDrawer(tenantId: number, storeId: number): Promise<{ pulsed: boolean; printer_ip: string | null; reason?: string }> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT receipt_printer_ip FROM stores WHERE id = ? AND tenant_id = ?',
      [storeId, tenantId]
    );
    const ip: string | null = rows[0]?.receipt_printer_ip || null;
    if (!ip) return { pulsed: false, printer_ip: null, reason: 'No receipt_printer_ip configured' };

    const net = await import('net');
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let settled = false;
      const finish = (pulsed: boolean, reason?: string) => {
        if (settled) return;
        settled = true;
        try { socket.destroy(); } catch { /* noop */ }
        resolve({ pulsed, printer_ip: ip, reason });
      };
      socket.setTimeout(3000);
      socket.on('timeout', () => finish(false, 'Connection timed out'));
      socket.on('error', (err) => finish(false, err.message));
      socket.connect(9100, ip, () => {
        // ESC p m t1 t2 — pulse pin 0 for 25*2ms on, 250*2ms off.
        const pulse = Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]);
        socket.write(pulse, (err) => {
          if (err) finish(false, err.message);
          else socket.end(() => finish(true));
        });
      });
    });
  }

  /**
   * Open a DB connection wrapper for requireActive use without a transaction.
   */
  static async requireActiveFromPool(tenantId: number, params: ShiftLookup): Promise<any> {
    const conn = await pool.getConnection();
    try {
      return await this.requireActive(conn, tenantId, params);
    } finally {
      conn.release();
    }
  }
}
