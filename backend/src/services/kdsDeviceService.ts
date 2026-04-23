import crypto from 'crypto';
import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

/**
 * KDS Device pairing + session service (45.1).
 *
 * Flow:
 *   1. Tenant admin calls `createPairingCode(tenantId, store, destination)` —
 *      returns a 6-digit code valid for 10 minutes.
 *   2. A KDS display opens `/kds`, enters the code via `pair(code)` —
 *      receives a long-lived `device_token`.
 *   3. The display includes that token in later requests (GET /kds/me, realtime auth).
 *   4. Admin can revoke the device; device can unpair itself.
 */

const PAIRING_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const DEVICE_TOKEN_BYTES = 48;

function generatePairingCode(): string {
  // 6-digit zero-padded numeric code. Collision-handled by unique index + retry.
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, '0');
}

function generateDeviceToken(): string {
  return crypto.randomBytes(DEVICE_TOKEN_BYTES).toString('base64url');
}

export interface KdsDevice {
  id: number;
  tenant_id: number;
  store_id: number;
  tenant_order_destination_id: number;
  name: string | null;
  paired_at: string | null;
  last_seen_at: string | null;
  is_active: number;
  pairing_code: string | null;
  pairing_code_expires_at: string | null;
}

export interface KdsDeviceContext {
  device_id: number;
  tenant_id: number;
  store_id: number;
  store_name: string | null;
  destination_id: number;
  destination_code: string | null;
  destination_name: string | null;
  name: string | null;
}

export class KdsDeviceService {
  static async createPairingCode(
    tenantId: number,
    data: { store_id: number; tenant_order_destination_id: number; name?: string | null; created_by?: number | null }
  ): Promise<{ device_id: number; pairing_code: string; expires_at: Date }> {
    if (!data.store_id) throw { status: 400, message: 'store_id is required' };
    if (!data.tenant_order_destination_id) throw { status: 400, message: 'tenant_order_destination_id is required' };

    // Verify store belongs to tenant + destination belongs to tenant
    const [storeRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM stores WHERE id = ? AND tenant_id = ?',
      [data.store_id, tenantId]
    );
    if (storeRows.length === 0) throw { status: 400, message: 'Invalid store' };

    const [destRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM tenant_order_destinations WHERE id = ? AND tenant_id = ?',
      [data.tenant_order_destination_id, tenantId]
    );
    if (destRows.length === 0) throw { status: 400, message: 'Invalid destination' };

    const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS);

    // Try up to 5 times on pairing_code uniqueness collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generatePairingCode();
      try {
        const [result] = await pool.query<ResultSetHeader>(
          `INSERT INTO kds_devices
           (tenant_id, store_id, tenant_order_destination_id, name,
            pairing_code, pairing_code_expires_at, is_active, created_by)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
          [
            tenantId, data.store_id, data.tenant_order_destination_id,
            data.name ?? null, code, expiresAt, data.created_by ?? null,
          ]
        );
        return { device_id: result.insertId, pairing_code: code, expires_at: expiresAt };
      } catch (err: any) {
        if (err?.code !== 'ER_DUP_ENTRY') throw err;
      }
    }
    throw { status: 500, message: 'Could not allocate a unique pairing code' };
  }

  /**
   * Pair a device using a pairing code. Returns the long-lived device_token.
   * Called publicly (no admin auth) from the KDS app at first boot.
   */
  static async pair(code: string): Promise<{ device_token: string; context: KdsDeviceContext }> {
    if (!code || !/^\d{6}$/.test(code.trim())) {
      throw { status: 400, message: 'Invalid pairing code' };
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, tenant_id, store_id, tenant_order_destination_id, pairing_code_expires_at, is_active
       FROM kds_devices
       WHERE pairing_code = ? LIMIT 1`,
      [code.trim()]
    );
    if (rows.length === 0) throw { status: 404, message: 'Pairing code not found' };
    const row = rows[0];
    if (!row.is_active) throw { status: 403, message: 'Device is disabled' };
    if (!row.pairing_code_expires_at || new Date(row.pairing_code_expires_at).getTime() < Date.now()) {
      throw { status: 410, message: 'Pairing code has expired' };
    }

    const token = generateDeviceToken();
    await pool.query(
      `UPDATE kds_devices
       SET device_token = ?, paired_at = CURRENT_TIMESTAMP, last_seen_at = CURRENT_TIMESTAMP,
           pairing_code = NULL, pairing_code_expires_at = NULL
       WHERE id = ?`,
      [token, row.id]
    );

    const context = await this.contextForDevice(Number(row.id));
    if (!context) throw { status: 500, message: 'Failed to load device context after pairing' };
    return { device_token: token, context };
  }

  static async authenticateToken(token: string): Promise<KdsDeviceContext | null> {
    if (!token) return null;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, is_active FROM kds_devices WHERE device_token = ? LIMIT 1`,
      [token]
    );
    if (rows.length === 0 || !rows[0].is_active) return null;
    await pool.query(
      `UPDATE kds_devices SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [rows[0].id]
    );
    return this.contextForDevice(Number(rows[0].id));
  }

  static async contextForDevice(deviceId: number): Promise<KdsDeviceContext | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT d.id, d.tenant_id, d.store_id, d.tenant_order_destination_id, d.name,
              s.name AS store_name,
              td.code AS destination_code,
              td.id AS destination_id,
              (SELECT name FROM tenant_order_destination_translations
               WHERE tenant_order_destination_id = td.id LIMIT 1) AS destination_name
       FROM kds_devices d
       LEFT JOIN stores s ON s.id = d.store_id
       LEFT JOIN tenant_order_destinations td ON td.id = d.tenant_order_destination_id
       WHERE d.id = ? LIMIT 1`,
      [deviceId]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      device_id: Number(r.id),
      tenant_id: Number(r.tenant_id),
      store_id: Number(r.store_id),
      store_name: r.store_name ?? null,
      destination_id: Number(r.tenant_order_destination_id),
      destination_code: r.destination_code ?? null,
      destination_name: r.destination_name ?? null,
      name: r.name ?? null,
    };
  }

  /** Device unpair — called from the KDS display. */
  static async unpairSelf(deviceId: number): Promise<void> {
    await pool.query(
      `UPDATE kds_devices SET device_token = NULL, paired_at = NULL, is_active = 0 WHERE id = ?`,
      [deviceId]
    );
  }

  static async listForTenant(tenantId: number, filters?: { store_id?: number }): Promise<KdsDevice[]> {
    const where = ['tenant_id = ?'];
    const params: any[] = [tenantId];
    if (filters?.store_id) { where.push('store_id = ?'); params.push(filters.store_id); }
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT d.*, s.name AS store_name,
              (SELECT name FROM tenant_order_destination_translations
               WHERE tenant_order_destination_id = d.tenant_order_destination_id LIMIT 1) AS destination_name
       FROM kds_devices d
       LEFT JOIN stores s ON s.id = d.store_id
       WHERE ${where.join(' AND ')}
       ORDER BY d.created_at DESC`,
      params
    );
    return rows as KdsDevice[];
  }

  static async revoke(tenantId: number, deviceId: number): Promise<void> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE kds_devices
       SET device_token = NULL, paired_at = NULL, pairing_code = NULL,
           pairing_code_expires_at = NULL, is_active = 0
       WHERE id = ? AND tenant_id = ?`,
      [deviceId, tenantId]
    );
    if (result.affectedRows === 0) throw { status: 404, message: 'Device not found' };
  }
}
