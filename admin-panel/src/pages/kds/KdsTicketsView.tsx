import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Clock, Loader2, CheckCheck, Check, Undo2 } from 'lucide-react';
import {
  kdsRuntime,
  KdsDisplayTicket,
  KdsDisplayItem,
  KdsDeviceContext,
} from '../../services/frontend-kdsDeviceService';
import { realtimeClient, RealtimeEvent } from '../../services/realtimeClient';
import { kdsAudio } from './kdsAudio';

/**
 * KDS Display View (45.2 + 45.3).
 * - FIFO card grid of active tickets; paginates on overflow.
 * - Bump per item (preparing → ready) and Bump-all per ticket.
 * - Recall button on ready items while inside the device's recall window.
 * - Timer badge colored by destination thresholds (green / yellow / red).
 */

const PAGE_SIZE = 8;

interface Props {
  context: KdsDeviceContext;
}

export default function KdsTicketsView({ context }: Props) {
  const { t, i18n } = useTranslation();
  const [tickets, setTickets] = useState<KdsDisplayTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const refreshTimer = useRef<number | null>(null);

  // Audio-alert bookkeeping (45.5): remember which tickets we've already
  // chimed on, and which have crossed the overdue threshold, so we fire
  // each sound exactly once per ticket state transition.
  const knownOrderIds = useRef<Set<number>>(new Set());
  const seeded = useRef<boolean>(false);
  const overdueFiredAt = useRef<Map<number, number>>(new Map());

  const load = useCallback(async () => {
    const token = kdsRuntime.getToken();
    if (!token) return;
    try {
      const data = await kdsRuntime.tickets(token, i18n.language);
      setTickets(data);
    } catch {
      /* transient */
    } finally {
      setLoading(false);
    }
  }, [i18n.language]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const off = realtimeClient.on((ev: RealtimeEvent) => {
      if (ev.event === 'kds.upserted' || ev.event === 'order.item.status'
          || ev.event === 'order.items.fired' || ev.event === 'order.items.voided') {
        if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
        refreshTimer.current = window.setTimeout(load, 150);
      }
    });
    return () => {
      off();
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    };
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(load, 20000);
    return () => window.clearInterval(id);
  }, [load]);

  // Clock tick every 1s so the recall window countdown and timer badges stay fresh.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Detect new tickets + overdue transitions whenever the list changes.
  useEffect(() => {
    const lateMs = context.late_after_minutes * 60000;
    const currentIds = new Set(tickets.map(t => t.order_id));

    if (seeded.current) {
      for (const tk of tickets) {
        if (!knownOrderIds.current.has(tk.order_id)) {
          kdsAudio.newTicket();
          break; // one chime per refresh is enough; multiple-at-once shouldn't spam.
        }
      }
    } else {
      seeded.current = true; // Initial load — don't chime for existing tickets.
    }

    // Overdue detection — re-arm at most every 20s per ticket.
    const nowMs = Date.now();
    for (const tk of tickets) {
      const elapsed = nowMs - new Date(tk.oldest_item_at).getTime();
      if (elapsed >= lateMs) {
        const firedAt = overdueFiredAt.current.get(tk.order_id) ?? 0;
        if (nowMs - firedAt >= 20000) {
          kdsAudio.overdue();
          overdueFiredAt.current.set(tk.order_id, nowMs);
          break; // one overdue chime per tick
        }
      } else {
        overdueFiredAt.current.delete(tk.order_id);
      }
    }

    knownOrderIds.current = currentIds;
    // Garbage-collect fired-at entries for tickets that have cleared
    for (const id of Array.from(overdueFiredAt.current.keys())) {
      if (!currentIds.has(id)) overdueFiredAt.current.delete(id);
    }
  }, [tickets, context.late_after_minutes]);

  // The single most-overdue ticket gets a flashing border (45.5).
  const mostOverdueOrderId = useMemo<number | null>(() => {
    const lateMs = context.late_after_minutes * 60000;
    let worstAt = Infinity;
    let worstId: number | null = null;
    for (const tk of tickets) {
      const t0 = new Date(tk.oldest_item_at).getTime();
      const elapsed = now - t0;
      if (elapsed >= lateMs && t0 < worstAt) { worstAt = t0; worstId = tk.order_id; }
    }
    return worstId;
  }, [tickets, now, context.late_after_minutes]);

  const pageCount = Math.max(1, Math.ceil(tickets.length / PAGE_SIZE));
  useEffect(() => {
    if (page >= pageCount) setPage(0);
  }, [page, pageCount]);

  const visible = useMemo(
    () => tickets.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [tickets, page]
  );

  const runAction = async (
    key: string,
    fn: () => Promise<void>,
    errorKey: string,
    errorDefault: string
  ) => {
    if (pendingAction) return;
    setPendingAction(key);
    try {
      await fn();
      await load();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t(errorKey, errorDefault));
    } finally {
      setPendingAction(null);
    }
  };

  const handleBump = (item: KdsDisplayItem) => runAction(
    `bump:${item.order_item_id}`,
    async () => { const token = kdsRuntime.getToken(); if (!token) return; await kdsRuntime.bump(token, item.order_item_id); },
    'kds.bump.error', 'Failed to bump item'
  );

  const handleRecall = (item: KdsDisplayItem) => runAction(
    `recall:${item.order_item_id}`,
    async () => { const token = kdsRuntime.getToken(); if (!token) return; await kdsRuntime.recall(token, item.order_item_id); },
    'kds.recall.error', 'Failed to recall item'
  );

  const handleBumpAll = (ticket: KdsDisplayTicket) => runAction(
    `bumpAll:${ticket.order_id}`,
    async () => { const token = kdsRuntime.getToken(); if (!token) return; await kdsRuntime.bumpAll(token, ticket.order_id); },
    'kds.bumpAll.error', 'Failed to bump all'
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
          <KdsTicketCard
            key={ticket.order_id}
            ticket={ticket}
            now={now}
            context={context}
            pendingAction={pendingAction}
            isMostOverdue={ticket.order_id === mostOverdueOrderId}
            onBump={handleBump}
            onRecall={handleRecall}
            onBumpAll={handleBumpAll}
          />
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

function formatElapsed(
  sinceIso: string,
  now: number,
  warnMinutes: number,
  lateMinutes: number,
  t: (k: string, def: string) => string
): { text: string; color: string } {
  const diffMs = Math.max(0, now - new Date(sinceIso).getTime());
  const mins = Math.floor(diffMs / 60000);
  let color = 'text-green-300';
  if (mins >= lateMinutes) color = 'text-red-400';
  else if (mins >= warnMinutes) color = 'text-amber-300';
  if (mins < 1) return { text: t('kds.tickets.justNow', 'just now'), color };
  return { text: `${mins}m`, color };
}

interface CardProps {
  ticket: KdsDisplayTicket;
  now: number;
  context: KdsDeviceContext;
  pendingAction: string | null;
  isMostOverdue: boolean;
  onBump: (item: KdsDisplayItem) => void;
  onRecall: (item: KdsDisplayItem) => void;
  onBumpAll: (ticket: KdsDisplayTicket) => void;
}

function KdsTicketCard({ ticket, now, context, pendingAction, isMostOverdue, onBump, onRecall, onBumpAll }: CardProps) {
  const { t } = useTranslation();
  const elapsed = formatElapsed(ticket.oldest_item_at, now, context.warn_after_minutes, context.late_after_minutes, (k, d) => t(k, d));
  const isTakeaway = ticket.order_type_code === 'takeaway' || ticket.order_type_code === 'delivery' || ticket.order_type_code === 'kiosk';
  const headerLabel = isTakeaway
    ? (ticket.order_type_code === 'delivery'
        ? t('kds.tickets.delivery', 'DELIVERY')
        : ticket.order_type_code === 'kiosk'
          ? t('kds.tickets.kiosk', 'KIOSK')
          : t('kds.tickets.takeaway', 'TAKEAWAY'))
    : (ticket.table_name || t('kds.tickets.noTable', '—'));

  // Group by seat; within each seat, split by course (separator between groups).
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

  const splitByCourse = (items: KdsDisplayItem[]): Array<{ courseLabel: string | null; items: KdsDisplayItem[] }> => {
    const sorted = [...items].sort((a, b) => a.course_order - b.course_order);
    const out: Array<{ courseLabel: string | null; items: KdsDisplayItem[] }> = [];
    for (const it of sorted) {
      const label = it.course_code ? it.course_code : null;
      const last = out[out.length - 1];
      if (last && (last.courseLabel ?? null) === label) last.items.push(it);
      else out.push({ courseLabel: label, items: [it] });
    }
    return out;
  };

  const anyRush = ticket.items.some(i => i.priority > 0);
  const hasActionable = ticket.items.some(i => i.status !== 'ready');
  const bumpingAll = pendingAction === `bumpAll:${ticket.order_id}`;

  return (
    <div className={`rounded-lg overflow-hidden shadow-xl border-2 flex flex-col
      ${isMostOverdue ? 'border-red-500 kds-flash-border' : anyRush ? 'border-red-500' : 'border-slate-600'}`}>
      <header className={`flex items-center justify-between px-3 py-2
        ${anyRush ? 'bg-red-700' : 'bg-slate-700'} text-white`}>
        <div>
          <div className="text-lg font-bold leading-tight">{headerLabel}</div>
          <div className="text-xs opacity-75">#{ticket.order_number}{ticket.guest_name ? ` · ${ticket.guest_name}` : ''}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 text-sm font-mono ${elapsed.color}`}>
            <Clock className="w-4 h-4" /> {elapsed.text}
          </div>
          {hasActionable && (
            <button
              onClick={() => onBumpAll(ticket)}
              disabled={!!pendingAction}
              title={t('kds.bump.all', 'Bump all')}
              className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold px-2 py-1 rounded">
              {bumpingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
              {t('kds.bump.allShort', 'All')}
            </button>
          )}
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
            {splitByCourse(items).map((grp, gi) => (
              <div key={gi} className={gi > 0 ? 'mt-2 pt-2 border-t border-dashed border-slate-700' : ''}>
                {grp.courseLabel && (
                  <div className="text-[10px] uppercase tracking-wide text-sky-300 mb-1 font-semibold">
                    {t(`kds.tickets.course.${grp.courseLabel}`, grp.courseLabel)}
                  </div>
                )}
                <ul className="space-y-2">
                  {grp.items.map(item => (
                    <KdsItemRow
                      key={item.kds_id}
                      item={item}
                      now={now}
                      context={context}
                      pendingAction={pendingAction}
                      onBump={onBump}
                      onRecall={onRecall}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function KdsItemRow({
  item, now, context, pendingAction, onBump, onRecall,
}: {
  item: KdsDisplayItem;
  now: number;
  context: KdsDeviceContext;
  pendingAction: string | null;
  onBump: (item: KdsDisplayItem) => void;
  onRecall: (item: KdsDisplayItem) => void;
}) {
  const { t } = useTranslation();
  const isReady = item.status === 'ready';
  const bumping = pendingAction === `bump:${item.order_item_id}`;
  const recalling = pendingAction === `recall:${item.order_item_id}`;

  // Recall window countdown
  let recallSecondsLeft: number | null = null;
  if (isReady && item.completed_at) {
    const elapsedSec = (now - new Date(item.completed_at).getTime()) / 1000;
    recallSecondsLeft = Math.max(0, Math.ceil(context.recall_window_seconds - elapsedSec));
  }
  const canRecall = isReady && (recallSecondsLeft ?? 0) > 0;

  return (
    <li>
      <div className={`flex items-start justify-between gap-2 ${isReady ? 'opacity-70' : ''}`}>
        <div className="flex-1">
          <div className={`text-base font-semibold leading-tight ${isReady ? 'line-through' : ''}`}>
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
        <div className="flex flex-col items-end gap-1">
          {isReady ? (
            canRecall ? (
              <button
                onClick={() => onRecall(item)}
                disabled={!!pendingAction}
                className="flex items-center gap-1 text-[11px] bg-slate-600 hover:bg-slate-500 disabled:opacity-40 text-white px-2 py-1 rounded">
                {recalling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
                {t('kds.recall.button', 'Recall')} · {recallSecondsLeft}s
              </button>
            ) : (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-green-500 text-black">
                {t('kds.tickets.status.ready', 'ready')}
              </span>
            )
          ) : (
            <button
              onClick={() => onBump(item)}
              disabled={!!pendingAction}
              className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold px-3 py-1.5 rounded">
              {bumping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {t('kds.bump.button', 'Bump')}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
