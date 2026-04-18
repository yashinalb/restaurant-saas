import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { randomUUID } from 'crypto';

interface ReceiptOptions {
  language?: string; // ISO code, e.g. 'en', 'tr'
  base_url?: string | null; // used to build QR links, e.g. 'https://app.example.com'
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function pickTranslated(
  rows: any[],
  languageCode?: string
): Promise<string | null> {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  if (languageCode) {
    const lang = rows.find(r => r.language_code === languageCode);
    if (lang?.name) return lang.name;
  }
  const en = rows.find(r => r.language_code === 'en');
  return en?.name || rows[0]?.name || null;
}

/**
 * Compose ESC/POS command bytes for a minimal receipt layout.
 * Designed for 80mm thermal (42 chars/line), paper cut at the end.
 */
function toEscPos(lines: string[], totalWidth = 42): string {
  const ESC = '\x1B';
  const GS = '\x1D';
  const INIT = `${ESC}@`;
  const ALIGN_C = `${ESC}a1`;
  const ALIGN_L = `${ESC}a0`;
  const BOLD_ON = `${ESC}E1`;
  const BOLD_OFF = `${ESC}E0`;
  const CUT = `${GS}V\x00`;

  // Very simple formatting: markers inside the line drive styles.
  // [[C]] center, [[L]] left, [[B]] bold on/off toggle.
  let out = INIT + ALIGN_L;
  let bold = false;
  for (const raw of lines) {
    let line = raw;
    if (line.startsWith('[[C]]')) { out += ALIGN_C; line = line.slice(5); }
    else if (line.startsWith('[[L]]')) { out += ALIGN_L; line = line.slice(5); }
    if (line.startsWith('[[B]]')) { bold = !bold; out += bold ? BOLD_ON : BOLD_OFF; line = line.slice(5); }
    out += line + '\n';
    out += ALIGN_L;
    if (bold) { out += BOLD_OFF; bold = false; }
  }
  out += '\n\n\n' + CUT;
  return out;
}

function pad(left: string, right: string, width = 42): string {
  const spaces = Math.max(1, width - left.length - right.length);
  return left + ' '.repeat(spaces) + right;
}

export class PosReceiptService {
  /**
   * Ensure an `active` QR invoice token exists for this order; returns the token.
   */
  private static async ensureQrToken(tenantId: number, orderId: number, tableId: number | null): Promise<string | null> {
    if (!tableId) return null;
    const [existing] = await pool.query<RowDataPacket[]>(
      `SELECT token FROM qr_invoice_tokens
       WHERE tenant_id = ? AND order_id = ? AND status = 'active'
         AND expires_at > NOW() LIMIT 1`,
      [tenantId, orderId]
    );
    if (existing.length > 0) return String(existing[0].token);

    const token = randomUUID();
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);
    await pool.query<ResultSetHeader>(
      `INSERT INTO qr_invoice_tokens (tenant_id, order_id, table_id, token, status, expires_at)
       VALUES (?, ?, ?, ?, 'active', ?)`,
      [tenantId, orderId, tableId, token, expires.toISOString().slice(0, 19).replace('T', ' ')]
    );
    return token;
  }

  /**
   * Assemble the structured receipt payload for an order.
   */
  static async getReceipt(tenantId: number, orderId: number, opts: ReceiptOptions = {}): Promise<any> {
    const languageCode = opts.language || 'en';

    const [orderRows] = await pool.query<RowDataPacket[]>(
      `SELECT o.*,
        t.name as tenant_name,
        s.name as store_name, s.address as store_address, s.city as store_city,
        s.postal_code as store_postal_code, s.country_code as store_country_code,
        s.phone as store_phone, s.email as store_email,
        s.receipt_printer_ip as receipt_printer_ip,
        tbl.name as table_name,
        w.name as waiter_name,
        c.code as currency_code, c.symbol as currency_symbol,
        ps.code as payment_status_code
      FROM orders o
      LEFT JOIN tenants t ON t.id = o.tenant_id
      LEFT JOIN stores s ON s.id = o.store_id
      LEFT JOIN tenant_table_structures tbl ON tbl.id = o.table_id
      LEFT JOIN tenant_waiters w ON w.id = o.tenant_waiter_id
      LEFT JOIN currencies c ON c.id = o.currency_id
      LEFT JOIN tenant_payment_statuses ps ON ps.id = o.tenant_payment_status_id
      WHERE o.id = ? AND o.tenant_id = ?`,
      [orderId, tenantId]
    );
    if (orderRows.length === 0) throw { status: 404, message: 'Order not found' };
    const order = orderRows[0];

    // Items with best-effort translated name and their VAT rate (item → category → NULL)
    const [itemRows] = await pool.query<RowDataPacket[]>(
      `SELECT oi.id, oi.tenant_menu_item_id, oi.quantity, oi.unit_price, oi.total_price,
         oi.weighted_portion, oi.selected_addons, oi.selected_ingredients, oi.notes, oi.is_paid,
         (SELECT t.name FROM tenant_menu_item_translations t
            JOIN languages l ON l.id = t.language_id
            WHERE t.tenant_menu_item_id = oi.tenant_menu_item_id
            ORDER BY (l.code = ?) DESC, (l.code = 'en') DESC, l.sort_order ASC LIMIT 1) as menu_item_name,
         COALESCE(mi.vat_rate, cat.vat_rate, 0) as effective_vat_rate
       FROM order_items oi
       LEFT JOIN tenant_menu_items mi ON mi.id = oi.tenant_menu_item_id
       LEFT JOIN tenant_menu_categories cat ON cat.id = mi.tenant_menu_category_id
       WHERE oi.order_id = ?
       ORDER BY oi.id ASC`,
      [languageCode, orderId]
    );

    // VAT breakdown grouped by rate
    const vatBuckets: Record<string, { rate: number; subtotal: number; vat: number }> = {};
    for (const it of itemRows) {
      const rate = Number(it.effective_vat_rate) || 0;
      const key = rate.toFixed(2);
      if (!vatBuckets[key]) vatBuckets[key] = { rate, subtotal: 0, vat: 0 };
      const lineTotal = Number(it.total_price) || 0;
      vatBuckets[key].subtotal = round2(vatBuckets[key].subtotal + lineTotal);
      vatBuckets[key].vat = round2(vatBuckets[key].vat + (lineTotal * rate) / 100);
    }
    const vat_breakdown = Object.values(vatBuckets).sort((a, b) => a.rate - b.rate);

    // Transactions + payments (supports re-print after payment, blank before)
    const [txnRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, total_amount, total_paid, amount_remaining, service_charge, created_at
       FROM transactions WHERE tenant_id = ? AND order_id = ?
       ORDER BY id DESC`,
      [tenantId, orderId]
    );
    const txnIds = txnRows.map(r => Number(r.id));
    let payments: any[] = [];
    if (txnIds.length > 0) {
      const placeholders = txnIds.map(() => '?').join(',');
      const [payRows] = await pool.query<RowDataPacket[]>(
        `SELECT tp.amount, tp.currency_id, tp.exchange_rate, tp.reference_number, tp.payment_mode,
          pt.code as payment_type_code,
          c.code as currency_code, c.symbol as currency_symbol
         FROM transaction_payments tp
         LEFT JOIN tenant_payment_types pt ON pt.id = tp.tenant_payment_type_id
         LEFT JOIN currencies c ON c.id = tp.currency_id
         WHERE tp.transaction_id IN (${placeholders})
         ORDER BY tp.id ASC`,
        txnIds
      );
      payments = payRows;
    }

    // Tip approximation: service_charge on order includes any tip added during payment.
    // We don't store tip separately, but the receipt surfaces service_charge as-is.
    const subtotal = round2(Number(order.subtotal) || 0);
    const discount = round2(Number(order.discount_amount) || 0);
    const serviceCharge = round2(Number(order.service_charge) || 0);
    const tax = round2(Number(order.tax_amount) || 0);
    const total = round2(Number(order.total) || 0);

    // Ikram lines: items with unit_price = 0 (compd)
    const ikram_lines = itemRows.filter(i => Number(i.unit_price) === 0).length;

    // QR token for the invoice link
    const qrToken = await this.ensureQrToken(tenantId, orderId, order.table_id != null ? Number(order.table_id) : null);
    const qrBase = (opts.base_url || '').replace(/\/$/, '');
    const qrLink = qrToken && qrBase ? `${qrBase}/invoice?token=${qrToken}` : (qrToken ? `/invoice?token=${qrToken}` : null);

    const receipt = {
      tenant: { name: order.tenant_name },
      store: {
        name: order.store_name,
        address: order.store_address,
        city: order.store_city,
        postal_code: order.store_postal_code,
        country_code: order.store_country_code,
        phone: order.store_phone,
        email: order.store_email,
        receipt_printer_ip: order.receipt_printer_ip,
      },
      order: {
        id: Number(order.id),
        order_number: order.order_number,
        order_status: order.order_status,
        created_at: order.created_at,
        table_name: order.table_name,
        waiter_name: order.waiter_name,
        guest_name: order.guest_name,
        notes: order.notes,
        currency: {
          code: order.currency_code,
          symbol: order.currency_symbol,
        },
      },
      items: itemRows.map((it: any) => ({
        id: Number(it.id),
        name: it.menu_item_name || `Item #${it.tenant_menu_item_id}`,
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0,
        total_price: Number(it.total_price) || 0,
        weighted_portion: it.weighted_portion != null ? Number(it.weighted_portion) : null,
        is_comp: Number(it.unit_price) === 0,
        notes: it.notes || null,
        selected_addons: it.selected_addons || null,
        selected_ingredients: it.selected_ingredients || null,
        vat_rate: Number(it.effective_vat_rate) || 0,
        is_paid: !!it.is_paid,
      })),
      totals: {
        subtotal,
        discount_amount: discount,
        service_charge: serviceCharge,
        tax_amount: tax,
        total,
        ikram_lines,
      },
      vat_breakdown,
      payments,
      payment_status_code: order.payment_status_code,
      qr: qrLink ? { token: qrToken, url: qrLink } : null,
    };

    const escLines = this.buildEscPosLines(receipt, languageCode);
    const esc_pos = toEscPos(escLines);

    return { receipt, esc_pos };
  }

  /**
   * Build the thermal-printer text lines for a receipt payload.
   */
  private static buildEscPosLines(r: any, _languageCode: string): string[] {
    const sym = r.order.currency.symbol || r.order.currency.code || '';
    const money = (n: number) => `${sym}${n.toFixed(2)}`;
    const lines: string[] = [];

    lines.push('[[C]][[B]]' + (r.store.name || r.tenant.name || '').toUpperCase() + '[[B]]');
    if (r.store.address) lines.push('[[C]]' + r.store.address);
    const loc = [r.store.postal_code, r.store.city].filter(Boolean).join(' ');
    if (loc) lines.push('[[C]]' + loc);
    if (r.store.phone) lines.push('[[C]]' + r.store.phone);
    lines.push('[[L]]' + '-'.repeat(42));

    lines.push(pad(`#${r.order.order_number}`, new Date(r.order.created_at).toLocaleString()));
    if (r.order.table_name) lines.push(`Table: ${r.order.table_name}`);
    if (r.order.waiter_name) lines.push(`Waiter: ${r.order.waiter_name}`);
    lines.push('-'.repeat(42));

    for (const it of r.items) {
      const qty = `${it.quantity}x`;
      const nameMax = 42 - 8 - qty.length - 1;
      const name = String(it.name).slice(0, nameMax);
      lines.push(pad(`${qty} ${name}`, money(Number(it.total_price))));
      if (it.is_comp) lines.push('    (İkram)');
      const addons = Array.isArray(it.selected_addons) ? it.selected_addons : [];
      for (const a of addons) {
        const addonName = a?.name || a?.code || '';
        const addonQty = a?.quantity && a.quantity > 1 ? ` x${a.quantity}` : '';
        lines.push(`  + ${addonName}${addonQty}`);
      }
      const removed = Array.isArray(it.selected_ingredients)
        ? it.selected_ingredients.filter((i: any) => i?.removed)
        : [];
      for (const ing of removed) {
        lines.push(`  - ${ing?.name || ing?.code || ''}`);
      }
      if (it.notes) lines.push(`  * ${it.notes}`);
    }
    lines.push('-'.repeat(42));

    lines.push(pad('Subtotal', money(r.totals.subtotal)));
    if (r.totals.discount_amount > 0) lines.push(pad('Discount', `-${money(r.totals.discount_amount)}`));
    if (r.totals.service_charge > 0) lines.push(pad('Service', money(r.totals.service_charge)));
    if (r.totals.tax_amount > 0) lines.push(pad('Tax', money(r.totals.tax_amount)));
    lines.push('[[B]]' + pad('TOTAL', money(r.totals.total)) + '[[B]]');

    if (Array.isArray(r.vat_breakdown) && r.vat_breakdown.length > 0) {
      lines.push('');
      lines.push('VAT breakdown:');
      for (const b of r.vat_breakdown) {
        if (b.vat > 0) lines.push(pad(`  ${b.rate.toFixed(2)}%  base ${money(b.subtotal)}`, money(b.vat)));
      }
    }

    if (Array.isArray(r.payments) && r.payments.length > 0) {
      lines.push('');
      lines.push('Payments:');
      for (const p of r.payments) {
        const label = `  ${p.payment_type_code || 'pay'} (${p.currency_code || ''})`;
        lines.push(pad(label, `${p.currency_symbol || ''}${Number(p.amount).toFixed(2)}`));
        if (p.reference_number) lines.push(`    ref: ${p.reference_number}`);
      }
    }

    if (r.qr?.url) {
      lines.push('');
      lines.push('[[C]]Scan to view/pay:');
      lines.push('[[C]]' + r.qr.url);
    }

    lines.push('');
    lines.push('[[C]]Thank you!');
    return lines;
  }

  /**
   * Best-effort TCP send to the store's receipt printer (ESC/POS port 9100).
   * Requires the backend to have LAN line-of-sight to the printer.
   */
  static async printToThermal(tenantId: number, orderId: number, opts: ReceiptOptions = {}): Promise<{ printed: boolean; printer_ip: string | null; reason?: string }> {
    const { receipt, esc_pos } = await this.getReceipt(tenantId, orderId, opts);
    const ip: string | null = receipt.store.receipt_printer_ip || null;
    if (!ip) return { printed: false, printer_ip: null, reason: 'Store has no receipt_printer_ip configured' };

    const net = await import('net');
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let settled = false;
      const finish = (printed: boolean, reason?: string) => {
        if (settled) return;
        settled = true;
        try { socket.destroy(); } catch { /* noop */ }
        resolve({ printed, printer_ip: ip, reason });
      };
      socket.setTimeout(4000);
      socket.on('timeout', () => finish(false, 'Connection timed out'));
      socket.on('error', (err) => finish(false, err.message));
      socket.connect(9100, ip, () => {
        socket.write(esc_pos, 'binary', (err) => {
          if (err) finish(false, err.message);
          else socket.end(() => finish(true));
        });
      });
    });
  }
}
