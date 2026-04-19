import pool from '../config/database.js';
import { RowDataPacket } from 'mysql2';

interface TicketOptions {
  language?: string;
  destination_id?: number | null;   // print for a single destination only
  refire?: boolean;                 // re-fire = reprint un-served items
  item_ids?: number[] | null;       // explicit item IDs (e.g. newly added items)
  void_item_ids?: number[] | null;  // print a VOID ticket for these items
}

type TicketKind = 'new' | 'refire' | 'void';

interface Ticket {
  destination_id: number | null;
  destination_code: string;
  destination_name: string;
  printer_ip: string | null;
  kind: TicketKind;
  items: TicketItem[];
  header: TicketHeader;
  esc_pos: string;
}

interface TicketItem {
  id: number;
  name: string;
  quantity: number;
  notes: string | null;
  selected_addons: any[] | null;
  selected_ingredients: any[] | null;
  status_code: string | null;
  is_paid: boolean;
  weighted_portion: number | null;
}

interface TicketHeader {
  order_number: string;
  table_name: string | null;
  waiter_name: string | null;
  guest_name: string | null;
  created_at: string;
  now: string;
}

function pad(left: string, right: string, width = 42): string {
  const spaces = Math.max(1, width - left.length - right.length);
  return left + ' '.repeat(spaces) + right;
}

function toEscPos(lines: string[]): string {
  const ESC = '\x1B';
  const GS = '\x1D';
  const INIT = `${ESC}@`;
  const ALIGN_C = `${ESC}a1`;
  const ALIGN_L = `${ESC}a0`;
  const BOLD_ON = `${ESC}E1`;
  const BOLD_OFF = `${ESC}E0`;
  const DOUBLE_ON = `${GS}!\x11`;   // double width + height
  const DOUBLE_OFF = `${GS}!\x00`;
  const CUT = `${GS}V\x00`;

  let out = INIT + ALIGN_L;
  for (const raw of lines) {
    let line = raw;
    let align = 'L';
    let bold = false;
    let doubled = false;
    // Strip leading markers (can stack)
    while (true) {
      if (line.startsWith('[[C]]')) { align = 'C'; line = line.slice(5); continue; }
      if (line.startsWith('[[L]]')) { align = 'L'; line = line.slice(5); continue; }
      if (line.startsWith('[[B]]')) { bold = !bold; line = line.slice(5); continue; }
      if (line.startsWith('[[D]]')) { doubled = !doubled; line = line.slice(5); continue; }
      break;
    }
    out += (align === 'C' ? ALIGN_C : ALIGN_L);
    if (bold) out += BOLD_ON;
    if (doubled) out += DOUBLE_ON;
    out += line + '\n';
    if (doubled) out += DOUBLE_OFF;
    if (bold) out += BOLD_OFF;
    out += ALIGN_L;
  }
  out += '\n\n\n' + CUT;
  return out;
}

function resolvePrinterIp(destination: any, store: any): string | null {
  if (destination?.printer_ip) return String(destination.printer_ip);
  const code = String(destination?.code || '').toLowerCase();
  if (code.includes('bar')) return store.bar_printer_ip || null;
  // Kitchen printer is the default for everything else (kitchen, dessert_station, etc)
  return store.kitchen_printer_ip || null;
}

async function pickTranslated(tenantId: number, orderItemId: number, language: string): Promise<string> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.name
     FROM order_items oi
     JOIN tenant_menu_item_translations t ON t.tenant_menu_item_id = oi.tenant_menu_item_id
     JOIN languages l ON l.id = t.language_id
     WHERE oi.id = ?
     ORDER BY (l.code = ?) DESC, (l.code = 'en') DESC, l.sort_order ASC LIMIT 1`,
    [orderItemId, language]
  );
  return rows[0]?.name || `Item #${orderItemId}`;
}

export class PosKitchenTicketService {
  /**
   * Build one ticket per destination for the given order, honoring filters.
   */
  static async getTickets(tenantId: number, orderId: number, opts: TicketOptions = {}): Promise<Ticket[]> {
    const lang = opts.language || 'en';

    // Order + store header context
    const [orderRows] = await pool.query<RowDataPacket[]>(
      `SELECT o.*,
        t.name as tenant_name,
        s.name as store_name, s.kitchen_printer_ip, s.bar_printer_ip,
        tbl.name as table_name,
        w.name as waiter_name
       FROM orders o
       LEFT JOIN tenants t ON t.id = o.tenant_id
       LEFT JOIN stores s ON s.id = o.store_id
       LEFT JOIN tenant_table_structures tbl ON tbl.id = o.table_id
       LEFT JOIN tenant_waiters w ON w.id = o.tenant_waiter_id
       WHERE o.id = ? AND o.tenant_id = ?`,
      [orderId, tenantId]
    );
    if (orderRows.length === 0) throw { status: 404, message: 'Order not found' };
    const order = orderRows[0];

    const header: TicketHeader = {
      order_number: order.order_number,
      table_name: order.table_name,
      waiter_name: order.waiter_name,
      guest_name: order.guest_name,
      created_at: order.created_at,
      now: new Date().toISOString(),
    };
    const store = {
      name: order.store_name,
      kitchen_printer_ip: order.kitchen_printer_ip,
      bar_printer_ip: order.bar_printer_ip,
    };

    // --- VOID ticket branch ---
    if (Array.isArray(opts.void_item_ids) && opts.void_item_ids.length > 0) {
      const voidIds = opts.void_item_ids.map(n => Number(n)).filter(Boolean);
      return this.buildVoidTickets(tenantId, order, store, voidIds, header, lang);
    }

    // --- NEW or REFIRE ticket branch ---
    const conditions: string[] = ['oi.order_id = ?'];
    const params: any[] = [orderId];

    if (Array.isArray(opts.item_ids) && opts.item_ids.length > 0) {
      const ids = opts.item_ids.map(n => Number(n)).filter(Boolean);
      if (ids.length === 0) return [];
      conditions.push(`oi.id IN (${ids.map(() => '?').join(',')})`);
      params.push(...ids);
    } else if (opts.refire) {
      // Un-served items only
      conditions.push(`ois.code NOT IN ('served', 'cancelled', 'void')`);
    }

    if (opts.destination_id) {
      conditions.push('mi.tenant_order_destination_id = ?');
      params.push(opts.destination_id);
    }

    const [itemRows] = await pool.query<RowDataPacket[]>(
      `SELECT oi.id, oi.tenant_menu_item_id, oi.quantity, oi.notes, oi.selected_addons,
              oi.selected_ingredients, oi.weighted_portion, oi.is_paid,
              mi.tenant_order_destination_id,
              ois.code as status_code,
              (SELECT t.name FROM tenant_menu_item_translations t
                 JOIN languages l ON l.id = t.language_id
                 WHERE t.tenant_menu_item_id = oi.tenant_menu_item_id
                 ORDER BY (l.code = ?) DESC, (l.code = 'en') DESC, l.sort_order ASC LIMIT 1) as menu_item_name
       FROM order_items oi
       LEFT JOIN tenant_menu_items mi ON mi.id = oi.tenant_menu_item_id
       LEFT JOIN tenant_order_item_statuses ois ON ois.id = oi.tenant_order_item_status_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY oi.id ASC`,
      [lang, ...params]
    );

    if (itemRows.length === 0) return [];

    // Group items by destination
    const byDest: Record<string, any[]> = {};
    for (const it of itemRows) {
      const key = String(it.tenant_order_destination_id ?? 'none');
      (byDest[key] ||= []).push(it);
    }

    // Resolve destination metadata for each bucket (name translations, printer override)
    const destIds = Object.keys(byDest).filter(k => k !== 'none').map(Number);
    let destinations: Record<number, any> = {};
    if (destIds.length > 0) {
      const placeholders = destIds.map(() => '?').join(',');
      const [destRows] = await pool.query<RowDataPacket[]>(
        `SELECT d.id, d.code, d.printer_ip,
                (SELECT t.name FROM tenant_order_destination_translations t
                   JOIN languages l ON l.id = t.language_id
                   WHERE t.tenant_order_destination_id = d.id
                   ORDER BY (l.code = ?) DESC, (l.code = 'en') DESC, l.sort_order ASC LIMIT 1) as name
         FROM tenant_order_destinations d
         WHERE d.id IN (${placeholders}) AND d.tenant_id = ?`,
        [lang, ...destIds, tenantId]
      );
      for (const r of destRows) destinations[Number(r.id)] = r;
    }

    const tickets: Ticket[] = [];
    for (const [key, items] of Object.entries(byDest)) {
      const destId = key === 'none' ? null : Number(key);
      const dest = destId != null ? destinations[destId] : null;
      const kind: TicketKind = opts.refire ? 'refire' : 'new';
      const printerIp = dest ? resolvePrinterIp(dest, store) : (store.kitchen_printer_ip || null);
      const ticketItems: TicketItem[] = items.map((r: any) => ({
        id: Number(r.id),
        name: r.menu_item_name || `Item #${r.tenant_menu_item_id}`,
        quantity: Number(r.quantity) || 1,
        notes: r.notes || null,
        selected_addons: r.selected_addons || null,
        selected_ingredients: r.selected_ingredients || null,
        status_code: r.status_code || null,
        is_paid: !!r.is_paid,
        weighted_portion: r.weighted_portion != null ? Number(r.weighted_portion) : null,
      }));

      const lines = this.buildTicketLines({
        kind,
        destinationName: dest?.name || (destId ? `Destination #${destId}` : 'Kitchen'),
        storeName: store.name,
        items: ticketItems,
        header,
      });

      tickets.push({
        destination_id: destId,
        destination_code: dest?.code || 'kitchen',
        destination_name: dest?.name || (destId ? `Destination #${destId}` : 'Kitchen'),
        printer_ip: printerIp,
        kind,
        items: ticketItems,
        header,
        esc_pos: toEscPos(lines),
      });
    }

    return tickets;
  }

  private static async buildVoidTickets(
    tenantId: number,
    order: any,
    store: any,
    voidItemIds: number[],
    header: TicketHeader,
    lang: string
  ): Promise<Ticket[]> {
    if (voidItemIds.length === 0) return [];
    const placeholders = voidItemIds.map(() => '?').join(',');
    const [itemRows] = await pool.query<RowDataPacket[]>(
      `SELECT oi.id, oi.tenant_menu_item_id, oi.quantity, oi.notes, oi.selected_addons, oi.selected_ingredients,
              mi.tenant_order_destination_id,
              (SELECT t.name FROM tenant_menu_item_translations t
                 JOIN languages l ON l.id = t.language_id
                 WHERE t.tenant_menu_item_id = oi.tenant_menu_item_id
                 ORDER BY (l.code = ?) DESC, (l.code = 'en') DESC, l.sort_order ASC LIMIT 1) as menu_item_name
       FROM order_items oi
       LEFT JOIN tenant_menu_items mi ON mi.id = oi.tenant_menu_item_id
       WHERE oi.id IN (${placeholders}) AND oi.order_id = ?`,
      [lang, ...voidItemIds, order.id]
    );
    if (itemRows.length === 0) return [];

    const byDest: Record<string, any[]> = {};
    for (const it of itemRows) {
      const key = String(it.tenant_order_destination_id ?? 'none');
      (byDest[key] ||= []).push(it);
    }

    const destIds = Object.keys(byDest).filter(k => k !== 'none').map(Number);
    let destinations: Record<number, any> = {};
    if (destIds.length > 0) {
      const ph = destIds.map(() => '?').join(',');
      const [destRows] = await pool.query<RowDataPacket[]>(
        `SELECT d.id, d.code, d.printer_ip,
                (SELECT t.name FROM tenant_order_destination_translations t
                   JOIN languages l ON l.id = t.language_id
                   WHERE t.tenant_order_destination_id = d.id
                   ORDER BY (l.code = ?) DESC, (l.code = 'en') DESC, l.sort_order ASC LIMIT 1) as name
         FROM tenant_order_destinations d
         WHERE d.id IN (${ph}) AND d.tenant_id = ?`,
        [lang, ...destIds, tenantId]
      );
      for (const r of destRows) destinations[Number(r.id)] = r;
    }

    const tickets: Ticket[] = [];
    for (const [key, items] of Object.entries(byDest)) {
      const destId = key === 'none' ? null : Number(key);
      const dest = destId != null ? destinations[destId] : null;
      const ticketItems: TicketItem[] = items.map((r: any) => ({
        id: Number(r.id),
        name: r.menu_item_name || `Item #${r.tenant_menu_item_id}`,
        quantity: Number(r.quantity) || 1,
        notes: r.notes || null,
        selected_addons: r.selected_addons || null,
        selected_ingredients: r.selected_ingredients || null,
        status_code: 'void',
        is_paid: false,
        weighted_portion: null,
      }));
      const lines = this.buildTicketLines({
        kind: 'void',
        destinationName: dest?.name || (destId ? `Destination #${destId}` : 'Kitchen'),
        storeName: store.name,
        items: ticketItems,
        header,
      });
      tickets.push({
        destination_id: destId,
        destination_code: dest?.code || 'kitchen',
        destination_name: dest?.name || (destId ? `Destination #${destId}` : 'Kitchen'),
        printer_ip: dest ? resolvePrinterIp(dest, store) : (store.kitchen_printer_ip || null),
        kind: 'void',
        items: ticketItems,
        header,
        esc_pos: toEscPos(lines),
      });
    }
    return tickets;
  }

  private static buildTicketLines(params: {
    kind: TicketKind;
    destinationName: string;
    storeName: string | null;
    items: TicketItem[];
    header: TicketHeader;
  }): string[] {
    const { kind, destinationName, items, header } = params;
    const lines: string[] = [];

    // Header banner — destination + kind (no prices, double-size for legibility)
    const banner = kind === 'void' ? 'VOID' : kind === 'refire' ? 'RE-FIRE' : 'NEW';
    lines.push('[[C]][[D]]' + destinationName.toUpperCase());
    lines.push('[[C]][[B]]' + banner);
    lines.push('');

    // Order meta
    lines.push('[[B]]#' + header.order_number);
    if (header.table_name) lines.push('Table: ' + header.table_name);
    if (header.waiter_name) lines.push('Waiter: ' + header.waiter_name);
    if (header.guest_name) lines.push('Guest: ' + header.guest_name);
    lines.push('Time: ' + new Date(header.now).toLocaleTimeString());
    lines.push('-'.repeat(42));

    for (const it of items) {
      const qtyLabel = `${it.quantity}×`;
      // Double-height item line for cook legibility
      lines.push('[[D]]' + pad(`${qtyLabel} ${it.name}`, '', 21));
      if (kind === 'void') {
        lines.push('  *** CANCELLED — DO NOT PREPARE ***');
      }
      if (it.weighted_portion != null) {
        lines.push(`  (${it.weighted_portion}g)`);
      }
      const addons = Array.isArray(it.selected_addons) ? it.selected_addons : [];
      for (const a of addons) {
        const name = a?.name || a?.code || '';
        const qty = a?.quantity && a.quantity > 1 ? ` ×${a.quantity}` : '';
        lines.push(`  + ${name}${qty}`);
      }
      const removed = Array.isArray(it.selected_ingredients)
        ? it.selected_ingredients.filter((i: any) => i?.removed)
        : [];
      for (const ing of removed) {
        lines.push(`  − ${ing?.name || ing?.code || ''} (NO)`);
      }
      if (it.notes) {
        lines.push('  [[B]]! ' + it.notes);
      }
      lines.push('');
    }

    if (kind === 'refire') {
      lines.push('[[C]][[B]]** REPRINT — ALREADY FIRED **');
    }
    return lines;
  }

  /**
   * Print every ticket to its resolved printer. Returns a per-ticket result.
   */
  static async printTickets(tenantId: number, orderId: number, opts: TicketOptions = {}): Promise<{
    tickets: Array<Omit<Ticket, 'esc_pos'> & { printed: boolean; reason?: string }>;
  }> {
    const tickets = await this.getTickets(tenantId, orderId, opts);
    const net = await import('net');

    const results = await Promise.all(tickets.map((ticket) => new Promise<any>((resolve) => {
      const { esc_pos, ...rest } = ticket;
      if (!ticket.printer_ip) {
        resolve({ ...rest, printed: false, reason: 'No printer IP resolved for this destination' });
        return;
      }
      const socket = new net.Socket();
      let settled = false;
      const finish = (printed: boolean, reason?: string) => {
        if (settled) return;
        settled = true;
        try { socket.destroy(); } catch { /* noop */ }
        resolve({ ...rest, printed, reason });
      };
      socket.setTimeout(4000);
      socket.on('timeout', () => finish(false, 'Connection timed out'));
      socket.on('error', (err) => finish(false, err.message));
      socket.connect(9100, ticket.printer_ip, () => {
        socket.write(esc_pos, 'binary', (err) => {
          if (err) finish(false, err.message);
          else socket.end(() => finish(true));
        });
      });
    })));

    return { tickets: results };
  }
}
