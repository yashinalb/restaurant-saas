import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { RealtimeEvents } from './realtimeService.js';

async function recomputeOrderTotals(conn: any, orderId: number): Promise<void> {
  const [sumRows] = await conn.query(
    'SELECT COALESCE(SUM(total_price), 0) as subtotal FROM order_items WHERE order_id = ?',
    [orderId]
  );
  const subtotal = Number(sumRows[0]?.subtotal) || 0;
  const [tr] = await conn.query(
    'SELECT tax_amount, service_charge, discount_amount FROM orders WHERE id = ?',
    [orderId]
  );
  const tax = Number(tr[0]?.tax_amount) || 0;
  const service = Number(tr[0]?.service_charge) || 0;
  const discount = Number(tr[0]?.discount_amount) || 0;
  const total = Math.round((subtotal + tax + service - discount) * 100) / 100;
  await conn.query(
    'UPDATE orders SET subtotal = ?, total = ? WHERE id = ?',
    [subtotal, total, orderId]
  );
}

export class PosMoveItemsService {
  /**
   * Active open orders for a store — used by the "move items" picker to show
   * which orders the items can be moved to.
   */
  static async listActiveOrders(tenantId: number, params: {
    store_id: number;
    exclude_order_id?: number;
  }): Promise<any[]> {
    const conditions = ['o.tenant_id = ?', 'o.store_id = ?', "o.order_status = 'open'"];
    const values: any[] = [tenantId, params.store_id];
    if (params.exclude_order_id) {
      conditions.push('o.id != ?');
      values.push(params.exclude_order_id);
    }
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT o.id, o.order_number, o.table_id, o.total, o.created_at,
              t.name as table_name,
              (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count
       FROM orders o
       LEFT JOIN tenant_table_structures t ON t.id = o.table_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY o.created_at DESC
       LIMIT 200`,
      values
    );
    return rows;
  }

  /**
   * Move one or more line items from the source order to the target order.
   * Both orders must belong to the tenant and be in `open` status.
   * Sets `original_order_id` on each moved item to track its origin.
   */
  static async moveItems(
    tenantId: number,
    sourceOrderId: number,
    targetOrderId: number,
    orderItemIds: number[]
  ): Promise<{ moved_count: number; moved_item_ids: number[] }> {
    if (!sourceOrderId || !targetOrderId) throw { status: 400, message: 'Source and target order IDs are required' };
    if (sourceOrderId === targetOrderId) throw { status: 400, message: 'Source and target orders must be different' };
    if (!Array.isArray(orderItemIds) || orderItemIds.length === 0) {
      throw { status: 400, message: 'order_item_ids[] is required' };
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Verify both orders belong to the tenant and are open
      const [orderRows] = await conn.query<RowDataPacket[]>(
        `SELECT id, order_status, store_id FROM orders WHERE id IN (?, ?) AND tenant_id = ?`,
        [sourceOrderId, targetOrderId, tenantId]
      );
      if (orderRows.length !== 2) throw { status: 404, message: 'One or both orders not found' };
      for (const row of orderRows) {
        if (row.order_status !== 'open') {
          throw { status: 400, message: 'Both orders must be open to move items' };
        }
      }

      // Verify all order items belong to the source order
      const placeholders = orderItemIds.map(() => '?').join(',');
      const [itemRows] = await conn.query<RowDataPacket[]>(
        `SELECT id, original_order_id FROM order_items
         WHERE id IN (${placeholders}) AND order_id = ?`,
        [...orderItemIds, sourceOrderId]
      );
      if (itemRows.length !== orderItemIds.length) {
        throw { status: 400, message: 'One or more order items do not belong to the source order' };
      }

      // Move each item: set original_order_id if not already set (first move wins)
      const movedIds: number[] = [];
      for (const row of itemRows) {
        const id = Number(row.id);
        const originalId = row.original_order_id != null ? Number(row.original_order_id) : sourceOrderId;
        await conn.query(
          `UPDATE order_items
           SET order_id = ?, original_order_id = ?
           WHERE id = ?`,
          [targetOrderId, originalId, id]
        );
        movedIds.push(id);
      }

      // Recompute totals on both orders
      await recomputeOrderTotals(conn, sourceOrderId);
      await recomputeOrderTotals(conn, targetOrderId);

      await conn.commit();

      const storeId = Number(orderRows.find(r => Number(r.id) === sourceOrderId)?.store_id) || null;
      RealtimeEvents.orderUpdated(tenantId, sourceOrderId, storeId, { change: 'items_moved_out', moved_item_ids: movedIds, target_order_id: targetOrderId });
      RealtimeEvents.orderUpdated(tenantId, targetOrderId, storeId, { change: 'items_moved_in', moved_item_ids: movedIds, source_order_id: sourceOrderId });

      return { moved_count: movedIds.length, moved_item_ids: movedIds };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}
