import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import { PosKitchenTicketService } from './posKitchenTicketService.js';
import { AuditLogService } from './auditLogService.js';
import { RealtimeEvents } from './realtimeService.js';

interface FireInput {
  order_id: number;
  item_ids?: number[] | null;        // partial fire. If omitted + refire=false, fire all pending.
  refire?: boolean;                  // resend tickets + touch KDS updated_at, no status transition.
  void_item_ids?: number[] | null;   // void-after-fire branch.
  print?: boolean;                   // default true
  broadcast_kds?: boolean;           // default true
  language?: string;
  reason?: string | null;            // required when voiding
  admin_user_id?: number | null;
}

interface FireResult {
  mode: 'new' | 'refire' | 'void';
  fired_count: number;
  skipped: Array<{ item_id: number; reason: string }>;
  kds_created: number;
  kds_updated: number;
  tickets: any[];
  customer_receipt?: { printed: boolean; printer_ip: string | null; reason?: string } | null;
  order_type_code?: string | null;
}

async function pickStatusId(conn: PoolConnection, tenantId: number, code: string): Promise<number | null> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT id FROM tenant_order_item_statuses
     WHERE tenant_id = ? AND is_active = 1
     ORDER BY (code = ?) DESC, sort_order ASC, id ASC LIMIT 1`,
    [tenantId, code]
  );
  return rows.length > 0 ? Number(rows[0].id) : null;
}

export class PosFireService {
  static async fire(tenantId: number, input: FireInput): Promise<FireResult> {
    if (!input.order_id) throw { status: 400, message: 'order_id is required' };
    const shouldPrint = input.print !== false;
    const shouldBroadcast = input.broadcast_kds !== false;

    // --- VOID branch ---
    if (Array.isArray(input.void_item_ids) && input.void_item_ids.length > 0) {
      if (!input.reason || !input.reason.trim()) {
        throw { status: 400, code: 'reason_required', message: 'A reason is required when voiding items' };
      }
      return this.fireVoid(tenantId, input.order_id, input.void_item_ids.map(n => Number(n)).filter(Boolean), {
        print: shouldPrint, broadcast_kds: shouldBroadcast, language: input.language,
        reason: input.reason.trim(),
        admin_user_id: input.admin_user_id ?? null,
      });
    }

    // --- NEW / REFIRE branch ---
    const refire = !!input.refire;

    const conn = await pool.getConnection();
    const skipped: Array<{ item_id: number; reason: string }> = [];
    let firedCount = 0;
    let kdsCreated = 0;
    let kdsUpdated = 0;
    let orderTypeCode: string | null = null;
    let storeIdOuter = 0;
    const broadcastPerItem: Array<{ item_id: number; destination_id: number }> = [];

    try {
      await conn.beginTransaction();

      // Verify order belongs to tenant + is open
      const [orderRows] = await conn.query<RowDataPacket[]>(
        `SELECT o.id, o.store_id, o.order_status, ot.code as order_type_code
         FROM orders o
         LEFT JOIN tenant_order_types ot ON ot.id = o.tenant_order_type_id
         WHERE o.id = ? AND o.tenant_id = ?`,
        [input.order_id, tenantId]
      );
      if (orderRows.length === 0) throw { status: 404, message: 'Order not found' };
      if (orderRows[0].order_status !== 'open') throw { status: 400, message: 'Order is not open' };
      const storeId = Number(orderRows[0].store_id);
      storeIdOuter = storeId;
      orderTypeCode = orderRows[0].order_type_code || null;

      // Resolve target status ids
      const pendingId = await pickStatusId(conn, tenantId, 'pending');
      const preparingId = await pickStatusId(conn, tenantId, 'preparing');
      if (!preparingId) throw { status: 400, message: 'No tenant_order_item_statuses row for "preparing"' };

      // Select fireable items
      const baseQuery = `
        SELECT oi.id, oi.tenant_menu_item_id, oi.tenant_order_item_status_id,
               ois.code as status_code,
               mi.tenant_order_destination_id
        FROM order_items oi
        LEFT JOIN tenant_order_item_statuses ois ON ois.id = oi.tenant_order_item_status_id
        LEFT JOIN tenant_menu_items mi ON mi.id = oi.tenant_menu_item_id
        WHERE oi.order_id = ?
      `;
      let rows: RowDataPacket[];
      if (Array.isArray(input.item_ids) && input.item_ids.length > 0) {
        const ids = input.item_ids.map(n => Number(n)).filter(Boolean);
        const placeholders = ids.map(() => '?').join(',');
        const [r] = await conn.query<RowDataPacket[]>(
          `${baseQuery} AND oi.id IN (${placeholders})`,
          [input.order_id, ...ids]
        );
        rows = r;
      } else {
        const [r] = await conn.query<RowDataPacket[]>(`${baseQuery}`, [input.order_id]);
        rows = r;
      }

      const fireable = rows.filter(r => {
        if (!r.tenant_order_destination_id) {
          skipped.push({ item_id: Number(r.id), reason: 'No destination configured on menu item' });
          return false;
        }
        if (refire) {
          if (['served', 'cancelled', 'void'].includes(String(r.status_code))) {
            skipped.push({ item_id: Number(r.id), reason: 'Already served/cancelled — cannot refire' });
            return false;
          }
          return true;
        }
        // Normal fire: only items currently pending
        if (String(r.status_code) !== 'pending') {
          skipped.push({ item_id: Number(r.id), reason: `Already in status "${r.status_code}" — already fired` });
          return false;
        }
        return true;
      });

      // Transition + KDS upsert
      for (const item of fireable) {
        const itemId = Number(item.id);
        const destId = Number(item.tenant_order_destination_id);

        if (!refire) {
          // pending → preparing
          await conn.query(
            'UPDATE order_items SET tenant_order_item_status_id = ? WHERE id = ? AND order_id = ?',
            [preparingId, itemId, input.order_id]
          );
        }

        if (shouldBroadcast) {
          const [existingKds] = await conn.query<RowDataPacket[]>(
            'SELECT id FROM kds_orders WHERE order_item_id = ? LIMIT 1',
            [itemId]
          );
          if (existingKds.length === 0) {
            await conn.query<ResultSetHeader>(
              `INSERT INTO kds_orders
               (tenant_id, store_id, order_id, order_item_id, tenant_order_destination_id,
                status, priority)
               VALUES (?, ?, ?, ?, ?, 'pending', 0)`,
              [tenantId, storeId, input.order_id, itemId, destId]
            );
            kdsCreated += 1;
          } else {
            // Touch updated_at so any polling KDS sees a fresh signal.
            // For refire, re-surface by flipping back to pending if we're re-firing.
            await conn.query(
              `UPDATE kds_orders
               SET status = CASE
                 WHEN status IN ('served', 'cancelled') THEN 'pending'
                 WHEN ? THEN 'pending'
                 ELSE status
               END, updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [refire ? 1 : 0, Number(existingKds[0].id)]
            );
            kdsUpdated += 1;
          }
        }

        firedCount += 1;
        broadcastPerItem.push({ item_id: itemId, destination_id: destId });
      }

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }

    // --- Dispatch tickets (outside the transaction so slow printers don't lock rows) ---
    let tickets: any[] = [];
    if (shouldPrint && firedCount > 0) {
      try {
        const itemIdsToPrint = input.item_ids && input.item_ids.length > 0
          ? input.item_ids.map(n => Number(n)).filter(Boolean)
          : undefined;
        const result = await PosKitchenTicketService.printTickets(tenantId, input.order_id, {
          language: input.language,
          refire,
          item_ids: itemIdsToPrint || null,
        });
        tickets = result.tickets;
      } catch (err: any) {
        console.error('[PosFireService] ticket print failed:', err);
        tickets = [];
      }
    }

    // Audit refire (reprint of kitchen ticket)
    if (refire && firedCount > 0) {
      AuditLogService.log({
        tenant_id: tenantId,
        admin_user_id: input.admin_user_id ?? null,
        action: 'reprint_kitchen_ticket',
        target_type: 'order',
        target_id: input.order_id,
        after: { fired_count: firedCount, tickets: tickets.length },
      });
    }

    // Non-dine-in orders: also print a customer copy at fire time so takeaway/delivery
    // customers get their receipt without waiting for payment.
    let customer_receipt: { printed: boolean; printer_ip: string | null; reason?: string } | null = null;
    if (shouldPrint && firedCount > 0 && !refire && orderTypeCode && orderTypeCode !== 'dine_in') {
      try {
        const { PosReceiptService } = await import('./posReceiptService.js');
        customer_receipt = await PosReceiptService.printToThermal(tenantId, input.order_id, {
          language: input.language,
        });
      } catch (err: any) {
        console.error('[PosFireService] customer receipt print failed:', err);
        customer_receipt = { printed: false, printer_ip: null, reason: err?.message || 'print failed' };
      }
    }

    // Realtime broadcast (after commit) — one per item so only the relevant KDS
    // destination + the order's listeners react. Also a per-order summary.
    if (firedCount > 0) {
      for (const b of broadcastPerItem) {
        RealtimeEvents.kdsUpserted(tenantId, storeIdOuter, b.destination_id, {
          order_id: input.order_id,
          order_item_id: b.item_id,
          mode: refire ? 'refire' : 'new',
        });
        if (!refire) {
          RealtimeEvents.itemStatus(tenantId, input.order_id, storeIdOuter, b.item_id, 'pending', 'preparing', b.destination_id);
        }
      }
      RealtimeEvents.itemsFired(tenantId, input.order_id, storeIdOuter, {
        mode: refire ? 'refire' : 'new',
        fired_count: firedCount,
        item_ids: broadcastPerItem.map(b => b.item_id),
      });
    }

    return {
      mode: refire ? 'refire' : 'new',
      fired_count: firedCount,
      skipped,
      kds_created: kdsCreated,
      kds_updated: kdsUpdated,
      tickets,
      customer_receipt,
      order_type_code: orderTypeCode,
    };
  }

  private static async fireVoid(
    tenantId: number,
    orderId: number,
    voidItemIds: number[],
    opts: { print: boolean; broadcast_kds: boolean; language?: string; reason?: string | null; admin_user_id?: number | null }
  ): Promise<FireResult> {
    if (voidItemIds.length === 0) {
      return { mode: 'void', fired_count: 0, skipped: [], kds_created: 0, kds_updated: 0, tickets: [] };
    }

    const conn = await pool.getConnection();
    const skipped: Array<{ item_id: number; reason: string }> = [];
    let firedCount = 0;
    let kdsUpdated = 0;
    let storeId: number | null = null;
    const voidedBroadcast: Array<{ item_id: number; destination_id: number | null; from: string }> = [];

    try {
      await conn.beginTransaction();

      const [orderRows] = await conn.query<RowDataPacket[]>(
        'SELECT id, store_id FROM orders WHERE id = ? AND tenant_id = ?',
        [orderId, tenantId]
      );
      if (orderRows.length === 0) throw { status: 404, message: 'Order not found' };
      storeId = Number(orderRows[0].store_id);

      const cancelledId = await pickStatusId(conn, tenantId, 'cancelled');
      if (!cancelledId) throw { status: 400, message: 'No tenant_order_item_statuses row for "cancelled"' };

      const placeholders = voidItemIds.map(() => '?').join(',');
      const [itemRows] = await conn.query<RowDataPacket[]>(
        `SELECT oi.id, ois.code as status_code, mi.tenant_order_destination_id
         FROM order_items oi
         LEFT JOIN tenant_order_item_statuses ois ON ois.id = oi.tenant_order_item_status_id
         LEFT JOIN tenant_menu_items mi ON mi.id = oi.tenant_menu_item_id
         WHERE oi.id IN (${placeholders}) AND oi.order_id = ?`,
        [...voidItemIds, orderId]
      );

      for (const r of itemRows) {
        const id = Number(r.id);
        const fromStatus = String(r.status_code || 'pending');
        if (fromStatus === 'served') {
          skipped.push({ item_id: id, reason: 'Already served — cannot void' });
          continue;
        }
        await conn.query(
          'UPDATE order_items SET tenant_order_item_status_id = ? WHERE id = ?',
          [cancelledId, id]
        );
        if (opts.broadcast_kds) {
          const [existingKds] = await conn.query<RowDataPacket[]>(
            'SELECT id FROM kds_orders WHERE order_item_id = ? LIMIT 1',
            [id]
          );
          if (existingKds.length > 0) {
            await conn.query(
              `UPDATE kds_orders
               SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [Number(existingKds[0].id)]
            );
            kdsUpdated += 1;
          }
        }
        firedCount += 1;
        voidedBroadcast.push({
          item_id: id,
          destination_id: r.tenant_order_destination_id ? Number(r.tenant_order_destination_id) : null,
          from: fromStatus,
        });
      }

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }

    let tickets: any[] = [];
    if (opts.print && firedCount > 0) {
      try {
        const result = await PosKitchenTicketService.printTickets(tenantId, orderId, {
          language: opts.language,
          void_item_ids: voidItemIds,
        });
        tickets = result.tickets;
      } catch (err: any) {
        console.error('[PosFireService] void ticket print failed:', err);
      }
    }

    // Audit each voided item
    if (firedCount > 0) {
      const voidedIds = voidItemIds.filter(id => !skipped.some(s => s.item_id === id));
      for (const itemId of voidedIds) {
        AuditLogService.log({
          tenant_id: tenantId,
          store_id: storeId,
          admin_user_id: opts.admin_user_id ?? null,
          action: 'void_item',
          target_type: 'order_item',
          target_id: itemId,
          reason: opts.reason ?? null,
          after: { order_id: orderId, kds_cancelled: opts.broadcast_kds },
        });
      }
    }

    // Realtime broadcast (after commit)
    if (firedCount > 0 && storeId) {
      for (const v of voidedBroadcast) {
        RealtimeEvents.itemStatus(tenantId, orderId, storeId, v.item_id, v.from, 'cancelled', v.destination_id);
        if (v.destination_id) {
          RealtimeEvents.kdsUpserted(tenantId, storeId, v.destination_id, {
            order_id: orderId,
            order_item_id: v.item_id,
            status: 'cancelled',
          });
        }
      }
      RealtimeEvents.itemsVoided(tenantId, orderId, storeId, {
        voided_count: firedCount,
        item_ids: voidedBroadcast.map(v => v.item_id),
      });
    }

    return { mode: 'void', fired_count: firedCount, skipped, kds_created: 0, kds_updated: kdsUpdated, tickets };
  }
}
