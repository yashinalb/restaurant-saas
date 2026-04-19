import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { PosShiftService } from './posShiftService.js';
import { AuditLogService } from './auditLogService.js';

type PaymentMode = 'full' | 'partial' | 'per_item' | 'mixed';
const VALID_MODES: PaymentMode[] = ['full', 'partial', 'per_item', 'mixed'];

interface SplitInput {
  tenant_payment_type_id: number;
  currency_id: number;
  amount: number;
  payment_mode?: PaymentMode;
  exchange_rate?: number | null;
  reference_number?: string | null;
  notes?: string | null;
}

interface PayInput {
  order_id: number;
  payments: SplitInput[];
  tip_amount?: number;         // optional tip added on top of order total
  item_ids?: number[];         // per-item mode: mark these order_items paid
  session_id?: number | null;  // optional POS session context
  admin_user_id?: number | null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function resolvePaymentStatusId(conn: any, tenantId: number, code: 'paid' | 'partially_paid' | 'unpaid'): Promise<number | null> {
  const [rows] = await conn.query(
    `SELECT id FROM tenant_payment_statuses
     WHERE tenant_id = ? AND is_active = 1
     ORDER BY (code = ?) DESC, sort_order ASC, id ASC LIMIT 1`,
    [tenantId, code]
  );
  return rows.length > 0 ? Number(rows[0].id) : null;
}

export class PosPaymentService {
  static async pay(tenantId: number, data: PayInput): Promise<{
    transaction_id: number;
    order_status: string;
    total_paid: number;
    change: number;
    store_id: number;
    has_cash_payment: boolean;
    drawer: { pulsed: boolean; printer_ip: string | null; reason?: string } | null;
  }> {
    if (!data.order_id) throw { status: 400, message: 'order_id is required' };
    if (!Array.isArray(data.payments) || data.payments.length === 0) {
      throw { status: 400, message: 'At least one payment split is required' };
    }

    const conn = await pool.getConnection();
    let releasedConn = false;
    try {
      await conn.beginTransaction();

      // Verify order + must be open
      const [orderRows] = await conn.query<RowDataPacket[]>(
        `SELECT id, store_id, currency_id, subtotal, tax_amount, service_charge, discount_amount, total, order_status
         FROM orders WHERE id = ? AND tenant_id = ?`,
        [data.order_id, tenantId]
      );
      if (orderRows.length === 0) throw { status: 404, message: 'Order not found' };
      const order = orderRows[0];
      if (order.order_status !== 'open') {
        throw { status: 400, message: 'Order is not open' };
      }

      // Require an open cash register session (shift) for this store + currency.
      await PosShiftService.requireActive(conn, tenantId, {
        store_id: Number(order.store_id),
        currency_id: Number(order.currency_id),
      });

      const tipAmount = data.tip_amount != null ? round2(Number(data.tip_amount)) : 0;
      if (tipAmount < 0) throw { status: 400, message: 'tip_amount cannot be negative' };

      const orderTotal = round2(Number(order.total) + tipAmount);

      // Validate payment splits; convert to order currency for totalling
      let totalPaidInOrderCurrency = 0;
      let hasCashPayment = false;
      for (const p of data.payments) {
        if (!p.tenant_payment_type_id || !p.currency_id || p.amount == null) {
          throw { status: 400, message: 'Each payment requires tenant_payment_type_id, currency_id, amount' };
        }
        if (p.amount < 0) throw { status: 400, message: 'Payment amount cannot be negative' };
        const mode = p.payment_mode ?? 'full';
        if (!VALID_MODES.includes(mode)) throw { status: 400, message: `Invalid payment_mode: ${mode}` };

        // Verify payment type belongs to tenant and detect cash
        const [ptCheck] = await conn.query<RowDataPacket[]>(
          'SELECT id, code FROM tenant_payment_types WHERE id = ? AND tenant_id = ?',
          [p.tenant_payment_type_id, tenantId]
        );
        if (ptCheck.length === 0) throw { status: 400, message: `Invalid payment type: ${p.tenant_payment_type_id}` };
        if (String(ptCheck[0].code) === 'cash' && Number(p.amount) > 0) hasCashPayment = true;

        const rate = p.currency_id === Number(order.currency_id) ? 1 : (Number(p.exchange_rate) || 1);
        totalPaidInOrderCurrency += Number(p.amount) * rate;
      }
      totalPaidInOrderCurrency = round2(totalPaidInOrderCurrency);

      // Determine order payment status
      const fullyPaid = totalPaidInOrderCurrency >= orderTotal - 0.005; // small rounding tolerance
      const partiallyPaid = !fullyPaid && totalPaidInOrderCurrency > 0;

      // Change: only applicable when fully paid with overpayment
      const change = fullyPaid ? round2(totalPaidInOrderCurrency - orderTotal) : 0;
      // Amount the transaction captures toward the bill (never overcounts the bill)
      const capturedTowardBill = Math.min(totalPaidInOrderCurrency, orderTotal);

      // Resolve order payment status id
      const targetCode: 'paid' | 'partially_paid' | 'unpaid' = fullyPaid ? 'paid' : (partiallyPaid ? 'partially_paid' : 'unpaid');
      const paymentStatusId = await resolvePaymentStatusId(conn, tenantId, targetCode);
      if (!paymentStatusId) throw { status: 400, message: `No active tenant_payment_status for code "${targetCode}"` };

      const serviceCharge = round2(Number(order.service_charge) + tipAmount);

      // Create transaction
      const [txnResult] = await conn.query<ResultSetHeader>(
        `INSERT INTO transactions
         (tenant_id, store_id, order_id, tenant_payment_status_id, currency_id,
          amount_before_vat, vat_amount, service_charge, total_amount,
          total_paid, amount_remaining, is_joined, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)`,
        [
          tenantId,
          order.store_id,
          data.order_id,
          paymentStatusId,
          order.currency_id,
          Number(order.subtotal),
          Number(order.tax_amount),
          serviceCharge,
          orderTotal,
          capturedTowardBill,
          round2(orderTotal - capturedTowardBill),
        ]
      );
      const transactionId = txnResult.insertId;

      // Insert each payment split
      for (const p of data.payments) {
        const mode = p.payment_mode ?? 'full';
        await conn.query(
          `INSERT INTO transaction_payments
           (transaction_id, tenant_payment_type_id, currency_id, amount, amount_due, payment_mode,
            paid_items, exchange_rate, reference_number, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            transactionId,
            p.tenant_payment_type_id,
            p.currency_id,
            Number(p.amount),
            null,
            mode,
            null,
            p.exchange_rate ?? null,
            p.reference_number ?? null,
            p.notes ?? null,
          ]
        );
      }

      // Update order: payment status + service charge (tip) + maybe close
      const nextOrderStatus = fullyPaid ? 'closed' : 'open';
      await conn.query(
        `UPDATE orders SET tenant_payment_status_id = ?, service_charge = ?, total = ?, order_status = ? WHERE id = ?`,
        [paymentStatusId, serviceCharge, orderTotal, nextOrderStatus, data.order_id]
      );

      // Per-item mode: mark specified order_items as paid
      if (Array.isArray(data.item_ids) && data.item_ids.length > 0) {
        const ids = data.item_ids.map(n => Number(n)).filter(Boolean);
        if (ids.length > 0) {
          const placeholders = ids.map(() => '?').join(',');
          await conn.query(
            `UPDATE order_items
             SET is_paid = 1, amount_paid = total_price
             WHERE id IN (${placeholders}) AND order_id = ?`,
            [...ids, data.order_id]
          );
        }
      } else if (fullyPaid) {
        // Full-payment convenience: mark every line paid
        await conn.query(
          `UPDATE order_items
           SET is_paid = 1, amount_paid = total_price
           WHERE order_id = ?`,
          [data.order_id]
        );
      }

      await conn.commit();

      // Build the result shape and release the connection before the drawer pulse
      // so a slow/unreachable printer doesn't tie up a DB connection.
      const base = {
        transaction_id: transactionId,
        order_status: nextOrderStatus,
        total_paid: capturedTowardBill,
        change,
        store_id: Number(order.store_id),
        has_cash_payment: hasCashPayment,
      };
      conn.release();
      releasedConn = true;

      let drawer: { pulsed: boolean; printer_ip: string | null; reason?: string } | null = null;
      if (hasCashPayment) {
        try {
          drawer = await PosShiftService.pulseDrawer(tenantId, Number(order.store_id));
        } catch (err: any) {
          drawer = { pulsed: false, printer_ip: null, reason: err?.message || 'pulse failed' };
        }
        AuditLogService.log({
          tenant_id: tenantId,
          store_id: Number(order.store_id),
          admin_user_id: data.admin_user_id ?? null,
          action: 'drawer_open',
          target_type: 'transaction',
          target_id: transactionId,
          after: drawer,
        });
      }

      // Audit: payment
      AuditLogService.log({
        tenant_id: tenantId,
        store_id: Number(order.store_id),
        admin_user_id: data.admin_user_id ?? null,
        action: 'payment',
        target_type: 'order',
        target_id: data.order_id,
        after: {
          transaction_id: transactionId,
          total_paid: capturedTowardBill,
          change,
          has_cash_payment: hasCashPayment,
          payment_count: data.payments.length,
        },
      });

      return { ...base, drawer };
    } catch (error) {
      try { await conn.rollback(); } catch { /* noop */ }
      throw error;
    } finally {
      if (!releasedConn) conn.release();
    }
  }
}
