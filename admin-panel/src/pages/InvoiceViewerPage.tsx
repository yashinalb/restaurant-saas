import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, Receipt, Clock, AlertTriangle } from 'lucide-react';

interface PublicInvoice {
  store: {
    tenant_name: string | null;
    name: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    phone: string | null;
  };
  order: {
    order_number: string;
    table_name: string | null;
    created_at: string;
    currency: { code: string | null; symbol: string | null };
  };
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    is_paid: boolean;
    addons: Array<{ name: string; qty: number }>;
  }>;
  totals: {
    subtotal: number;
    tax_amount: number;
    service_charge: number;
    discount_amount: number;
    total: number;
    paid: number;
    balance: number;
  };
  payment_status_code: string | null;
  token: { expires_at: string };
}

const num = (v: any) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
};

export default function InvoiceViewerPage() {
  const { t } = useTranslation();
  const [search] = useSearchParams();
  const token = search.get('token') || '';
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError({ message: t('publicInvoice.missingToken', 'No invoice token provided') });
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const resp = await fetch(`/api/public/invoice/${encodeURIComponent(token)}`, { credentials: 'omit' });
        const body = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          setError({ message: body?.error || 'Request failed', code: body?.code });
        } else {
          setInvoice(body.data);
        }
      } catch (e: any) {
        setError({ message: e?.message || 'Network error' });
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-xl shadow p-8 max-w-md text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
            {error.code === 'expired' || error.code === 'used'
              ? <Clock className="w-7 h-7" />
              : <AlertTriangle className="w-7 h-7" />}
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            {error.code === 'expired'
              ? t('publicInvoice.expiredTitle', 'Link expired')
              : error.code === 'used'
                ? t('publicInvoice.usedTitle', 'Link already used')
                : t('publicInvoice.errorTitle', 'Unable to load invoice')}
          </h1>
          <p className="text-sm text-gray-500">
            {error.code === 'expired'
              ? t('publicInvoice.expiredHint', 'Ask your waiter for a fresh QR code.')
              : error.code === 'used'
                ? t('publicInvoice.usedHint', 'This invoice has already been settled.')
                : error.message}
          </p>
        </div>
      </div>
    );
  }

  if (!invoice) return null;
  const sym = invoice.order.currency.symbol || invoice.order.currency.code || '';
  const money = (n: number) => `${sym}${num(n).toFixed(2)}`;
  const statusColor = invoice.payment_status_code === 'paid' ? 'bg-emerald-100 text-emerald-800'
    : invoice.payment_status_code === 'partially_paid' ? 'bg-amber-100 text-amber-800'
    : 'bg-red-100 text-red-800';

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-5 text-center border-b">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
            <Receipt className="w-6 h-6" />
          </div>
          <h1 className="font-bold text-lg text-gray-900">{invoice.store.name || invoice.store.tenant_name}</h1>
          {invoice.store.address && <p className="text-xs text-gray-500">{invoice.store.address}</p>}
          {(invoice.store.postal_code || invoice.store.city) && (
            <p className="text-xs text-gray-500">{[invoice.store.postal_code, invoice.store.city].filter(Boolean).join(' ')}</p>
          )}
          {invoice.store.phone && <p className="text-xs text-gray-500">{invoice.store.phone}</p>}
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div>
              <div className="font-semibold text-gray-900">#{invoice.order.order_number}</div>
              <div className="text-xs text-gray-500">{new Date(invoice.order.created_at).toLocaleString()}</div>
              {invoice.order.table_name && (
                <div className="text-xs text-gray-500">{t('publicInvoice.table', 'Table')}: {invoice.order.table_name}</div>
              )}
            </div>
            <span className={`text-[10px] uppercase px-2 py-1 rounded-full font-semibold ${statusColor}`}>
              {t(`publicInvoice.status.${invoice.payment_status_code || 'unpaid'}`, invoice.payment_status_code || 'unpaid')}
            </span>
          </div>

          <div className="divide-y divide-gray-100 border-y">
            {invoice.items.map((it, idx) => (
              <div key={idx} className={`py-2 text-sm ${it.is_paid ? 'opacity-60' : ''}`}>
                <div className="flex justify-between">
                  <span className="flex-1 pr-2">{it.quantity}× {it.name}{it.is_paid && <span className="text-[10px] ml-2 px-1 bg-emerald-100 text-emerald-700 rounded">{t('publicInvoice.paid', 'PAID')}</span>}</span>
                  <span className="font-semibold">{money(it.total_price)}</span>
                </div>
                {it.addons.length > 0 && (
                  <div className="text-xs text-gray-500 pl-3">
                    {it.addons.map((a, i) => (
                      <span key={i}>+ {a.name}{a.qty > 1 ? ` ×${a.qty}` : ''}{i < it.addons.length - 1 ? ', ' : ''}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-sm space-y-1">
            <div className="flex justify-between text-gray-600"><span>{t('publicInvoice.subtotal', 'Subtotal')}</span><span>{money(invoice.totals.subtotal)}</span></div>
            {invoice.totals.discount_amount > 0 && (
              <div className="flex justify-between text-red-600"><span>{t('publicInvoice.discount', 'Discount')}</span><span>−{money(invoice.totals.discount_amount)}</span></div>
            )}
            {invoice.totals.service_charge > 0 && (
              <div className="flex justify-between text-gray-600"><span>{t('publicInvoice.service', 'Service')}</span><span>{money(invoice.totals.service_charge)}</span></div>
            )}
            {invoice.totals.tax_amount > 0 && (
              <div className="flex justify-between text-gray-600"><span>{t('publicInvoice.tax', 'Tax')}</span><span>{money(invoice.totals.tax_amount)}</span></div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-1 mt-1"><span>{t('publicInvoice.total', 'Total')}</span><span>{money(invoice.totals.total)}</span></div>
            {invoice.totals.paid > 0 && (
              <div className="flex justify-between text-emerald-700"><span>{t('publicInvoice.alreadyPaid', 'Paid')}</span><span>{money(invoice.totals.paid)}</span></div>
            )}
            {invoice.totals.balance > 0 && (
              <div className="flex justify-between font-bold text-red-700 border-t pt-1"><span>{t('publicInvoice.balance', 'Balance')}</span><span>{money(invoice.totals.balance)}</span></div>
            )}
          </div>

          {invoice.totals.balance > 0.005 ? (
            <button disabled
              className="w-full py-3 bg-gray-300 text-gray-600 rounded-lg font-semibold cursor-not-allowed">
              {t('publicInvoice.payComingSoon', 'Pay online · coming soon')}
            </button>
          ) : (
            <div className="w-full py-3 bg-emerald-50 text-emerald-700 rounded-lg font-semibold text-center">
              ✓ {t('publicInvoice.settled', 'Bill settled — thank you!')}
            </div>
          )}

          <div className="text-[10px] text-gray-400 text-center">
            {t('publicInvoice.expiresAt', 'Link expires')}: {new Date(invoice.token.expires_at).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
