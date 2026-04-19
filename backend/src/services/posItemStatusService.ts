import pool from '../config/database.js';
import { RowDataPacket, PoolConnection } from 'mysql2/promise';
import { PosFireService } from './posFireService.js';

export type ItemStatusCode = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';

const ALLOWED_TRANSITIONS: Record<ItemStatusCode, ItemStatusCode[]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served', 'cancelled'],
  served: [],
  cancelled: [],
};

function isAllowed(from: ItemStatusCode, to: ItemStatusCode): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

async function resolveStatusId(conn: PoolConnection, tenantId: number, code: string): Promise<number | null> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT id FROM tenant_order_item_statuses
     WHERE tenant_id = ? AND is_active = 1
     ORDER BY (code = ?) DESC, sort_order ASC, id ASC LIMIT 1`,
    [tenantId, code]
  );
  return rows.length > 0 ? Number(rows[0].id) : null;
}

export class PosItemStatusService {
  /**
   * Transition a single order item to a new status, enforcing the state machine.
   * `cancelled` from a fired state (preparing/ready) delegates to PosFireService so
   * the kitchen gets a void ticket and the KDS entry is cancelled in one step.
   */
  static async transition(
    tenantId: number,
    orderItemId: number,
    to: ItemStatusCode,
    opts: { language?: string } = {}
  ): Promise<{ from: ItemStatusCode; to: ItemStatusCode; order_id: number; skipped?: string }> {
    if (!['pending', 'preparing', 'ready', 'served', 'cancelled'].includes(to)) {
      throw { status: 400, message: `Invalid target status: ${to}` };
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Look up the item, its current status, and its order context (tenant-scoped)
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT oi.id, oi.order_id, ois.code as status_code, o.order_status
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         LEFT JOIN tenant_order_item_statuses ois ON ois.id = oi.tenant_order_item_status_id
         WHERE oi.id = ? AND o.tenant_id = ?`,
        [orderItemId, tenantId]
      );
      if (rows.length === 0) throw { status: 404, message: 'Order item not found' };
      const row = rows[0];
      const from = String(row.status_code || 'pending') as ItemStatusCode;
      const orderId = Number(row.order_id);

      if (from === to) {
        await conn.commit();
        return { from, to, order_id: orderId, skipped: 'already in target status' };
      }

      if (!isAllowed(from, to)) {
        throw {
          status: 400,
          message: `Illegal transition ${from} → ${to}. Allowed from "${from}": ${ALLOWED_TRANSITIONS[from].join(', ') || 'none (terminal)'}`,
        };
      }

      // Cancelling from a fired state: defer to the void flow so the kitchen is notified.
      if (to === 'cancelled' && (from === 'preparing' || from === 'ready')) {
        await conn.commit();
        await PosFireService.fire(tenantId, {
          order_id: orderId,
          void_item_ids: [orderItemId],
          language: opts.language,
        });
        return { from, to, order_id: orderId };
      }

      // Regular transition — update order_items + mirror KDS status where applicable
      const targetId = await resolveStatusId(conn, tenantId, to);
      if (!targetId) throw { status: 400, message: `No tenant_order_item_statuses row for "${to}"` };
      await conn.query(
        'UPDATE order_items SET tenant_order_item_status_id = ? WHERE id = ?',
        [targetId, orderItemId]
      );

      // KDS mirror
      const [kdsRows] = await conn.query<RowDataPacket[]>(
        'SELECT id, status, started_at, completed_at FROM kds_orders WHERE order_item_id = ? LIMIT 1',
        [orderItemId]
      );
      if (kdsRows.length > 0) {
        const kdsId = Number(kdsRows[0].id);
        const sets: string[] = ['status = ?'];
        const params: any[] = [to === 'cancelled' ? 'cancelled' : to];
        if (to === 'preparing' && !kdsRows[0].started_at) {
          sets.push('started_at = CURRENT_TIMESTAMP');
        }
        if ((to === 'ready' || to === 'served') && !kdsRows[0].completed_at) {
          sets.push('completed_at = CURRENT_TIMESTAMP');
        }
        sets.push('updated_at = CURRENT_TIMESTAMP');
        params.push(kdsId);
        await conn.query(`UPDATE kds_orders SET ${sets.join(', ')} WHERE id = ?`, params);
      }

      await conn.commit();
      return { from, to, order_id: orderId };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}
