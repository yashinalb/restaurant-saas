import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Wallet, Unlock, Lock, Loader2, X } from 'lucide-react';
import api from '../../services/api';
import posShiftService, { PosShiftStatus } from '../../services/frontend-posShiftService';

interface Currency { id: number; code: string; symbol: string; name: string; }

interface Props {
  storeId: number;
  storeName?: string | null;
  // If null, the badge uses the tenant default currency discovered via /api/tenant/currencies.
  currencyId?: number | null;
  onChange?: (status: PosShiftStatus) => void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: any) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
};

export default function PosShiftBadge({ storeId, storeName, currencyId, onChange }: Props) {
  const { t } = useTranslation();

  const [resolvedCurrencyId, setResolvedCurrencyId] = useState<number | null>(currencyId ?? null);
  const [currencySymbol, setCurrencySymbol] = useState('');
  const [status, setStatus] = useState<PosShiftStatus>({ session: null, reconciliation: null });
  const [loading, setLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Open-shift form
  const [openAmount, setOpenAmount] = useState('');
  const [openNotes, setOpenNotes] = useState('');
  // Close-shift form
  const [closingAmount, setClosingAmount] = useState('');
  const [overrideExpected, setOverrideExpected] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  // Resolve default currency when not provided
  useEffect(() => {
    if (currencyId) {
      setResolvedCurrencyId(currencyId);
      return;
    }
    (async () => {
      try {
        const resp = await api.get('/api/tenant/currencies');
        const list: Currency[] = resp.data?.data || [];
        if (list.length > 0) {
          setResolvedCurrencyId(list[0].id);
          setCurrencySymbol(list[0].symbol || list[0].code);
        }
      } catch {
        /* noop */
      }
    })();
  }, [currencyId]);

  const refresh = async () => {
    if (!storeId || !resolvedCurrencyId) return;
    try {
      setLoading(true);
      const fresh = await posShiftService.getActive(storeId, resolvedCurrencyId);
      setStatus(fresh);
      if (fresh.session?.currency_symbol) setCurrencySymbol(fresh.session.currency_symbol);
      onChange?.(fresh);
    } catch {
      // Silent — the badge is ambient
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [storeId, resolvedCurrencyId]);

  const active = !!status.session;

  const openShift = async () => {
    if (!resolvedCurrencyId) return;
    const amount = num(openAmount);
    if (amount < 0) { toast.error(t('pos.shift.openAmountInvalid', 'Opening amount must be zero or more')); return; }
    try {
      setSaving(true);
      await posShiftService.open({
        store_id: storeId,
        currency_id: resolvedCurrencyId,
        opening_amount: amount,
        notes: openNotes.trim() || null,
      });
      toast.success(t('pos.shift.opened', 'Shift opened'));
      setShowOpenModal(false);
      setOpenAmount('');
      setOpenNotes('');
      await refresh();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('pos.shift.openFailed', 'Failed to open shift'));
    } finally {
      setSaving(false);
    }
  };

  const closeShift = async () => {
    if (!resolvedCurrencyId) return;
    const amount = num(closingAmount);
    if (amount < 0) { toast.error(t('pos.shift.closingAmountInvalid', 'Counted amount must be zero or more')); return; }
    try {
      setSaving(true);
      const result = await posShiftService.close({
        store_id: storeId,
        currency_id: resolvedCurrencyId,
        closing_amount: amount,
        expected_amount: overrideExpected ? num(overrideExpected) : null,
        notes: closeNotes.trim() || null,
      });
      const diff = round2(result.difference);
      toast.success(t('pos.shift.closedToast', 'Shift closed · Difference {{sym}}{{diff}}', { sym: currencySymbol, diff: diff.toFixed(2) }));
      setShowCloseModal(false);
      setClosingAmount('');
      setOverrideExpected('');
      setCloseNotes('');
      await refresh();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('pos.shift.closeFailed', 'Failed to close shift'));
    } finally {
      setSaving(false);
    }
  };

  if (!storeId || !resolvedCurrencyId) return null;

  return (
    <>
      <button onClick={() => (active ? setShowCloseModal(true) : setShowOpenModal(true))}
        disabled={loading}
        title={active
          ? t('pos.shift.openTooltip', 'Shift open — click to close')
          : t('pos.shift.closedTooltip', 'No shift — click to open')}
        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold ${
          active ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white animate-pulse'
        }`}>
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wallet className="w-3 h-3" />}
        <span className="hidden md:inline">
          {active ? t('pos.shift.open', 'Shift Open') : t('pos.shift.closed', 'Shift Closed')}
        </span>
      </button>

      {/* Open shift modal */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
              <div className="flex items-center gap-2"><Unlock className="w-5 h-5 text-emerald-600" /><h2 className="font-bold">{t('pos.shift.openTitle', 'Open Shift')}</h2></div>
              <button onClick={() => setShowOpenModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-500">
                {t('pos.shift.openHelp', 'Count the cash currently in the drawer for {{store}}.', { store: storeName || '' })}
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('pos.shift.openingAmount', 'Opening Amount')} ({currencySymbol})</label>
                <input type="number" step="0.01" value={openAmount} onChange={e => setOpenAmount(e.target.value)} autoFocus
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-lg font-semibold focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('pos.shift.notes', 'Notes')}</label>
                <textarea value={openNotes} onChange={e => setOpenNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t bg-slate-50">
              <button onClick={() => setShowOpenModal(false)} className="px-3 py-2 text-gray-700 border border-gray-300 rounded">{t('common.cancel', 'Cancel')}</button>
              <button onClick={openShift} disabled={saving || !openAmount}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                {t('pos.shift.openSubmit', 'Open Shift')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close shift modal — reconciliation */}
      {showCloseModal && status.session && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
              <div className="flex items-center gap-2"><Lock className="w-5 h-5 text-amber-600" /><h2 className="font-bold">{t('pos.shift.closeTitle', 'Close Shift')}</h2></div>
              <button onClick={() => setShowCloseModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="bg-slate-50 rounded p-3 space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">{t('pos.shift.opening', 'Opening')}</span><span className="font-semibold">{currencySymbol}{num(status.session.opening_amount).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{t('pos.shift.cashReceived', 'Cash received (this shift)')}</span><span className="font-semibold">{currencySymbol}{num(status.reconciliation?.cash_received ?? 0).toFixed(2)}</span></div>
                <div className="flex justify-between border-t pt-1 mt-1"><span className="text-gray-700">{t('pos.shift.expected', 'Expected in drawer')}</span><span className="font-bold">{currencySymbol}{num(status.reconciliation?.expected ?? 0).toFixed(2)}</span></div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('pos.shift.countedAmount', 'Counted amount')} ({currencySymbol}) *</label>
                <input type="number" step="0.01" value={closingAmount} onChange={e => setClosingAmount(e.target.value)} autoFocus
                  className="w-full px-3 py-2 border border-gray-300 rounded text-lg font-semibold focus:ring-2 focus:ring-amber-500" />
              </div>
              <details className="text-xs text-gray-500">
                <summary className="cursor-pointer">{t('pos.shift.overrideExpected', 'Override expected amount')}</summary>
                <input type="number" step="0.01" value={overrideExpected} onChange={e => setOverrideExpected(e.target.value)}
                  placeholder={String(num(status.reconciliation?.expected ?? 0).toFixed(2))}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded text-sm" />
              </details>
              {closingAmount && (
                <div className={`p-2 rounded text-center text-sm font-semibold ${
                  num(closingAmount) - num(overrideExpected || status.reconciliation?.expected || 0) === 0 ? 'bg-gray-100 text-gray-700'
                  : num(closingAmount) - num(overrideExpected || status.reconciliation?.expected || 0) > 0 ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-700'
                }`}>
                  {t('pos.shift.difference', 'Difference')}: {currencySymbol}{(num(closingAmount) - num(overrideExpected || status.reconciliation?.expected || 0)).toFixed(2)}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('pos.shift.notes', 'Notes')}</label>
                <textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t bg-slate-50">
              <button onClick={() => setShowCloseModal(false)} className="px-3 py-2 text-gray-700 border border-gray-300 rounded">{t('common.cancel', 'Cancel')}</button>
              <button onClick={closeShift} disabled={saving || !closingAmount}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {t('pos.shift.closeSubmit', 'Close Shift')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
