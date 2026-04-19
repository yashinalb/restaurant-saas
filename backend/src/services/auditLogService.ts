import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export type AuditAction =
  | 'void_order'
  | 'void_item'
  | 'ikram'
  | 'discount_apply'
  | 'discount_clear'
  | 'refund'
  | 'reprint_receipt'
  | 'reprint_kitchen_ticket'
  | 'drawer_open'
  | 'shift_open'
  | 'shift_close'
  | 'payment';

interface LogInput {
  tenant_id: number;
  store_id?: number | null;
  admin_user_id?: number | null;
  tenant_waiter_id?: number | null;
  action: AuditAction | string;
  target_type?: string | null;
  target_id?: number | null;
  reason?: string | null;
  before?: any;
  after?: any;
  ip_address?: string | null;
}

export interface AuditQuery {
  store_id?: number;
  action?: string;
  target_type?: string;
  target_id?: number;
  admin_user_id?: number;
  tenant_waiter_id?: number;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export class AuditLogService {
  /**
   * Write an audit row. Fire-and-forget: logs but never throws so the calling
   * action keeps succeeding even if the audit insert fails.
   */
  static async log(input: LogInput): Promise<number | null> {
    try {
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO audit_log
         (tenant_id, store_id, admin_user_id, tenant_waiter_id, action,
          target_type, target_id, reason, before_json, after_json, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.tenant_id,
          input.store_id ?? null,
          input.admin_user_id ?? null,
          input.tenant_waiter_id ?? null,
          input.action,
          input.target_type ?? null,
          input.target_id ?? null,
          input.reason ?? null,
          input.before !== undefined ? JSON.stringify(input.before) : null,
          input.after !== undefined ? JSON.stringify(input.after) : null,
          input.ip_address ?? null,
        ]
      );
      return result.insertId;
    } catch (err) {
      console.error('[AuditLogService] log failed:', err);
      return null;
    }
  }

  static async getAll(tenantId: number, filters: AuditQuery = {}): Promise<any[]> {
    let query = `
      SELECT al.*,
        au.email as admin_user_email, au.first_name as admin_user_first_name, au.last_name as admin_user_last_name,
        w.name as waiter_name,
        s.name as store_name
      FROM audit_log al
      LEFT JOIN admin_users au ON au.id = al.admin_user_id
      LEFT JOIN tenant_waiters w ON w.id = al.tenant_waiter_id
      LEFT JOIN stores s ON s.id = al.store_id
      WHERE al.tenant_id = ?
    `;
    const params: any[] = [tenantId];

    if (filters.store_id) { query += ' AND al.store_id = ?'; params.push(filters.store_id); }
    if (filters.action) { query += ' AND al.action = ?'; params.push(filters.action); }
    if (filters.target_type) { query += ' AND al.target_type = ?'; params.push(filters.target_type); }
    if (filters.target_id) { query += ' AND al.target_id = ?'; params.push(filters.target_id); }
    if (filters.admin_user_id) { query += ' AND al.admin_user_id = ?'; params.push(filters.admin_user_id); }
    if (filters.tenant_waiter_id) { query += ' AND al.tenant_waiter_id = ?'; params.push(filters.tenant_waiter_id); }
    if (filters.from_date) { query += ' AND al.created_at >= ?'; params.push(filters.from_date); }
    if (filters.to_date) { query += ' AND al.created_at <= ?'; params.push(filters.to_date); }

    query += ' ORDER BY al.created_at DESC';
    const limit = Math.min(filters.limit ?? 100, 500);
    const offset = filters.offset ?? 0;
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows;
  }

  static async getActions(tenantId: number): Promise<string[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT DISTINCT action FROM audit_log WHERE tenant_id = ? ORDER BY action ASC',
      [tenantId]
    );
    return rows.map(r => String(r.action));
  }
}
