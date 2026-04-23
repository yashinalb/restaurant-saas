import pool from '../config/database.js';
import { RowDataPacket } from 'mysql2/promise';
import { PosOrderService } from './posOrderService.js';

/**
 * POS Reservations Quick View (44.17).
 *
 * - Today's reservations for the store → drives the drawer on the floor/tables page.
 * - Check-in: flips `confirmed` → `checked_in` AND opens a new order on the primary
 *   table with the reservation's customer pre-filled, in one transaction-ish flow.
 */
export class PosReservationService {
  static async todayForStore(tenantId: number, storeId: number): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT r.id, r.status, r.guest_count, r.reserved_at, r.duration_minutes,
              r.primary_table_id, r.tenant_customer_id,
              r.customer_name, r.customer_phone, r.customer_email, r.notes, r.source,
              t.name as primary_table_name,
              c.name as customer_name_ref, c.phone as customer_phone_ref, c.email as customer_email_ref
       FROM reservations r
       LEFT JOIN tenant_table_structures t ON t.id = r.primary_table_id
       LEFT JOIN tenant_customers c ON c.id = r.tenant_customer_id
       WHERE r.tenant_id = ? AND r.store_id = ?
         AND DATE(r.reserved_at) = CURRENT_DATE()
         AND r.status IN ('pending','confirmed','checked_in')
       ORDER BY r.reserved_at ASC`,
      [tenantId, storeId]
    );
    return rows;
  }

  static async checkIn(
    tenantId: number,
    reservationId: number,
    opts: { session_id: number }
  ): Promise<{ reservation_id: number; order_id: number; status: string }> {
    if (!opts.session_id) throw { status: 400, message: 'session_id is required' };

    const conn = await pool.getConnection();
    let primaryTableId: number;
    let customerId: number | null;
    let storeIdOfReservation: number;

    try {
      await conn.beginTransaction();

      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT id, status, store_id, primary_table_id, tenant_customer_id
         FROM reservations WHERE id = ? AND tenant_id = ? FOR UPDATE`,
        [reservationId, tenantId]
      );
      if (rows.length === 0) throw { status: 404, message: 'Reservation not found' };
      const r = rows[0];
      if (r.status === 'cancelled' || r.status === 'no_show' || r.status === 'completed') {
        throw { status: 400, message: `Cannot check in a reservation with status "${r.status}"` };
      }
      if (r.status !== 'confirmed' && r.status !== 'checked_in' && r.status !== 'pending') {
        throw { status: 400, message: `Invalid reservation status "${r.status}"` };
      }

      primaryTableId = Number(r.primary_table_id);
      customerId = r.tenant_customer_id ? Number(r.tenant_customer_id) : null;
      storeIdOfReservation = Number(r.store_id);

      if (r.status !== 'checked_in') {
        await conn.query(
          `UPDATE reservations SET status = 'checked_in' WHERE id = ?`,
          [reservationId]
        );
      }

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }

    // Verify session belongs to same store as reservation to avoid cross-store leakage.
    const [sessionRows] = await pool.query<RowDataPacket[]>(
      `SELECT s.store_id
       FROM tenant_waiter_sessions s
       JOIN tenant_waiters w ON w.id = s.tenant_waiter_id
       WHERE s.id = ? AND w.tenant_id = ? AND s.logged_out_at IS NULL`,
      [opts.session_id, tenantId]
    );
    if (sessionRows.length === 0) throw { status: 401, message: 'Active POS session not found' };
    if (Number(sessionRows[0].store_id) !== storeIdOfReservation) {
      throw { status: 400, message: 'POS session store does not match reservation store' };
    }

    const orderId = await PosOrderService.start(tenantId, {
      session_id: opts.session_id,
      table_id: primaryTableId,
      order_type_code: 'dine_in',
      tenant_customer_id: customerId,
    });

    return { reservation_id: reservationId, order_id: orderId, status: 'checked_in' };
  }
}
