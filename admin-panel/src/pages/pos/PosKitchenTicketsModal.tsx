import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, X, ChefHat, RefreshCw, Send, AlertTriangle, CheckCircle2 } from 'lucide-react';
import posKitchenTicketService, { KitchenTicket, TicketRequest } from '../../services/frontend-posKitchenTicketService';

interface Props {
  orderId: number;
  initialRefire?: boolean;
  onClose: () => void;
}

export default function PosKitchenTicketsModal({ orderId, initialRefire = false, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refire, setRefire] = useState(initialRefire);
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [lastPrintResults, setLastPrintResults] = useState<KitchenTicket[] | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await posKitchenTicketService.get(orderId, { language: i18n.language, refire });
      setTickets(data);
      setLastPrintResults(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('pos.kitchen.fetchError', 'Failed to load tickets'));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [orderId, refire]);

  const handleSend = async (opts: TicketRequest = {}) => {
    try {
      setSending(true);
      const result = await posKitchenTicketService.print(orderId, {
        language: i18n.language,
        refire,
        ...opts,
      });
      setLastPrintResults(result.tickets);
      const allOk = result.tickets.every(tk => tk.printed);
      if (allOk && result.tickets.length > 0) {
        toast.success(t('pos.kitchen.sentAll', 'All tickets sent'));
      } else if (result.tickets.length === 0) {
        toast.message(t('pos.kitchen.nothingToSend', 'Nothing to send'));
      } else {
        toast.message(t('pos.kitchen.sentSome', 'Some tickets failed — see summary below'));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('pos.kitchen.sendError', 'Failed to send tickets'));
    } finally {
      setSending(false);
    }
  };

  const handleSendOne = async (destination_id: number | null) => {
    if (destination_id == null) {
      toast.message(t('pos.kitchen.noDestination', 'This ticket has no destination configured'));
      return;
    }
    await handleSend({ destination_id });
  };

  const kindBadgeColor = (kind: string) => {
    switch (kind) {
      case 'new': return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
      case 'refire': return 'bg-amber-100 text-amber-800 border border-amber-300';
      case 'void': return 'bg-red-100 text-red-800 border border-red-300';
      default: return 'bg-gray-100 text-gray-700 border border-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-gray-900">{t('pos.kitchen.title', 'Kitchen / Bar Tickets')}</h2>
          </div>
          <div className="flex items-center gap-1">
            <label className="flex items-center gap-1 text-sm mr-2">
              <input type="checkbox" checked={refire} onChange={e => setRefire(e.target.checked)} className="rounded" />
              {t('pos.kitchen.refire', 'Re-fire un-served only')}
            </label>
            <button onClick={load} title={t('common.refresh', 'Refresh')}
              className="p-1 text-gray-500 hover:text-gray-800 rounded hover:bg-gray-100">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ChefHat className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <div className="font-semibold">{t('pos.kitchen.noTickets', 'No tickets to print')}</div>
            <p className="text-sm mt-1">
              {refire
                ? t('pos.kitchen.noUnserved', 'No un-served items. Uncheck "Re-fire" to see all items.')
                : t('pos.kitchen.noItems', 'This order has no items with routable destinations.')}
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto bg-gray-100 p-4 space-y-4">
              {tickets.map((ticket, idx) => {
                const printResult = lastPrintResults?.find(tk => tk.destination_id === ticket.destination_id);
                return (
                  <div key={`${ticket.destination_id ?? 'none'}-${idx}`} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full uppercase font-bold ${kindBadgeColor(ticket.kind)}`}>
                          {t(`pos.kitchen.kind.${ticket.kind}`, ticket.kind)}
                        </span>
                        <div>
                          <div className="font-bold text-gray-900">{ticket.destination_name}</div>
                          <div className="text-xs text-gray-500">
                            {ticket.printer_ip
                              ? `${t('pos.kitchen.printer', 'Printer')}: ${ticket.printer_ip}`
                              : t('pos.kitchen.noPrinterIp', 'No printer IP configured')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {printResult && (
                          printResult.printed
                            ? <span className="flex items-center gap-1 text-sm text-emerald-700"><CheckCircle2 className="w-4 h-4" /> {t('pos.kitchen.printed', 'Sent')}</span>
                            : <span className="flex items-center gap-1 text-sm text-red-700" title={printResult.reason}><AlertTriangle className="w-4 h-4" /> {t('pos.kitchen.failed', 'Failed')}</span>
                        )}
                        <button onClick={() => handleSendOne(ticket.destination_id)}
                          disabled={sending || !ticket.printer_ip}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-semibold disabled:opacity-50">
                          <Send className="w-3 h-3" />
                          {t('pos.kitchen.send', 'Send')}
                        </button>
                      </div>
                    </div>

                    {/* Ticket preview (thermal-width) */}
                    <div className="p-3 font-mono text-sm whitespace-pre-wrap"
                      style={{ width: '80mm', margin: '0 auto', background: 'white' }}>
                      <div className="text-center font-bold text-2xl uppercase leading-tight">{ticket.destination_name}</div>
                      <div className={`text-center font-bold text-sm my-1 ${
                        ticket.kind === 'void' ? 'text-red-700' : ticket.kind === 'refire' ? 'text-amber-700' : 'text-emerald-700'
                      }`}>
                        {t(`pos.kitchen.kind.${ticket.kind}`, ticket.kind).toUpperCase()}
                      </div>
                      <div className="border-t border-dashed my-2" />
                      <div className="text-xs">
                        <div className="font-bold">#{ticket.header.order_number}</div>
                        {ticket.header.table_name && <div>{t('pos.kitchen.table', 'Table')}: {ticket.header.table_name}</div>}
                        {ticket.header.waiter_name && <div>{t('pos.kitchen.waiter', 'Waiter')}: {ticket.header.waiter_name}</div>}
                        {ticket.header.guest_name && <div>{t('pos.kitchen.guest', 'Guest')}: {ticket.header.guest_name}</div>}
                        <div>{t('pos.kitchen.time', 'Time')}: {new Date(ticket.header.now).toLocaleTimeString()}</div>
                      </div>
                      <div className="border-t border-dashed my-2" />
                      {ticket.items.map(it => {
                        const addons = Array.isArray(it.selected_addons) ? it.selected_addons : [];
                        const removed = Array.isArray(it.selected_ingredients)
                          ? it.selected_ingredients.filter((i: any) => i?.removed)
                          : [];
                        return (
                          <div key={it.id} className={`mb-2 ${ticket.kind === 'void' ? 'line-through text-gray-500' : ''}`}>
                            <div className="text-lg font-bold">
                              {it.quantity}× {it.name}
                            </div>
                            {ticket.kind === 'void' && (
                              <div className="text-[11px] font-bold text-red-700 no-underline not-italic">
                                *** {t('pos.kitchen.doNotPrepare', 'CANCELLED — DO NOT PREPARE')} ***
                              </div>
                            )}
                            {it.weighted_portion != null && (
                              <div className="pl-3 text-xs">({it.weighted_portion}g)</div>
                            )}
                            {addons.map((a: any, i: number) => (
                              <div key={i} className="pl-3 text-xs">+ {a?.name || a?.code || ''}{a?.quantity && a.quantity > 1 ? ` ×${a.quantity}` : ''}</div>
                            ))}
                            {removed.map((ing: any, i: number) => (
                              <div key={i} className="pl-3 text-xs">− {ing?.name || ing?.code || ''} (NO)</div>
                            ))}
                            {it.notes && <div className="pl-3 text-xs font-bold">! {it.notes}</div>}
                          </div>
                        );
                      })}
                      {ticket.kind === 'refire' && (
                        <div className="text-center font-bold text-amber-700 text-xs mt-2">
                          ** {t('pos.kitchen.refireBanner', 'REPRINT — ALREADY FIRED')} **
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t bg-white p-3 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {t('pos.kitchen.summary', '{{count}} ticket(s) ready', { count: tickets.length })}
              </div>
              <div className="flex gap-2">
                <button onClick={onClose}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50">
                  {t('common.close', 'Close')}
                </button>
                <button onClick={() => handleSend()} disabled={sending}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold disabled:opacity-50">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {t('pos.kitchen.sendAll', 'Send All')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
