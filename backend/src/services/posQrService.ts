import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import crypto from 'crypto';

interface GenerateInput {
  ttl_minutes?: number;         // default 15
  base_url?: string | null;
}

interface GenerateResult {
  token: string;
  expires_at: string;
  url: string;
  table_id: number | null;
  was_refreshed: boolean;
}

export class PosQrService {
  /**
   * Generate or refresh a short-lived, active QR invoice token for an order.
   * Returns the scannable URL.
   */
  static async generateForOrder(
    tenantId: number,
    orderId: number,
    opts: GenerateInput = {}
  ): Promise<GenerateResult> {
    const [orderRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, table_id, order_status FROM orders WHERE id = ? AND tenant_id = ?',
      [orderId, tenantId]
    );
    if (orderRows.length === 0) throw { status: 404, message: 'Order not found' };
    const order = orderRows[0];
    const tableId = order.table_id != null ? Number(order.table_id) : null;
    if (!tableId) throw { status: 400, message: 'Order has no table_id; QR tokens require a table link' };

    const ttl = Math.max(1, Math.min(Number(opts.ttl_minutes) || 15, 24 * 60));
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + ttl);
    const expiresSql = expires.toISOString().slice(0, 19).replace('T', ' ');

    // Reuse an existing active, unexpired token if present — extend its expiry.
    const [existing] = await pool.query<RowDataPacket[]>(
      `SELECT id, token FROM qr_invoice_tokens
       WHERE tenant_id = ? AND order_id = ? AND status = 'active' AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [tenantId, orderId]
    );

    let token: string;
    let wasRefreshed: boolean;
    if (existing.length > 0) {
      token = String(existing[0].token);
      await pool.query(
        `UPDATE qr_invoice_tokens SET expires_at = ? WHERE id = ?`,
        [expiresSql, Number(existing[0].id)]
      );
      wasRefreshed = true;
    } else {
      token = crypto.randomUUID();
      await pool.query<ResultSetHeader>(
        `INSERT INTO qr_invoice_tokens (tenant_id, order_id, table_id, token, status, expires_at)
         VALUES (?, ?, ?, ?, 'active', ?)`,
        [tenantId, orderId, tableId, token, expiresSql]
      );
      wasRefreshed = false;
    }

    const base = (opts.base_url || '').replace(/\/$/, '');
    const url = base ? `${base}/invoice?token=${token}` : `/invoice?token=${token}`;

    return {
      token,
      expires_at: expires.toISOString(),
      url,
      table_id: tableId,
      was_refreshed: wasRefreshed,
    };
  }

  /**
   * Public, token-based lookup of an invoice. No auth — the token *is* the auth.
   * Side-effects: stamps `last_accessed_at`, marks token `expired` if past TTL.
   * Returns a sanitized payload — no admin ids, no printer IPs, no internal notes.
   */
  static async getInvoiceByToken(token: string): Promise<any> {
    if (!token) throw { status: 400, message: 'token is required' };

    const [tokenRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, tenant_id, order_id, table_id, status, expires_at
       FROM qr_invoice_tokens WHERE token = ? LIMIT 1`,
      [token]
    );
    if (tokenRows.length === 0) throw { status: 404, message: 'Invalid token' };
    const row = tokenRows[0];

    // Mark expired if past TTL
    if (row.status === 'active' && new Date(row.expires_at) < new Date()) {
      await pool.query(
        `UPDATE qr_invoice_tokens SET status = 'expired' WHERE id = ?`,
        [Number(row.id)]
      );
      throw { status: 410, message: 'Token expired', code: 'expired' };
    }
    if (row.status === 'expired') throw { status: 410, message: 'Token expired', code: 'expired' };
    if (row.status === 'used') throw { status: 410, message: 'Token already used', code: 'used' };

    const tenantId = Number(row.tenant_id);
    const orderId = Number(row.order_id);

    // Stamp last access
    await pool.query(
      `UPDATE qr_invoice_tokens SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [Number(row.id)]
    );

    // Fetch minimal order + tenant + store context. Uses the same data paths as
    // PosReceiptService but avoids exposing admin-only fields.
    const [orderRows] = await pool.query<RowDataPacket[]>(
      `SELECT o.id, o.order_number, o.subtotal, o.tax_amount, o.service_charge,
              o.discount_amount, o.total, o.created_at,
              t.name as tenant_name,
              s.name as store_name, s.address as store_address, s.city as store_city,
              s.postal_code as store_postal_code, s.phone as store_phone,
              tbl.name as table_name,
              c.code as currency_code, c.symbol as currency_symbol,
              ps.code as payment_status_code
       FROM orders o
       LEFT JOIN tenants t ON t.id = o.tenant_id
       LEFT JOIN stores s ON s.id = o.store_id
       LEFT JOIN tenant_table_structures tbl ON tbl.id = o.table_id
       LEFT JOIN currencies c ON c.id = o.currency_id
       LEFT JOIN tenant_payment_statuses ps ON ps.id = o.tenant_payment_status_id
       WHERE o.id = ? AND o.tenant_id = ?`,
      [orderId, tenantId]
    );
    if (orderRows.length === 0) throw { status: 404, message: 'Order not found' };
    const order = orderRows[0];

    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT oi.id, oi.quantity, oi.unit_price, oi.total_price, oi.is_paid, oi.selected_addons,
              (SELECT t.name FROM tenant_menu_item_translations t
                 JOIN languages l ON l.id = t.language_id
                 WHERE t.tenant_menu_item_id = oi.tenant_menu_item_id
                 ORDER BY (l.code = 'en') DESC, l.sort_order ASC LIMIT 1) as name
       FROM order_items oi
       WHERE oi.order_id = ?
       ORDER BY oi.id ASC`,
      [orderId]
    );

    // Payment summary (amount paid vs total)
    const [sumRows] = await pool.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(tp.amount), 0) as paid
       FROM transactions t
       JOIN transaction_payments tp ON tp.transaction_id = t.id
       WHERE t.tenant_id = ? AND t.order_id = ?`,
      [tenantId, orderId]
    );
    const paid = Number(sumRows[0]?.paid) || 0;
    const total = Number(order.total) || 0;
    const balance = Math.round((total - paid) * 100) / 100;

    return {
      store: {
        tenant_name: order.tenant_name,
        name: order.store_name,
        address: order.store_address,
        city: order.store_city,
        postal_code: order.store_postal_code,
        phone: order.store_phone,
      },
      order: {
        order_number: order.order_number,
        table_name: order.table_name,
        created_at: order.created_at,
        currency: { code: order.currency_code, symbol: order.currency_symbol },
      },
      items: (items as any[]).map(it => ({
        name: it.name || `Item`,
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0,
        total_price: Number(it.total_price) || 0,
        is_paid: !!it.is_paid,
        addons: Array.isArray(it.selected_addons)
          ? (it.selected_addons as any[]).map(a => ({ name: a?.name || a?.code || '', qty: a?.quantity || 1 }))
          : [],
      })),
      totals: {
        subtotal: Number(order.subtotal) || 0,
        tax_amount: Number(order.tax_amount) || 0,
        service_charge: Number(order.service_charge) || 0,
        discount_amount: Number(order.discount_amount) || 0,
        total,
        paid,
        balance,
      },
      payment_status_code: order.payment_status_code,
      token: { expires_at: row.expires_at },
    };
  }
}
