import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, X, Trash2, Plus, CreditCard, Coins, Receipt, CheckCircle2 } from 'lucide-react';
import { Order } from '../../services/orderService';
import tenantPaymentTypeService, { TenantPaymentType } from '../../services/tenantPaymentTypeService';
import api from '../../services/api';
import posPaymentService, { PaymentSplitInput, PayResult } from '../../services/frontend-posPaymentService';

interface Currency { id: number; code: string; symbol: string; name: string; }

interface Props {
  order: Order;
  onClose: () => void;
  onPaid: (result: PayResult) => void;
}

type PaymentMode = 'full' | 'partial' | 'per_item' | 'mixed';

interface Split {
  key: string;
  tenant_payment_type_id: number;
  currency_id: number;
  amount: string;
  exchange_rate: string;
  reference_number: string;
}

const num = (v: any) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export default function PosPaymentModal({ order, onClose, onPaid }: Props) {
  const { t, i18n } = useTranslation();

  const [paymentTypes, setPaymentTypes] = useState<TenantPaymentType[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [mode, setMode] = useState<PaymentMode>('full');
  const [tipInput, setTipInput] = useState('');
  const [splits, setSplits] = useState<Split[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<PayResult | null>(null);

  const currencySymbol = order.currency_symbol || '';
  const orderCurrencyId = order.currency_id;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [ptData, currencyResp] = await Promise.all([
          tenantPaymentTypeService.getAll({ is_active: true }).catch(() => []),
          api.get('/api/tenant/currencies').catch(() => ({ data: { data: [] } })),
        ]);
        setPaymentTypes(ptData);
        setCurrencies(currencyResp.data?.data || []);
        // Default split: one full-amount cash (or first payment type) in order currency
        if (ptData.length > 0) {
          setSplits([makeSplit(ptData[0].id, orderCurrencyId, num(order.total))]);
        }
      } catch {
        toast.error(t('pos.payment.fetchError', 'Failed to load payment data'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const subtotal = num(order.subtotal);
  const tax = num(order.tax_amount);
  const serviceCharge = num(order.service_charge);
  const discount = num(order.discount_amount);
  const baseTotal = round2(subtotal + tax + serviceCharge - discount);
  const tip = round2(num(tipInput));
  const totalDue = round2(baseTotal + tip);

  const perItemDue = useMemo(() => {
    if (mode !== 'per_item') return 0;
    return round2((order.items || [])
      .filter(it => !it.is_paid && selectedItemIds.has(it.id))
      .reduce((s, it) => s + num(it.total_price), 0));
  }, [order.items, selectedItemIds, mode]);

  const targetAmount = mode === 'per_item' ? perItemDue : totalDue;

  const splitsTotal = useMemo(() => {
    let sum = 0;
    for (const s of splits) {
      const rate = Number(s.currency_id) === Number(orderCurrencyId) ? 1 : num(s.exchange_rate || '1');
      sum += num(s.amount) * rate;
    }
    return round2(sum);
  }, [splits, orderCurrencyId]);

  const remaining = round2(targetAmount - splitsTotal);
  const change = splitsTotal > targetAmount ? round2(splitsTotal - targetAmount) : 0;

  function makeSplit(paymentTypeId: number, currencyId: number, amount: number): Split {
    return {
      key: Math.random().toString(36).slice(2),
      tenant_payment_type_id: paymentTypeId,
      currency_id: currencyId,
      amount: amount > 0 ? String(amount.toFixed(2)) : '',
      exchange_rate: '1',
      reference_number: '',
    };
  }

  // Re-default the first split's amount when mode or target changes
  useEffect(() => {
    setSplits(prev => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      next[0] = { ...next[0], amount: targetAmount > 0 ? String(targetAmount.toFixed(2)) : '' };
      return next;
    });
  }, [mode, targetAmount]);

  const addSplit = () => {
    if (paymentTypes.length === 0) return;
    const remainingToAdd = Math.max(0, remaining);
    setSplits([...splits, makeSplit(paymentTypes[0].id, orderCurrencyId, remainingToAdd)]);
  };

  const removeSplit = (idx: number) => {
    setSplits(splits.filter((_, i) => i !== idx));
  };

  const updateSplit = (idx: number, patch: Partial<Split>) => {
    setSplits(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const setSplitAmount = (idx: number, amount: number) => {
    updateSplit(idx, { amount: amount > 0 ? String(amount.toFixed(2)) : '' });
  };

  const handleToggleItem = (id: number) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllUnpaid = () => {
    const unpaid = (order.items || []).filter(i => !i.is_paid).map(i => i.id);
    setSelectedItemIds(new Set(unpaid));
  };

  const handleConfirm = async () => {
    if (targetAmount <= 0) {
      toast.error(mode === 'per_item'
        ? t('pos.payment.selectItemsFirst', 'Select items to pay')
        : t('pos.payment.nothingToPay', 'Nothing to pay'));
      return;
    }
    if (splitsTotal < targetAmount - 0.005) {
      toast.error(t('pos.payment.notEnough', 'Payment is less than due'));
      return;
    }

    const paymentsPayload: PaymentSplitInput[] = splits
      .filter(s => num(s.amount) > 0)
      .map(s => ({
        tenant_payment_type_id: s.tenant_payment_type_id,
        currency_id: s.currency_id,
        amount: num(s.amount),
        payment_mode: mode,
        exchange_rate: Number(s.currency_id) === Number(orderCurrencyId) ? null : num(s.exchange_rate || '1'),
        reference_number: s.reference_number.trim() || null,
      }));

    if (paymentsPayload.length === 0) {
      toast.error(t('pos.payment.addSplit', 'Add at least one payment split'));
      return;
    }

    try {
      setSaving(true);
      const res = await posPaymentService.pay(order.id, {
        payments: paymentsPayload,
        tip_amount: tip,
        item_ids: mode === 'per_item' ? Array.from(selectedItemIds) : undefined,
      });
      setResult(res);
      onPaid(res);
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('pos.payment.error', 'Payment failed'));
    } finally {
      setSaving(false);
    }
  };

  const ptName = (pt: TenantPaymentType) => {
    const trans = (pt as any).translations as Array<{ language_code?: string; name: string }> | undefined;
    if (!trans?.length) return pt.code;
    return trans.find(tr => tr.language_code === i18n.language)?.name
      || trans.find(tr => tr.language_code === 'en')?.name
      || trans[0].name
      || pt.code;
  };

  // Success screen (after payment)
  if (result) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 mx-auto mb-4 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{t('pos.payment.successTitle', 'Payment recorded')}</h2>
          <p className="text-sm text-gray-500 mb-6">
            {result.order_status === 'closed' ? t('pos.payment.orderClosed', 'Order is now closed.') : t('pos.payment.partialPaid', 'Partial payment applied. Order remains open.')}
          </p>
          <div className="bg-slate-50 rounded-lg p-4 space-y-1 text-left mb-6">
            <div className="flex justify-between text-sm"><span className="text-gray-500">{t('pos.payment.paid', 'Paid')}</span><span className="font-semibold">{currencySymbol}{result.total_paid.toFixed(2)}</span></div>
            {result.change > 0 && (
              <div className="flex justify-between text-lg font-bold text-green-700 border-t pt-2 mt-2">
                <span>{t('pos.payment.change', 'Change')}</span>
                <span>{currencySymbol}{result.change.toFixed(2)}</span>
              </div>
            )}
          </div>
          <button onClick={onClose}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold">
            {t('common.done', 'Done')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-gray-900">{t('pos.payment.title', 'Payment')} · {order.order_number}</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden grid grid-cols-[1fr_360px]">
            {/* LEFT: payment configuration */}
            <div className="overflow-y-auto p-5 space-y-5">
              {/* Mode tabs */}
              <div className="flex gap-1 border border-gray-200 rounded-lg overflow-hidden">
                {(['full', 'partial', 'per_item', 'mixed'] as PaymentMode[]).map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`flex-1 py-2 text-sm font-medium transition ${
                      mode === m ? 'bg-amber-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}>
                    {t(`pos.payment.mode.${m}`, m)}
                  </button>
                ))}
              </div>

              {/* Per-item picker */}
              {mode === 'per_item' && (
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase">{t('pos.payment.selectItems', 'Select items to pay')}</h3>
                    <button onClick={selectAllUnpaid} className="text-xs text-amber-600 hover:underline">
                      {t('pos.payment.selectAllUnpaid', 'Select all unpaid')}
                    </button>
                  </div>
                  <div className="border border-gray-200 rounded-lg divide-y max-h-48 overflow-y-auto">
                    {(order.items || []).map(it => (
                      <button key={it.id}
                        onClick={() => !it.is_paid && handleToggleItem(it.id)}
                        disabled={!!it.is_paid}
                        className={`w-full flex items-center justify-between gap-2 p-2 text-left transition ${
                          it.is_paid ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                            : selectedItemIds.has(it.id) ? 'bg-amber-50' : 'hover:bg-gray-50'
                        }`}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={`w-4 h-4 rounded border-2 flex-shrink-0 ${
                            it.is_paid ? 'bg-green-500 border-green-500'
                              : selectedItemIds.has(it.id) ? 'bg-amber-500 border-amber-500' : 'border-gray-300'
                          }`} />
                          <span className="text-sm truncate">
                            {it.quantity}× {(it as any).menu_item_name || `Item #${it.tenant_menu_item_id}`}
                          </span>
                        </div>
                        <span className="text-sm font-semibold">{currencySymbol}{num(it.total_price).toFixed(2)}</span>
                      </button>
                    ))}
                    {(order.items || []).length === 0 && (
                      <div className="p-4 text-center text-sm text-gray-400">{t('pos.payment.noItems', 'No items')}</div>
                    )}
                  </div>
                </section>
              )}

              {/* Tip */}
              {mode !== 'per_item' && (
                <section>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('pos.payment.tip', 'Tip')}
                  </label>
                  <div className="flex gap-2">
                    <input type="number" step="0.01" value={tipInput} onChange={e => setTipInput(e.target.value)}
                      placeholder="0.00"
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" />
                    {[5, 10, 15, 20].map(pct => (
                      <button key={pct}
                        onClick={() => setTipInput((baseTotal * pct / 100).toFixed(2))}
                        className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded">
                        {pct}%
                      </button>
                    ))}
                    {tip > 0 && (
                      <button onClick={() => setTipInput('')}
                        className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded">
                        {t('common.clear', 'Clear')}
                      </button>
                    )}
                  </div>
                </section>
              )}

              {/* Payment splits */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase">{t('pos.payment.splits', 'Payment splits')}</h3>
                  <button onClick={addSplit}
                    className="text-sm text-amber-600 hover:text-amber-800 flex items-center gap-1">
                    <Plus className="w-4 h-4" /> {t('pos.payment.addSplit', 'Add split')}
                  </button>
                </div>
                <div className="space-y-2">
                  {splits.map((split, idx) => {
                    const foreign = Number(split.currency_id) !== Number(orderCurrencyId);
                    return (
                      <div key={split.key} className="border border-gray-200 rounded-lg p-3 space-y-2">
                        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                          <select value={split.tenant_payment_type_id}
                            onChange={e => updateSplit(idx, { tenant_payment_type_id: Number(e.target.value) })}
                            className="px-3 py-2 border border-gray-300 rounded text-sm">
                            {paymentTypes.map(pt => (
                              <option key={pt.id} value={pt.id}>{ptName(pt)}</option>
                            ))}
                          </select>
                          <select value={split.currency_id}
                            onChange={e => updateSplit(idx, { currency_id: Number(e.target.value) })}
                            className="px-3 py-2 border border-gray-300 rounded text-sm">
                            {currencies.map(c => (
                              <option key={c.id} value={c.id}>{c.code} ({c.symbol})</option>
                            ))}
                          </select>
                          <button onClick={() => removeSplit(idx)} disabled={splits.length <= 1}
                            className="w-9 h-9 rounded border border-gray-300 text-red-600 hover:bg-red-50 flex items-center justify-center disabled:opacity-30">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input type="number" step="0.01" value={split.amount}
                            onChange={e => updateSplit(idx, { amount: e.target.value })}
                            placeholder="0.00"
                            className="px-3 py-2 border border-gray-300 rounded text-lg font-semibold focus:ring-2 focus:ring-amber-500" />
                          {foreign && (
                            <input type="number" step="0.0001" value={split.exchange_rate}
                              onChange={e => updateSplit(idx, { exchange_rate: e.target.value })}
                              placeholder={t('pos.payment.exchangeRate', 'Rate')}
                              className="px-3 py-2 border border-gray-300 rounded text-sm" />
                          )}
                          <input type="text" value={split.reference_number}
                            onChange={e => updateSplit(idx, { reference_number: e.target.value })}
                            placeholder={t('pos.payment.reference', 'Reference')}
                            className={`px-3 py-2 border border-gray-300 rounded text-sm ${foreign ? '' : 'col-span-2'}`} />
                        </div>
                        {foreign && num(split.amount) > 0 && (
                          <div className="text-xs text-gray-500">
                            ≈ {currencySymbol}{(num(split.amount) * num(split.exchange_rate || '1')).toFixed(2)} {t('pos.payment.inOrderCurrency', '(in order currency)')}
                          </div>
                        )}
                        {/* Quick amount presets */}
                        <div className="flex gap-1 pt-1">
                          {[remaining, targetAmount].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map(v => (
                            <button key={v} onClick={() => setSplitAmount(idx, v)}
                              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">
                              {currencySymbol}{v.toFixed(2)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* RIGHT: bill summary */}
            <div className="border-l bg-slate-50 p-5 flex flex-col gap-3 overflow-y-auto">
              <div className="flex items-center gap-2 mb-1">
                <Receipt className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700 uppercase">{t('pos.payment.summary', 'Summary')}</h3>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between text-gray-600"><span>{t('pos.payment.subtotal', 'Subtotal')}</span><span>{currencySymbol}{subtotal.toFixed(2)}</span></div>
                {tax > 0 && <div className="flex justify-between text-gray-600"><span>{t('pos.payment.tax', 'Tax')}</span><span>{currencySymbol}{tax.toFixed(2)}</span></div>}
                {serviceCharge > 0 && <div className="flex justify-between text-gray-600"><span>{t('pos.payment.service', 'Service')}</span><span>{currencySymbol}{serviceCharge.toFixed(2)}</span></div>}
                {discount > 0 && <div className="flex justify-between text-red-600"><span>{t('pos.payment.discount', 'Discount')}</span><span>−{currencySymbol}{discount.toFixed(2)}</span></div>}
                {tip > 0 && <div className="flex justify-between text-emerald-700"><span>{t('pos.payment.tip', 'Tip')}</span><span>+{currencySymbol}{tip.toFixed(2)}</span></div>}
              </div>
              <div className="border-t pt-2 flex justify-between text-base font-bold text-gray-900">
                <span>{t('pos.payment.total', 'Total')}</span>
                <span>{currencySymbol}{totalDue.toFixed(2)}</span>
              </div>
              {mode === 'per_item' && (
                <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs">
                  <div className="font-semibold text-amber-900">{t('pos.payment.perItemDue', 'Per-item due')}</div>
                  <div className="text-lg font-bold text-amber-700">{currencySymbol}{perItemDue.toFixed(2)}</div>
                </div>
              )}
              <div className="bg-white border border-gray-200 rounded p-3 space-y-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{t('pos.payment.target', 'Target')}</span>
                  <span className="font-semibold">{currencySymbol}{targetAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('pos.payment.paying', 'Paying')}</span>
                  <span className="font-semibold">{currencySymbol}{splitsTotal.toFixed(2)}</span>
                </div>
                {remaining > 0.005 ? (
                  <div className="flex justify-between text-sm font-semibold text-red-700">
                    <span>{t('pos.payment.remaining', 'Remaining')}</span>
                    <span>{currencySymbol}{remaining.toFixed(2)}</span>
                  </div>
                ) : change > 0.005 ? (
                  <div className="flex justify-between text-sm font-semibold text-emerald-700 border-t pt-1">
                    <span className="flex items-center gap-1"><Coins className="w-4 h-4" /> {t('pos.payment.change', 'Change')}</span>
                    <span>{currencySymbol}{change.toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="text-xs text-emerald-700 font-semibold text-center pt-1">
                    ✓ {t('pos.payment.balanced', 'Balanced')}
                  </div>
                )}
              </div>

              <div className="flex-1" />
              <button onClick={handleConfirm}
                disabled={saving || splitsTotal < targetAmount - 0.005 || targetAmount <= 0}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>
                  <CheckCircle2 className="w-5 h-5" />
                  {t('pos.payment.charge', 'Charge')}
                </>}
              </button>
              <button onClick={onClose}
                className="w-full py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100">
                {t('common.cancel', 'Cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
