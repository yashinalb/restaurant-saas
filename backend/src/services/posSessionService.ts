import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface LoginInput {
  pin: string;
  store_id: number;
  device_identifier?: string | null;
  ip_address?: string | null;
}

export class PosSessionService {
  /**
   * Authenticate a waiter via PIN (scoped to tenant + store) and open a session.
   * If an active session already exists for the same waiter + device, it's reused.
   */
  static async login(tenantId: number, data: LoginInput): Promise<any> {
    if (!data.pin || !data.store_id) {
      throw { status: 400, message: 'pin and store_id are required' };
    }

    const [waiterRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, store_id, is_active
       FROM tenant_waiters
       WHERE tenant_id = ? AND pin = ?`,
      [tenantId, data.pin]
    );
    if (waiterRows.length === 0) throw { status: 401, message: 'Invalid PIN' };
    const waiter = waiterRows[0];
    if (!waiter.is_active) throw { status: 403, message: 'Waiter account is inactive' };
    if (waiter.store_id != null && Number(waiter.store_id) !== Number(data.store_id)) {
      throw { status: 403, message: 'This waiter is not assigned to the selected store' };
    }

    const [storeRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM stores WHERE id = ? AND tenant_id = ?',
      [data.store_id, tenantId]
    );
    if (storeRows.length === 0) throw { status: 400, message: 'Invalid store' };

    // Reuse an existing active session for this waiter + device if present
    if (data.device_identifier) {
      const [existing] = await pool.query<RowDataPacket[]>(
        `SELECT id FROM tenant_waiter_sessions
         WHERE tenant_waiter_id = ? AND device_identifier = ? AND logged_out_at IS NULL
         ORDER BY id DESC LIMIT 1`,
        [waiter.id, data.device_identifier]
      );
      if (existing.length > 0) {
        return this.getSessionById(tenantId, Number(existing[0].id));
      }
    }

    const loggedInAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO tenant_waiter_sessions
       (tenant_waiter_id, store_id, device_identifier, ip_address, logged_in_at)
       VALUES (?, ?, ?, ?, ?)`,
      [waiter.id, data.store_id, data.device_identifier ?? null, data.ip_address ?? null, loggedInAt]
    );
    return this.getSessionById(tenantId, result.insertId);
  }

  static async logout(tenantId: number, sessionId: number): Promise<boolean> {
    // Verify session belongs to this tenant (via waiter join)
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT s.id FROM tenant_waiter_sessions s
       JOIN tenant_waiters w ON w.id = s.tenant_waiter_id
       WHERE s.id = ? AND w.tenant_id = ? AND s.logged_out_at IS NULL`,
      [sessionId, tenantId]
    );
    if (rows.length === 0) return false;

    const loggedOutAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE tenant_waiter_sessions SET logged_out_at = ? WHERE id = ?',
      [loggedOutAt, sessionId]
    );
    return result.affectedRows > 0;
  }

  static async getSessionById(tenantId: number, sessionId: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT s.*,
        w.name as waiter_name, w.tenant_id, w.image_url as waiter_image_url,
        st.name as store_name
       FROM tenant_waiter_sessions s
       JOIN tenant_waiters w ON w.id = s.tenant_waiter_id
       LEFT JOIN stores st ON st.id = s.store_id
       WHERE s.id = ? AND w.tenant_id = ?`,
      [sessionId, tenantId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Get the active session for a given device (if any).
   * Used by the POS shell to restore state on reload.
   */
  static async getActiveSessionForDevice(tenantId: number, deviceIdentifier: string): Promise<any | null> {
    if (!deviceIdentifier) return null;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT s.*,
        w.name as waiter_name, w.tenant_id, w.image_url as waiter_image_url,
        st.name as store_name
       FROM tenant_waiter_sessions s
       JOIN tenant_waiters w ON w.id = s.tenant_waiter_id
       LEFT JOIN stores st ON st.id = s.store_id
       WHERE w.tenant_id = ? AND s.device_identifier = ? AND s.logged_out_at IS NULL
       ORDER BY s.id DESC LIMIT 1`,
      [tenantId, deviceIdentifier]
    );
    return rows.length > 0 ? rows[0] : null;
  }
}
