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
  notes: string | null;
  selected_addons: Array<{ name?: string; quantity?: number; price?: number }> | null;
  selected_ingredients: Array<{ name?: string; removed?: boolean }> | null;
  created_at: string;
  started_at: string | null;
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
              k.created_at AS kds_created_at, k.started_at,
              o.order_number, o.created_at AS order_created_at,
              ot.code AS order_type_code,
              t.name AS table_name,
              o.guest_name,
              oi.quantity, oi.notes AS item_notes,
              oi.selected_addons, oi.selected_ingredients,
              oi.tenant_menu_item_id AS menu_item_id
       FROM kds_orders k
       JOIN orders o ON o.id = k.order_id
       LEFT JOIN tenant_order_types ot ON ot.id = o.tenant_order_type_id
       LEFT JOIN tenant_table_structures t ON t.id = o.table_id
       JOIN order_items oi ON oi.id = k.order_item_id
       WHERE k.tenant_id = ?
         AND k.store_id = ?
         AND k.tenant_order_destination_id = ?
         AND k.status IN ('pending','preparing','ready')
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

    const ticketsByOrder = new Map<number, KdsDisplayTicket>();
    for (const r of rows) {
      const orderId = Number(r.order_id);
      const selectedAddons = r.selected_addons
        ? (typeof r.selected_addons === 'string' ? safeParseJson(r.selected_addons) : r.selected_addons)
        : null;
      const selectedIngredients = r.selected_ingredients
        ? (typeof r.selected_ingredients === 'string' ? safeParseJson(r.selected_ingredients) : r.selected_ingredients)
        : null;

      // Seat: optional field stored alongside addons (e.g. {seat: 2}); fall back to null.
      let seat: number | null = null;
      if (selectedAddons && typeof selectedAddons === 'object' && !Array.isArray(selectedAddons)) {
        const anyAddons = selectedAddons as any;
        if (Number.isFinite(Number(anyAddons.seat))) seat = Number(anyAddons.seat);
      }

      const item: KdsDisplayItem = {
        kds_id: Number(r.kds_id),
        order_item_id: Number(r.order_item_id),
        menu_item_id: r.menu_item_id ? Number(r.menu_item_id) : null,
        menu_item_name: r.menu_item_id ? (nameByItem.get(Number(r.menu_item_id)) ?? null) : null,
        quantity: Number(r.quantity) || 1,
        status: r.status as KdsDisplayItem['status'],
        priority: Number(r.priority) || 0,
        seat,
        notes: r.item_notes || null,
        selected_addons: Array.isArray(selectedAddons) ? selectedAddons : null,
        selected_ingredients: Array.isArray(selectedIngredients) ? selectedIngredients : null,
        created_at: r.kds_created_at,
        started_at: r.started_at ?? null,
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

    // Oldest ticket first so the cook works FIFO.
    return Array.from(ticketsByOrder.values()).sort((a, b) => {
      return new Date(a.oldest_item_at).getTime() - new Date(b.oldest_item_at).getTime();
    });
  }
}

function safeParseJson(raw: string): any {
  try { return JSON.parse(raw); } catch { return null; }
}
