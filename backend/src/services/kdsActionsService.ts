import pool from '../config/database.js';
import { RowDataPacket, PoolConnection } from 'mysql2/promise';
import { RealtimeEvents } from './realtimeService.js';

/**
 * KDS cook-facing actions (45.3).
 *
 * Bump   — preparing → ready (or pending → ready, collapsing the intermediate state
 *          when a cook taps directly without a waiter "start" tap).
 * Recall — ready → preparing, but only if the item transitioned to ready recently
 *          (default window: 90 seconds). After that the waiter is assumed to have
 *          picked it up and a recall could cause confusion.
 * BumpAll — marks every still-active item on this ticket (at our destination) ready.
 *
 * Ownership: every action takes a KDS device's `(tenantId, storeId, destinationId)`
 * tuple so a bar KDS can't bump kitchen items even if an order_item_id leaks.
 */

const RECALL_WINDOW_SECONDS = 90;

async function resolveStatusId(
  conn: PoolConnection,
  tenantId: number,
  code: string
): Promise<number | null> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT id FROM tenant_order_item_statuses
     WHERE tenant_id = ? AND is_active = 1
     ORDER BY (code = ?) DESC, sort_order ASC, id ASC LIMIT 1`,
    [tenantId, code]
  );
  return rows.length > 0 ? Number(rows[0].id) : null;
}

async function loadKdsItem(
  conn: PoolConnection,
  tenantId: number,
  storeId: number,
  destinationId: number,
  orderItemId: number
): Promise<{
  kds_id: number; order_id: number; current_status: string;
  item_status_code: string; completed_at: string | null;
} | null> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT k.id AS kds_id, k.order_id, k.status AS kds_status, k.completed_at,
            ois.code AS item_status_code
     FROM kds_orders k
     JOIN order_items oi ON oi.id = k.order_item_id
     LEFT JOIN tenant_order_item_statuses ois ON ois.id = oi.tenant_order_item_status_id
     WHERE k.order_item_id = ?
       AND k.tenant_id = ?
       AND k.store_id = ?
       AND k.tenant_order_destination_id = ?
     LIMIT 1`,
    [orderItemId, tenantId, storeId, destinationId]
  );
  if (rows.length === 0) return null;
  return {
    kds_id: Number(rows[0].kds_id),
    order_id: Number(rows[0].order_id),
    current_status: String(rows[0].kds_status),
    item_status_code: String(rows[0].item_status_code || 'pending'),
    completed_at: rows[0].completed_at ?? null,
  };
}

export class KdsActionsService {
  /** preparing/pending → ready */
  static async bump(
    tenantId: number, storeId: number, destinationId: number, orderItemId: number
  ): Promise<{ order_id: number; from: string; to: 'ready' }> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const k = await loadKdsItem(conn, tenantId, storeId, destinationId, orderItemId);
      if (!k) throw { status: 404, message: 'Item not found at this destination' };
      if (k.current_status === 'ready') {
        await conn.rollback();
        return { order_id: k.order_id, from: 'ready', to: 'ready' };
      }
      if (k.current_status === 'served' || k.current_status === 'cancelled') {
        throw { status: 400, message: `Cannot bump an item that is "${k.current_status}"` };
      }

      const readyId = await resolveStatusId(conn, tenantId, 'ready');
      if (!readyId) throw { status: 400, message: 'No tenant_order_item_statuses row for "ready"' };

      await conn.query(
        'UPDATE order_items SET tenant_order_item_status_id = ? WHERE id = ?',
        [readyId, orderItemId]
      );
      await conn.query(
        `UPDATE kds_orders
         SET status = 'ready',
             started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
             completed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [k.kds_id]
      );
      await conn.commit();

      RealtimeEvents.itemStatus(tenantId, k.order_id, storeId, orderItemId, k.item_status_code, 'ready', destinationId);
      RealtimeEvents.kdsUpserted(tenantId, storeId, destinationId, {
        order_id: k.order_id,
        order_item_id: orderItemId,
        status: 'ready',
      });
      return { order_id: k.order_id, from: k.item_status_code, to: 'ready' };
    } catch (error) {
      try { await conn.rollback(); } catch {}
      throw error;
    } finally {
      conn.release();
    }
  }

  /** ready → preparing, only if within the recall window. */
  static async recall(
    tenantId: number, storeId: number, destinationId: number, orderItemId: number
  ): Promise<{ order_id: number; from: 'ready'; to: 'preparing' }> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const k = await loadKdsItem(conn, tenantId, storeId, destinationId, orderItemId);
      if (!k) throw { status: 404, message: 'Item not found at this destination' };
      if (k.current_status !== 'ready') {
        throw { status: 400, message: `Can only recall items marked ready (current: "${k.current_status}")` };
      }
      if (!k.completed_at) {
        throw { status: 400, message: 'No completion timestamp; nothing to recall' };
      }
      const elapsedSec = (Date.now() - new Date(k.completed_at).getTime()) / 1000;
      if (elapsedSec > RECALL_WINDOW_SECONDS) {
        throw { status: 410, message: 'Recall window has expired' };
      }

      const preparingId = await resolveStatusId(conn, tenantId, 'preparing');
      if (!preparingId) throw { status: 400, message: 'No tenant_order_item_statuses row for "preparing"' };

      await conn.query(
        'UPDATE order_items SET tenant_order_item_status_id = ? WHERE id = ?',
        [preparingId, orderItemId]
      );
      await conn.query(
        `UPDATE kds_orders
         SET status = 'preparing',
             completed_at = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [k.kds_id]
      );
      await conn.commit();

      RealtimeEvents.itemStatus(tenantId, k.order_id, storeId, orderItemId, 'ready', 'preparing', destinationId);
      RealtimeEvents.kdsUpserted(tenantId, storeId, destinationId, {
        order_id: k.order_id,
        order_item_id: orderItemId,
        status: 'preparing',
      });
      return { order_id: k.order_id, from: 'ready', to: 'preparing' };
    } catch (error) {
      try { await conn.rollback(); } catch {}
      throw error;
    } finally {
      conn.release();
    }
  }

  /** Bump every still-active item at this destination for the given order. */
  static async bumpAll(
    tenantId: number, storeId: number, destinationId: number, orderId: number
  ): Promise<{ bumped_item_ids: number[] }> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT k.id AS kds_id, k.order_item_id, k.status AS kds_status,
                ois.code AS item_status_code
         FROM kds_orders k
         JOIN order_items oi ON oi.id = k.order_item_id
         LEFT JOIN tenant_order_item_statuses ois ON ois.id = oi.tenant_order_item_status_id
         WHERE k.tenant_id = ? AND k.store_id = ? AND k.tenant_order_destination_id = ?
           AND k.order_id = ? AND k.status IN ('pending','preparing')`,
        [tenantId, storeId, destinationId, orderId]
      );
      if (rows.length === 0) {
        await conn.rollback();
        return { bumped_item_ids: [] };
      }

      const readyId = await resolveStatusId(conn, tenantId, 'ready');
      if (!readyId) throw { status: 400, message: 'No tenant_order_item_statuses row for "ready"' };

      const bumped: Array<{ item_id: number; from: string }> = [];
      for (const r of rows) {
        const itemId = Number(r.order_item_id);
        await conn.query(
          'UPDATE order_items SET tenant_order_item_status_id = ? WHERE id = ?',
          [readyId, itemId]
        );
        await conn.query(
          `UPDATE kds_orders
           SET status = 'ready',
               started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
               completed_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [Number(r.kds_id)]
        );
        bumped.push({ item_id: itemId, from: String(r.item_status_code || 'pending') });
      }
      await conn.commit();

      for (const b of bumped) {
        RealtimeEvents.itemStatus(tenantId, orderId, storeId, b.item_id, b.from, 'ready', destinationId);
        RealtimeEvents.kdsUpserted(tenantId, storeId, destinationId, {
          order_id: orderId, order_item_id: b.item_id, status: 'ready',
        });
      }
      return { bumped_item_ids: bumped.map(b => b.item_id) };
    } catch (error) {
      try { await conn.rollback(); } catch {}
      throw error;
    } finally {
      conn.release();
    }
  }

  static readonly RECALL_WINDOW_SECONDS = RECALL_WINDOW_SECONDS;
}
