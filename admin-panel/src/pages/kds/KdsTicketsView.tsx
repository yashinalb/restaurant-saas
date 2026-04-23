import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { kdsRuntime, KdsDisplayTicket, KdsDisplayItem } from '../../services/frontend-kdsDeviceService';
import { realtimeClient, RealtimeEvent } from '../../services/realtimeClient';

/**
 * KDS Display View (45.2).
 * Card grid of active tickets for the paired destination.
 * - Up to 4 columns, FIFO (oldest first), paginates on overflow.
 * - Refreshes on realtime events (kds.upserted / order.item.status) + 20s fallback poll.
 */

const PAGE_SIZE = 8; // 4 cols × 2 rows per page for typical 1080p displays.

export default function KdsTicketsView() {
  const { t, i18n } = useTranslation();
  const [tickets, setTickets] = useState<KdsDisplayTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [now, setNow] = useState(Date.now());
  const refreshTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    const token = kdsRuntime.getToken();
    if (!token) return;
    try {
      const data = await kdsRuntime.tickets(token, i18n.language);
      setTickets(data);
    } catch {
      /* transient — next realtime event / poll retries */
    } finally {
      setLoading(false);
    }
  }, [i18n.language]);

  useEffect(() => { load(); }, [load]);

  // Realtime: refetch when anything at our destination changes. The server
  // pins KDS sockets to our destination, so any inbound event is relevant.
  useEffect(() => {
    const off = realtimeClient.on((ev: RealtimeEvent) => {
      if (ev.event === 'kds.upserted' || ev.event === 'order.item.status'
          || ev.event === 'order.items.fired' || ev.event === 'order.items.voided') {
        // Debounce bursts (e.g. a multi-item fire triggers N events).
        if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
        refreshTimer.current = window.setTimeout(load, 150);
      }
    });
    return () => {
      off();
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    };
  }, [load]);

  // Fallback poll every 20s in case a WS event is missed.
  useEffect(() => {
    const id = window.setInterval(load, 20000);
    return () => window.clearInterval(id);
  }, [load]);

  // Clock tick for the "elapsed" badge on each ticket.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 10000);
    return () => window.clearInterval(id);
  }, []);

  const pageCount = Math.max(1, Math.ceil(tickets.length / PAGE_SIZE));
  useEffect(() => {
    if (page >= pageCount) setPage(0);
  }, [page, pageCount]);

  const visible = useMemo(
    () => tickets.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [tickets, page]
  );

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-400" /></div>;
  }

  if (tickets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-lg">
        {t('kds.tickets.empty', 'No active tickets. Nice work.')}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3 overflow-hidden">
        {visible.map(ticket => (
          <KdsTicketCard key={ticket.order_id} ticket={ticket} now={now} />
        ))}
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-4 py-2 bg-slate-800 border-t border-slate-700 text-white">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm">
            {t('kds.tickets.page', 'Page {{current}} of {{total}}', { current: page + 1, total: pageCount })}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
            disabled={page >= pageCount - 1}
            className="p-2 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function formatElapsed(sinceIso: string, now: number, t: (k: string, def: string) => string): { text: string; color: string } {
  const diffMs = Math.max(0, now - new Date(sinceIso).getTime());
  const mins = Math.floor(diffMs / 60000);
  let color = 'text-green-300';
  if (mins >= 15) color = 'text-red-400';
  else if (mins >= 8) color = 'text-amber-300';
  if (mins < 1) return { text: t('kds.tickets.justNow', 'just now'), color };
  return { text: `${mins}m`, color };
}

function KdsTicketCard({ ticket, now }: { ticket: KdsDisplayTicket; now: number }) {
  const { t } = useTranslation();
  const elapsed = formatElapsed(ticket.oldest_item_at, now, (k, d) => t(k, d));
  const isTakeaway = ticket.order_type_code === 'takeaway' || ticket.order_type_code === 'delivery' || ticket.order_type_code === 'kiosk';
  const headerLabel = isTakeaway
    ? (ticket.order_type_code === 'delivery'
        ? t('kds.tickets.delivery', 'DELIVERY')
        : ticket.order_type_code === 'kiosk'
          ? t('kds.tickets.kiosk', 'KIOSK')
          : t('kds.tickets.takeaway', 'TAKEAWAY'))
    : (ticket.table_name || t('kds.tickets.noTable', '—'));

  const bySeat = new Map<string, KdsDisplayItem[]>();
  for (const item of ticket.items) {
    const key = item.seat != null ? `seat:${item.seat}` : '__';
    if (!bySeat.has(key)) bySeat.set(key, []);
    bySeat.get(key)!.push(item);
  }
  const sortedGroups = Array.from(bySeat.entries()).sort((a, b) => {
    if (a[0] === '__') return 1;
    if (b[0] === '__') return -1;
    return a[0].localeCompare(b[0]);
  });

  const anyRush = ticket.items.some(i => i.priority > 0);

  return (
    <div className={`rounded-lg overflow-hidden shadow-xl border-2 flex flex-col
      ${anyRush ? 'border-red-500' : 'border-slate-600'}`}>
      <header className={`flex items-center justify-between px-3 py-2
        ${anyRush ? 'bg-red-700' : 'bg-slate-700'} text-white`}>
        <div>
          <div className="text-lg font-bold leading-tight">{headerLabel}</div>
          <div className="text-xs opacity-75">#{ticket.order_number}{ticket.guest_name ? ` · ${ticket.guest_name}` : ''}</div>
        </div>
        <div className={`flex items-center gap-1 text-sm font-mono ${elapsed.color}`}>
          <Clock className="w-4 h-4" /> {elapsed.text}
        </div>
      </header>
      <div className="bg-slate-900 text-white flex-1 divide-y divide-slate-800">
        {sortedGroups.map(([key, items]) => (
          <div key={key} className="p-2">
            {key !== '__' && (
              <div className="text-[11px] uppercase tracking-wide text-amber-300 mb-1">
                {t('kds.tickets.seat', 'Seat')} {key.replace('seat:', '')}
              </div>
            )}
            <ul className="space-y-2">
              {items.map(item => (
                <li key={item.kds_id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-base font-semibold leading-tight">
                        <span className="font-mono text-amber-300">{item.quantity}×</span>{' '}
                        {item.menu_item_name || t('kds.tickets.unknownItem', 'Unknown item')}
                      </div>
                      {item.selected_addons && item.selected_addons.length > 0 && (
                        <ul className="text-xs text-slate-300 mt-0.5 ml-4 list-disc">
                          {item.selected_addons.map((a, i) => (
                            <li key={i}>
                              {a.name || t('kds.tickets.addon', 'Add-on')}
                              {a.quantity && a.quantity > 1 ? ` ×${a.quantity}` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                      {item.selected_ingredients && item.selected_ingredients.some(i => i.removed) && (
                        <ul className="text-xs text-red-300 mt-0.5 ml-4 list-disc">
                          {item.selected_ingredients.filter(i => i.removed).map((ing, i) => (
                            <li key={i}>{t('kds.tickets.noIngredient', 'NO')} {ing.name || ''}</li>
                          ))}
                        </ul>
                      )}
                      {item.notes && (
                        <div className="text-xs italic text-amber-200 mt-1">"{item.notes}"</div>
                      )}
                    </div>
                    <StatusPill status={item.status} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: KdsDisplayItem['status'] }) {
  const { t } = useTranslation();
  const map: Record<KdsDisplayItem['status'], string> = {
    pending: 'bg-slate-600 text-white',
    preparing: 'bg-amber-500 text-black',
    ready: 'bg-green-500 text-black',
  };
  return (
    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${map[status]}`}>
      {t(`kds.tickets.status.${status}`, status)}
    </span>
  );
}
