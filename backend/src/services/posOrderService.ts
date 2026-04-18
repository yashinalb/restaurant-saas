import pool from '../config/database.js';
import { RowDataPacket } from 'mysql2';
import { OrderService } from './orderService.js';

interface StartOrderInput {
  session_id: number;
  table_id?: number | null;
  order_type_code?: 'dine_in' | 'takeaway' | 'delivery' | null;
  tenant_customer_id?: number | null;
  guest_name?: string | null;
  guest_phone?: string | null;
}

/**
 * Helpers that open a fresh, empty order with sensible defaults sourced from
 * the active POS session + tenant lookups.
 */
export class PosOrderService {
  private static async resolveSession(tenantId: number, sessionId: number): Promise<{ waiter_id: number; store_id: number }> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT s.tenant_waiter_id, s.store_id
       FROM tenant_waiter_sessions s
       JOIN tenant_waiters w ON w.id = s.tenant_waiter_id
       WHERE s.id = ? AND w.tenant_id = ? AND s.logged_out_at IS NULL`,
      [sessionId, tenantId]
    );
    if (rows.length === 0) throw { status: 401, message: 'Active POS session not found' };
    return { waiter_id: Number(rows[0].tenant_waiter_id), store_id: Number(rows[0].store_id) };
  }

  private static async pickLookupId(
    table: string,
    tenantId: number,
    preferredCodes: string[] = []
  ): Promise<number | null> {
    for (const code of preferredCodes) {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT id FROM ${table} WHERE tenant_id = ? AND code = ? AND is_active = 1 LIMIT 1`,
        [tenantId, code]
      );
      if (rows.length > 0) return Number(rows[0].id);
    }
    const [fallback] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM ${table} WHERE tenant_id = ? AND is_active = 1 ORDER BY sort_order ASC, id ASC LIMIT 1`,
      [tenantId]
    );
    return fallback.length > 0 ? Number(fallback[0].id) : null;
  }

  private static async pickCurrencyId(tenantId: number): Promise<number | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT currency_id FROM tenant_currencies
       WHERE tenant_id = ? AND is_active = 1
       ORDER BY is_default DESC, id ASC LIMIT 1`,
      [tenantId]
    );
    return rows.length > 0 ? Number(rows[0].currency_id) : null;
  }

  static async start(tenantId: number, data: StartOrderInput): Promise<number> {
    if (!data.session_id) throw { status: 400, message: 'session_id is required' };

    const { waiter_id, store_id } = await this.resolveSession(tenantId, data.session_id);

    // Guess order type from context: table → dine_in, else takeaway
    const typeCode = data.order_type_code || (data.table_id ? 'dine_in' : 'takeaway');

    const [orderSourceId, orderTypeId, paymentStatusId, currencyId] = await Promise.all([
      this.pickLookupId('tenant_order_sources', tenantId, ['in_store', 'pos']),
      this.pickLookupId('tenant_order_types', tenantId, [typeCode, 'dine_in']),
      this.pickLookupId('tenant_payment_statuses', tenantId, ['unpaid']),
      this.pickCurrencyId(tenantId),
    ]);

    if (!orderSourceId) throw { status: 400, message: 'No active tenant_order_sources — configure one first' };
    if (!orderTypeId) throw { status: 400, message: 'No active tenant_order_types — configure one first' };
    if (!currencyId) throw { status: 400, message: 'No active tenant currency — configure tenant currencies first' };

    return OrderService.create(tenantId, {
      store_id,
      tenant_order_source_id: orderSourceId,
      tenant_order_type_id: orderTypeId,
      tenant_payment_status_id: paymentStatusId,
      currency_id: currencyId,
      tenant_waiter_id: waiter_id,
      tenant_customer_id: data.tenant_customer_id ?? null,
      table_id: data.table_id ?? null,
      guest_name: data.guest_name ?? null,
      guest_phone: data.guest_phone ?? null,
      order_status: 'open',
    });
  }
}
