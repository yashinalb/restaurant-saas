import pool from '../config/database.js';
import { RowDataPacket } from 'mysql2/promise';

/**
 * KDS Display (45.2) — view model for the card grid at the paired destination.
 *
 * Tickets are grouped by order: one card per order with the lines that route
 * to this device's `tenant_order_destination_id`. Only items still actionable
 * (`pending`/`preparing`/`ready`) are returned so served/cancelled disappear
 * from the cooks' view without scrolling.
 */

export interface KdsDisplayItem {
  kds_id: number;
  order_item_id: number;
  menu_item_id: number | null;
  menu_item_name: string | null;
  quantity: number;
  status: 'pending' | 'preparing' | 'ready';
  priority: number;
  seat: number | null;
  course_code: string | null;
  course_order: number;
  notes: string | null;
  selected_addons: Array<{ name?: string; quantity?: number; price?: number }> | null;
  selected_ingredients: Array<{ name?: string; removed?: boolean }> | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// Lower = earlier in the meal. Unknown/null courses sort as 999 (i.e. shown with
// items that have no course — typically single-course orders).
const COURSE_ORDER: Record<string, number> = {
  amuse: 0,
  appetizer: 1,
  starter: 1,
  soup: 2,
  salad: 2,
  main: 3,
  entree: 3,
  side: 3,
  dessert: 4,
  beverage: 5,
};

function courseOrder(code: string | null | undefined): number {
  if (!code) return 999;
  return COURSE_ORDER[String(code).toLowerCase()] ?? 500;
}

export interface KdsDisplayTicket {
  order_id: number;
  order_number: string;
  order_type_code: string | null;
  table_name: string | null;
  guest_name: string | null;
  created_at: string;         // Order creation time (cook cares about elapsed wait)
  oldest_item_at: string;     // Created_at of the earliest line still actionable
  items: KdsDisplayItem[];
}

function pickName(translations: Array<{ name: string; language_code: string }> | undefined, language?: string): string | null {
  if (!translations || translations.length === 0) return null;
  const preferred = language ? translations.find(t => t.language_code === language) : undefined;
  return preferred?.name
    || translations.find(t => t.language_code === 'en')?.name
    || translations[0].name
    || null;
}

export class KdsDisplayService {
  static async activeTicketsForDestination(
    tenantId: number,
    storeId: number,
    destinationId: number,
    opts: { language?: string } = {}
  ): Promise<KdsDisplayTicket[]> {
    // One row per active kds_order at this destination, with order + item context.
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT k.id AS kds_id, k.order_id, k.order_item_id, k.status, k.priority,
              k.created_at AS kds_created_at, k.started_at, k.completed_at,
              o.order_number, o.created_at AS order_created_at,
              ot.code AS order_type_code,
              t.name AS table_name,
              o.guest_name,
              oi.quantity, oi.notes AS item_notes,
              oi.selected_addons, oi.selected_ingredients,
              oi.seat_number, oi.course_code, oi.course_hold,
              oi.tenant_menu_item_id AS menu_item_id
       FROM kds_orders k
       JOIN orders o ON o.id = k.order_id
       LEFT JOIN tenant_order_types ot ON ot.id = o.tenant_order_type_id
       LEFT JOIN tenant_table_structures t ON t.id = o.table_id
       JOIN order_items oi ON oi.id = k.order_item_id
       WHERE k.tenant_id = ?
         AND k.store_id = ?
         AND k.tenant_order_destination_id = ?
         AND (
           k.status IN ('pending','preparing')
           OR (k.status = 'ready' AND k.completed_at IS NOT NULL
               AND k.completed_at >= NOW() - INTERVAL 3 MINUTE)
         )
       ORDER BY k.priority DESC, k.created_at ASC`,
      [tenantId, storeId, destinationId]
    );

    if (rows.length === 0) return [];

    // Fetch menu item translations in one query per unique menu item
    const menuItemIds = Array.from(new Set(rows.map(r => r.menu_item_id).filter(Boolean)));
    const nameByItem = new Map<number, string | null>();
    if (menuItemIds.length > 0) {
      const placeholders = menuItemIds.map(() => '?').join(',');
      const [transRows] = await pool.query<RowDataPacket[]>(
        `SELECT t.tenant_menu_item_id AS item_id, t.name, l.code AS language_code
         FROM tenant_menu_item_translations t
         JOIN languages l ON l.id = t.language_id
         WHERE t.tenant_menu_item_id IN (${placeholders})`,
        menuItemIds
      );
      const grouped = new Map<number, Array<{ name: string; language_code: string }>>();
      for (const tr of transRows) {
        const id = Number(tr.item_id);
        if (!grouped.has(id)) grouped.set(id, []);
        grouped.get(id)!.push({ name: String(tr.name), language_code: String(tr.language_code) });
      }
      for (const [id, list] of grouped.entries()) {
        nameByItem.set(id, pickName(list, opts.language));
      }
    }

    // Resolve the "hold" rule per order: a held item is hidden while any item
    // from an earlier course on the same order is still pending/preparing.
    // We look at the whole order (every destination) — holding a main until
    // appetizers clear only makes sense globally.
    const orderIds = Array.from(new Set(rows.map(r => Number(r.order_id))));
    const earliestActiveCourseByOrder = new Map<number, number>();
    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => '?').join(',');
      const [activeRows] = await pool.query<RowDataPacket[]>(
        `SELECT oi.order_id, oi.course_code
         FROM order_items oi
         LEFT JOIN tenant_order_item_statuses ois ON ois.id = oi.tenant_order_item_status_id
         WHERE oi.order_id IN (${placeholders})
           AND ois.code IN ('pending','preparing')`,
        orderIds
      );
      for (const r of activeRows) {
        const oid = Number(r.order_id);
        const ord = courseOrder(r.course_code);
        const prev = earliestActiveCourseByOrder.get(oid);
        if (prev === undefined || ord < prev) earliestActiveCourseByOrder.set(oid, ord);
      }
    }

    const ticketsByOrder = new Map<number, KdsDisplayTicket>();
    for (const r of rows) {
      const orderId = Number(r.order_id);

      const itemCourseOrder = courseOrder(r.course_code);
      const isHeld = Number(r.course_hold) === 1;
      if (isHeld) {
        const earliest = earliestActiveCourseByOrder.get(orderId);
        // Held rows appear only when no earlier course has active items left.
        if (earliest !== undefined && earliest < itemCourseOrder) continue;
      }

      const selectedAddons = r.selected_addons
        ? (typeof r.selected_addons === 'string' ? safeParseJson(r.selected_addons) : r.selected_addons)
        : null;
      const selectedIngredients = r.selected_ingredients
        ? (typeof r.selected_ingredients === 'string' ? safeParseJson(r.selected_ingredients) : r.selected_ingredients)
        : null;

      const seat = r.seat_number != null ? Number(r.seat_number) : null;

      const item: KdsDisplayItem = {
        kds_id: Number(r.kds_id),
        order_item_id: Number(r.order_item_id),
        menu_item_id: r.menu_item_id ? Number(r.menu_item_id) : null,
        menu_item_name: r.menu_item_id ? (nameByItem.get(Number(r.menu_item_id)) ?? null) : null,
        quantity: Number(r.quantity) || 1,
        status: r.status as KdsDisplayItem['status'],
        priority: Number(r.priority) || 0,
        seat,
        course_code: r.course_code ?? null,
        course_order: itemCourseOrder,
        notes: r.item_notes || null,
        selected_addons: Array.isArray(selectedAddons) ? selectedAddons : null,
        selected_ingredients: Array.isArray(selectedIngredients) ? selectedIngredients : null,
        created_at: r.kds_created_at,
        started_at: r.started_at ?? null,
        completed_at: r.completed_at ?? null,
      };

      let ticket = ticketsByOrder.get(orderId);
      if (!ticket) {
        ticket = {
          order_id: orderId,
          order_number: r.order_number,
          order_type_code: r.order_type_code ?? null,
          table_name: r.table_name ?? null,
          guest_name: r.guest_name ?? null,
          created_at: r.order_created_at,
          oldest_item_at: r.kds_created_at,
          items: [],
        };
        ticketsByOrder.set(orderId, ticket);
      }
      ticket.items.push(item);
      if (new Date(r.kds_created_at).getTime() < new Date(ticket.oldest_item_at).getTime()) {
        ticket.oldest_item_at = r.kds_created_at;
      }
    }

    // Sort items inside each ticket: by seat (nulls last), then by course, then FIFO.
    for (const ticket of ticketsByOrder.values()) {
      ticket.items.sort((a, b) => {
        const aSeat = a.seat ?? Number.MAX_SAFE_INTEGER;
        const bSeat = b.seat ?? Number.MAX_SAFE_INTEGER;
        if (aSeat !== bSeat) return aSeat - bSeat;
        if (a.course_order !== b.course_order) return a.course_order - b.course_order;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    }

    // Oldest ticket first so the cook works FIFO. Drop empty ones (all held).
    return Array.from(ticketsByOrder.values())
      .filter(t => t.items.length > 0)
      .sort((a, b) => {
        return new Date(a.oldest_item_at).getTime() - new Date(b.oldest_item_at).getTime();
      });
  }
}

function safeParseJson(raw: string): any {
  try { return JSON.parse(raw); } catch { return null; }
}
