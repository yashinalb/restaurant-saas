import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, X, Printer, RefreshCw } from 'lucide-react';
import posReceiptService, { ReceiptData, ReceiptResponse } from '../../services/frontend-posReceiptService';

interface Props {
  orderId: number;
  onClose: () => void;
}

const num = (v: any) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
};

export default function PosReceiptModal({ orderId, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [data, setData] = useState<ReceiptResponse | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      setLoading(true);
      const fresh = await posReceiptService.get(orderId, i18n.language);
      setData(fresh);
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('pos.receipt.fetchError', 'Failed to load receipt'));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [orderId]);

  const handleBrowserPrint = () => {
    if (!printRef.current) return;
    const html = printRef.current.innerHTML;
    const w = window.open('', 'receipt', 'width=420,height=800');
    if (!w) {
      toast.error(t('pos.receipt.popupBlocked', 'Print popup blocked. Allow popups and try again.'));
      return;
    }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0; padding: 4mm; }
        .r-center { text-align: center; }
        .r-right { text-align: right; }
        .r-bold { font-weight: bold; }
        .r-sep { border-top: 1px dashed #000; margin: 4px 0; }
        .r-row { display: flex; justify-content: space-between; gap: 8px; }
        .r-addon { font-size: 11px; padding-left: 8px; color: #333; }
        .r-note { font-size: 11px; padding-left: 8px; font-style: italic; }
        .r-comp { font-size: 11px; padding-left: 8px; color: #b91c1c; }
        .r-muted { color: #555; font-size: 11px; }
        .r-total { font-weight: bold; font-size: 14px; }
        img.qr { width: 150px; height: 150px; image-rendering: pixelated; }
      </style></head><body>${html}</body></html>`);
    w.document.close();
    // Give images a moment to load
    setTimeout(() => {
      w.focus();
      w.print();
      w.close();
    }, 300);
  };

  const handleThermalPrint = async () => {
    if (!data) return;
    try {
      setPrinting(true);
      const result = await posReceiptService.printThermal(orderId, i18n.language);
      if (result.printed) {
        toast.success(t('pos.receipt.thermalSuccess', 'Sent to printer'));
      } else {
        toast.error(result.reason || t('pos.receipt.thermalFailed', 'Thermal print failed'));
      }
    } catch (error: any) {
      // Fall back to browser print if thermal fails
      const reason = error.response?.data?.reason || error.response?.data?.error;
      toast.message(t('pos.receipt.fallbackToBrowser', 'Thermal print unavailable. Opening browser print…'), {
        description: reason,
      });
      handleBrowserPrint();
    } finally {
      setPrinting(false);
    }
  };

  const r = data?.receipt;
  const sym = r?.order.currency.symbol || r?.order.currency.code || '';
  const money = (n: number) => `${sym}${num(n).toFixed(2)}`;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-gray-600" />
            <h2 className="font-bold text-gray-900">{t('pos.receipt.title', 'Receipt')}</h2>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={load} title={t('common.refresh', 'Refresh')}
              className="p-1 text-gray-500 hover:text-gray-800 rounded hover:bg-gray-100">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
          </div>
        </div>

        {loading || !r ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto bg-gray-100 py-4 px-3">
              {/* Thermal-width receipt preview */}
              <div ref={printRef}
                className="bg-white shadow-sm mx-auto p-3 font-mono text-xs text-gray-900 whitespace-pre-wrap"
                style={{ width: '80mm', minHeight: '200px' }}>
                <ReceiptBody r={r} money={money} t={t} />
              </div>
            </div>

            <div className="border-t bg-white p-3 grid grid-cols-2 gap-2">
              <button onClick={handleBrowserPrint}
                className="py-2 rounded bg-slate-600 hover:bg-slate-700 text-white text-sm font-semibold flex items-center justify-center gap-2">
                <Printer className="w-4 h-4" /> {t('pos.receipt.printBrowser', 'Print (Browser)')}
              </button>
              <button onClick={handleThermalPrint} disabled={printing || !r.store.receipt_printer_ip}
                title={!r.store.receipt_printer_ip ? t('pos.receipt.noPrinterIp', 'No printer IP configured for this store') : ''}
                className="py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                {t('pos.receipt.printThermal', 'Print (Thermal)')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ReceiptBody({ r, money, t }: { r: ReceiptData; money: (n: number) => string; t: any }) {
  const addr2 = [r.store.postal_code, r.store.city].filter(Boolean).join(' ');
  const paymentLabel = (p: any) => `${(p.payment_type_code || 'pay').toUpperCase()} · ${p.currency_code || ''}`;
  const qrImg = r.qr?.url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(r.qr.url)}`
    : null;

  return (
    <>
      <div className="r-center text-center">
        <div className="r-bold font-bold uppercase">{r.store.name || r.tenant.name}</div>
        {r.store.address && <div>{r.store.address}</div>}
        {addr2 && <div>{addr2}</div>}
        {r.store.phone && <div>{r.store.phone}</div>}
      </div>
      <div className="r-sep border-t border-dashed my-1" />

      <div className="r-row flex justify-between">
        <span>#{r.order.order_number}</span>
        <span>{new Date(r.order.created_at).toLocaleString()}</span>
      </div>
      {r.order.table_name && <div>{t('pos.receipt.table', 'Table')}: {r.order.table_name}</div>}
      {r.order.waiter_name && <div>{t('pos.receipt.waiter', 'Waiter')}: {r.order.waiter_name}</div>}
      {r.order.guest_name && <div>{t('pos.receipt.guest', 'Guest')}: {r.order.guest_name}</div>}

      <div className="r-sep border-t border-dashed my-1" />

      {r.items.map(it => {
        const addons = Array.isArray(it.selected_addons) ? it.selected_addons : [];
        const removed = Array.isArray(it.selected_ingredients)
          ? it.selected_ingredients.filter((i: any) => i?.removed)
          : [];
        return (
          <div key={it.id} className="mb-1">
            <div className="r-row flex justify-between">
              <span className="flex-1 truncate pr-2">{it.quantity}× {it.name}</span>
              <span className="r-right text-right">{money(it.total_price)}</span>
            </div>
            {it.is_comp && <div className="r-comp pl-2 text-red-700">({t('pos.receipt.ikram', 'İkram')})</div>}
            {it.weighted_portion != null && (
              <div className="r-muted pl-2 text-gray-600">{t('pos.receipt.weight', 'Weight')}: {it.weighted_portion}g</div>
            )}
            {addons.map((a: any, idx: number) => (
              <div key={idx} className="r-addon pl-2 text-gray-700">
                + {a?.name || a?.code || ''}{a?.quantity && a.quantity > 1 ? ` ×${a.quantity}` : ''}
              </div>
            ))}
            {removed.map((i: any, idx: number) => (
              <div key={idx} className="r-addon pl-2 text-gray-700">− {i?.name || i?.code || ''}</div>
            ))}
            {it.notes && <div className="r-note pl-2 italic">* {it.notes}</div>}
          </div>
        );
      })}

      <div className="r-sep border-t border-dashed my-1" />

      <div className="r-row flex justify-between"><span>{t('pos.receipt.subtotal', 'Subtotal')}</span><span>{money(r.totals.subtotal)}</span></div>
      {r.totals.discount_amount > 0 && (
        <div className="r-row flex justify-between"><span>{t('pos.receipt.discount', 'Discount')}</span><span>−{money(r.totals.discount_amount)}</span></div>
      )}
      {r.totals.service_charge > 0 && (
        <div className="r-row flex justify-between"><span>{t('pos.receipt.service', 'Service')}</span><span>{money(r.totals.service_charge)}</span></div>
      )}
      {r.totals.tax_amount > 0 && (
        <div className="r-row flex justify-between"><span>{t('pos.receipt.tax', 'Tax')}</span><span>{money(r.totals.tax_amount)}</span></div>
      )}
      <div className="r-row r-total flex justify-between font-bold text-base mt-1">
        <span>{t('pos.receipt.total', 'TOTAL')}</span><span>{money(r.totals.total)}</span>
      </div>

      {r.vat_breakdown.some(v => v.vat > 0) && (
        <>
          <div className="r-sep border-t border-dashed my-1" />
          <div className="r-bold font-semibold">{t('pos.receipt.vatBreakdown', 'VAT breakdown')}:</div>
          {r.vat_breakdown.filter(b => b.vat > 0).map(b => (
            <div key={b.rate} className="r-row flex justify-between r-muted text-gray-600">
              <span>{b.rate.toFixed(2)}% · {t('pos.receipt.base', 'base')} {money(b.subtotal)}</span>
              <span>{money(b.vat)}</span>
            </div>
          ))}
        </>
      )}

      {r.payments.length > 0 && (
        <>
          <div className="r-sep border-t border-dashed my-1" />
          <div className="r-bold font-semibold">{t('pos.receipt.payments', 'Payments')}:</div>
          {r.payments.map((p: any, idx: number) => (
            <div key={idx}>
              <div className="r-row flex justify-between">
                <span>{paymentLabel(p)}</span>
                <span>{p.currency_symbol || ''}{num(p.amount).toFixed(2)}</span>
              </div>
              {p.reference_number && <div className="r-muted pl-2 text-gray-600">ref: {p.reference_number}</div>}
            </div>
          ))}
        </>
      )}

      {qrImg && (
        <>
          <div className="r-sep border-t border-dashed my-1" />
          <div className="r-center text-center">
            <div className="text-xs mb-1">{t('pos.receipt.scanToView', 'Scan to view/pay:')}</div>
            <img src={qrImg} alt="QR" className="qr mx-auto" style={{ width: 150, height: 150 }} />
            <div className="r-muted text-[10px] mt-1 break-all">{r.qr!.url}</div>
          </div>
        </>
      )}

      <div className="r-center text-center mt-2">{t('pos.receipt.thankYou', 'Thank you!')}</div>
    </>
  );
}
