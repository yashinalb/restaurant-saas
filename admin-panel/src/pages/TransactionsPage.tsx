import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2, Eye } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import api from './../services/api';
import transactionService, { Transaction, TransactionInput, PaymentInput, PaymentMode } from '../services/transactionService';
import { storeService, Store } from '../services/storeService';
import orderService, { Order } from '../services/orderService';
import tenantPaymentStatusService, { TenantPaymentStatus } from '../services/tenantPaymentStatusService';
import tenantPaymentTypeService, { TenantPaymentType } from '../services/tenantPaymentTypeService';

const PAYMENT_MODES: PaymentMode[] = ['full', 'partial', 'per_item', 'mixed'];

interface Currency { id: number; code: string; symbol: string; name: string }

const num = (v: any) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
};

export default function TransactionsPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();

  const canCreate = hasPermission('transactions.create');
  const canEdit = hasPermission('transactions.edit');
  const canDelete = hasPermission('transactions.delete');

  const getTranslatedName = (translations: Array<{ language_code?: string; name: string }> | undefined, fallback = '-') => {
    if (!translations || translations.length === 0) return fallback;
    return translations.find(tr => tr.language_code === i18n.language)?.name
      || translations.find(tr => tr.language_code === 'en')?.name
      || translations[0].name
      || fallback;
  };

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<TenantPaymentStatus[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<TenantPaymentType[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Transaction | null>(null);

  const [filterStoreId, setFilterStoreId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  const [formStoreId, setFormStoreId] = useState(0);
  const [formOrderId, setFormOrderId] = useState(0);
  const [formStatusId, setFormStatusId] = useState(0);
  const [formCurrencyId, setFormCurrencyId] = useState(0);
  const [formAmountBeforeVat, setFormAmountBeforeVat] = useState(0);
  const [formVatAmount, setFormVatAmount] = useState(0);
  const [formServiceCharge, setFormServiceCharge] = useState(0);
  const [formTotalAmount, setFormTotalAmount] = useState(0);
  const [formNotes, setFormNotes] = useState('');
  const [formPayments, setFormPayments] = useState<PaymentInput[]>([]);

  if (!selectedTenant) {
    return <div className="p-6 text-center text-gray-500">{t('common.selectTenantFirst', 'Please select a tenant first')}</div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const filters: Record<string, any> = {};
      if (filterStoreId) filters.store_id = filterStoreId;
      if (filterStatus) filters.tenant_payment_status_id = filterStatus;
      if (filterFromDate) filters.from_date = filterFromDate;
      if (filterToDate) filters.to_date = filterToDate;

      const [txnData, storesData, ordersData, statusData, typeData, currResp] = await Promise.all([
        transactionService.getAll(filters),
        storeService.getAll().catch(() => []),
        orderService.getAll({ limit: 500 }).catch(() => []),
        tenantPaymentStatusService.getAll().catch(() => []),
        tenantPaymentTypeService.getAll().catch(() => []),
        api.get('/api/tenant/currencies').catch(() => ({ data: { data: [] } })),
      ]);
      setTransactions(txnData);
      setStores(Array.isArray(storesData) ? storesData : []);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setPaymentStatuses(statusData);
      setPaymentTypes(typeData);
      setCurrencies((currResp as any).data?.data || []);
    } catch {
      toast.error(t('transactions.fetchError', 'Failed to load transactions'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedTenant?.id, filterStoreId, filterStatus, filterFromDate, filterToDate]);

  const ordersForStore = (storeId: number) => orders.filter(o => o.store_id === storeId);

  const resetForm = () => {
    setFormStoreId(0); setFormOrderId(0); setFormStatusId(0); setFormCurrencyId(currencies[0]?.id ?? 0);
    setFormAmountBeforeVat(0); setFormVatAmount(0); setFormServiceCharge(0); setFormTotalAmount(0);
    setFormNotes(''); setFormPayments([]);
  };

  const handleCreate = () => {
    setEditingId(null);
    resetForm();
    setShowModal(true);
  };

  const handleEdit = async (id: number) => {
    try {
      const txn = await transactionService.getById(id);
      setEditingId(txn.id);
      setFormStoreId(txn.store_id);
      setFormOrderId(txn.order_id);
      setFormStatusId(txn.tenant_payment_status_id);
      setFormCurrencyId(txn.currency_id);
      setFormAmountBeforeVat(num(txn.amount_before_vat));
      setFormVatAmount(num(txn.vat_amount));
      setFormServiceCharge(num(txn.service_charge));
      setFormTotalAmount(num(txn.total_amount));
      setFormNotes(txn.notes || '');
      setFormPayments((txn.payments || []).map(p => ({
        tenant_payment_type_id: p.tenant_payment_type_id,
        currency_id: p.currency_id,
        amount: num(p.amount),
        amount_due: p.amount_due != null ? num(p.amount_due) : null,
        payment_mode: p.payment_mode,
        paid_items: p.paid_items,
        exchange_rate: p.exchange_rate != null ? num(p.exchange_rate) : null,
        reference_number: p.reference_number,
        notes: p.notes,
      })));
      setShowModal(true);
    } catch {
      toast.error(t('transactions.fetchError', 'Failed to load'));
    }
  };

  const handleView = async (id: number) => {
    try {
      const txn = await transactionService.getById(id);
      setDetail(txn);
      setShowDetailModal(true);
    } catch {
      toast.error(t('transactions.fetchError', 'Failed to load'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('transactions.confirmDelete', 'Delete this transaction?'))) return;
    try {
      await transactionService.delete(id);
      toast.success(t('transactions.deleted', 'Deleted'));
      fetchData();
    } catch {
      toast.error(t('transactions.deleteError', 'Failed to delete'));
    }
  };

  const addPayment = () => {
    setFormPayments(prev => [...prev, {
      tenant_payment_type_id: paymentTypes[0]?.id ?? 0,
      currency_id: formCurrencyId || currencies[0]?.id || 0,
      amount: 0,
      amount_due: null,
      payment_mode: 'full',
      paid_items: null,
      exchange_rate: null,
      reference_number: null,
      notes: null,
    }]);
  };

  const updatePayment = (idx: number, patch: Partial<PaymentInput>) => {
    setFormPayments(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
  };

  const removePayment = (idx: number) => {
    setFormPayments(prev => prev.filter((_, i) => i !== idx));
  };

  const computedPaid = formPayments.reduce((s, p) => {
    const rate = p.currency_id === formCurrencyId ? 1 : (num(p.exchange_rate) || 1);
    return s + num(p.amount) * rate;
  }, 0);
  const computedRemaining = num(formTotalAmount) - computedPaid;

  const handleSave = async () => {
    if (!formStoreId) { toast.error(t('transactions.storeRequired', 'Store is required')); return; }
    if (!formOrderId) { toast.error(t('transactions.orderRequired', 'Order is required')); return; }
    if (!formStatusId) { toast.error(t('transactions.statusRequired', 'Payment status is required')); return; }
    if (!formCurrencyId) { toast.error(t('transactions.currencyRequired', 'Currency is required')); return; }

    try {
      setSaving(true);
      const payload: TransactionInput = {
        store_id: formStoreId,
        order_id: formOrderId,
        tenant_payment_status_id: formStatusId,
        currency_id: formCurrencyId,
        amount_before_vat: formAmountBeforeVat,
        vat_amount: formVatAmount,
        service_charge: formServiceCharge,
        total_amount: formTotalAmount,
        notes: formNotes || null,
        payments: formPayments.filter(p => p.tenant_payment_type_id && p.currency_id),
      };
      if (editingId) {
        await transactionService.update(editingId, payload);
        toast.success(t('transactions.updated', 'Updated'));
      } else {
        await transactionService.create(payload);
        toast.success(t('transactions.created', 'Created'));
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('transactions.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const availableOrders = ordersForStore(formStoreId);
  const currencySymbol = currencies.find(c => c.id === formCurrencyId)?.symbol || '';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('transactions.title', 'Transactions')}</h1>
        {canCreate && (
          <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> {t('transactions.add', 'New Transaction')}
          </button>
        )}
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filterStoreId} onChange={e => setFilterStoreId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">{t('transactions.allStores', 'All Stores')}</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">{t('transactions.allStatuses', 'All Statuses')}</option>
          {paymentStatuses.map(p => <option key={p.id} value={p.id}>{getTranslatedName(p.translations, p.code)}</option>)}
        </select>
        <input type="date" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg" />
        <input type="date" value={filterToDate} onChange={e => setFilterToDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.id', '#')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.createdAt', 'Date')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.store', 'Store')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.order', 'Order')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.total', 'Total')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.paid', 'Paid')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.remaining', 'Remaining')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.statusLabel', 'Status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map(txn => (
                <tr key={txn.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">#{txn.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(txn.created_at).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{txn.store_name || '-'}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{txn.order_number || `#${txn.order_id}`}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{num(txn.total_amount).toFixed(2)} {txn.currency_code || ''}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{num(txn.total_paid).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{num(txn.amount_remaining).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                      {txn.payment_status_code || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleView(txn.id)} className="text-gray-600 hover:text-gray-900 mr-3"><Eye className="w-4 h-4" /></button>
                    {canEdit && <button onClick={() => handleEdit(txn.id)} className="text-blue-600 hover:text-blue-800 mr-3"><Pencil className="w-4 h-4" /></button>}
                    {canDelete && <button onClick={() => handleDelete(txn.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">{t('transactions.empty', 'No transactions found')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{editingId ? t('transactions.edit', 'Edit Transaction') : t('transactions.add', 'New Transaction')}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('transactions.store', 'Store')} *</label>
                  <select value={formStoreId} onChange={e => { setFormStoreId(Number(e.target.value)); setFormOrderId(0); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value={0}>{t('common.selectOne', 'Select...')}</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('transactions.order', 'Order')} *</label>
                  <select value={formOrderId} onChange={e => setFormOrderId(Number(e.target.value))}
                    disabled={!formStoreId} className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100">
                    <option value={0}>{t('common.selectOne', 'Select...')}</option>
                    {availableOrders.map(o => <option key={o.id} value={o.id}>{o.order_number} — {num(o.total).toFixed(2)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('transactions.statusLabel', 'Payment Status')} *</label>
                  <select value={formStatusId} onChange={e => setFormStatusId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value={0}>{t('common.selectOne', 'Select...')}</option>
                    {paymentStatuses.map(s => <option key={s.id} value={s.id}>{getTranslatedName(s.translations, s.code)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('transactions.currency', 'Currency')} *</label>
                  <select value={formCurrencyId} onChange={e => setFormCurrencyId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value={0}>{t('common.selectOne', 'Select...')}</option>
                    {currencies.map(c => <option key={c.id} value={c.id}>{c.code} {c.symbol}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('transactions.amountBeforeVat', 'Amount Before VAT')} *</label>
                  <input type="number" step="0.01" value={formAmountBeforeVat} onChange={e => setFormAmountBeforeVat(num(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('transactions.vatAmount', 'VAT')} *</label>
                  <input type="number" step="0.01" value={formVatAmount} onChange={e => setFormVatAmount(num(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('transactions.serviceCharge', 'Service')}</label>
                  <input type="number" step="0.01" value={formServiceCharge} onChange={e => setFormServiceCharge(num(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('transactions.totalAmount', 'Total')} *</label>
                  <input type="number" step="0.01" value={formTotalAmount} onChange={e => setFormTotalAmount(num(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('transactions.notes', 'Notes')}</label>
                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">{t('transactions.payments', 'Payments')}</label>
                  <button type="button" onClick={addPayment} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> {t('transactions.addPayment', 'Add Payment')}
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.paymentType', 'Type')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">{t('transactions.modeLabel', 'Mode')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">{t('transactions.amount', 'Amount')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">{t('transactions.currency', 'Currency')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">{t('transactions.exchangeRate', 'Rate')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.reference', 'Reference')}</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {formPayments.map((p, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">
                            <select value={p.tenant_payment_type_id} onChange={e => updatePayment(idx, { tenant_payment_type_id: Number(e.target.value) })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                              <option value={0}>{t('common.selectOne', 'Select...')}</option>
                              {paymentTypes.map(pt => <option key={pt.id} value={pt.id}>{getTranslatedName(pt.translations, pt.code)}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select value={p.payment_mode} onChange={e => updatePayment(idx, { payment_mode: e.target.value as PaymentMode })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                              {PAYMENT_MODES.map(m => <option key={m} value={m}>{t(`transactions.mode.${m}`, m)}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" step="0.01" value={p.amount} onChange={e => updatePayment(idx, { amount: num(e.target.value) })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                          </td>
                          <td className="px-3 py-2">
                            <select value={p.currency_id} onChange={e => updatePayment(idx, { currency_id: Number(e.target.value) })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                              <option value={0}>{t('common.selectOne', 'Select...')}</option>
                              {currencies.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" step="0.000001" value={p.exchange_rate ?? ''} onChange={e => updatePayment(idx, { exchange_rate: e.target.value ? num(e.target.value) : null })}
                              disabled={p.currency_id === formCurrencyId}
                              placeholder={p.currency_id === formCurrencyId ? '1' : ''}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="text" value={p.reference_number ?? ''} onChange={e => updatePayment(idx, { reference_number: e.target.value || null })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                          </td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => removePayment(idx)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                      {formPayments.length === 0 && (
                        <tr><td colSpan={7} className="px-3 py-4 text-center text-gray-500 text-sm">{t('transactions.noPayments', 'No payments yet. Click "Add Payment" to begin.')}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">{t('transactions.totalAmount', 'Total')}</span><span className="font-medium">{num(formTotalAmount).toFixed(2)} {currencySymbol}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{t('transactions.paid', 'Paid')}</span><span>{computedPaid.toFixed(2)}</span></div>
                  <div className="flex justify-between pt-2 border-t text-base font-semibold"><span>{t('transactions.remaining', 'Remaining')}</span><span>{computedRemaining.toFixed(2)} {currencySymbol}</span></div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">{t('common.cancel', 'Cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{t('transactions.detailTitle', 'Transaction')} #{detail.id}</h2>
              <button onClick={() => setShowDetailModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-4">
                <div><span className="text-gray-500">{t('transactions.store', 'Store')}:</span> <span className="font-medium">{detail.store_name || '-'}</span></div>
                <div><span className="text-gray-500">{t('transactions.order', 'Order')}:</span> <span className="font-medium font-mono">{detail.order_number || `#${detail.order_id}`}</span></div>
                <div><span className="text-gray-500">{t('transactions.statusLabel', 'Status')}:</span> <span className="font-medium">{detail.payment_status_code || '-'}</span></div>
                <div><span className="text-gray-500">{t('transactions.createdAt', 'Date')}:</span> <span className="font-medium">{new Date(detail.created_at).toLocaleString()}</span></div>
                <div><span className="text-gray-500">{t('transactions.currency', 'Currency')}:</span> <span className="font-medium">{detail.currency_code} {detail.currency_symbol}</span></div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.paymentType', 'Type')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.modeLabel', 'Mode')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.amount', 'Amount')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.currency', 'Currency')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.exchangeRate', 'Rate')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.reference', 'Reference')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(detail.payments || []).map(p => (
                      <tr key={p.id}>
                        <td className="px-3 py-2">{p.payment_type_code || `#${p.tenant_payment_type_id}`}</td>
                        <td className="px-3 py-2">{t(`transactions.mode.${p.payment_mode}`, p.payment_mode)}</td>
                        <td className="px-3 py-2 font-medium">{num(p.amount).toFixed(2)} {p.payment_currency_symbol || ''}</td>
                        <td className="px-3 py-2">{p.payment_currency_code || '-'}</td>
                        <td className="px-3 py-2">{p.exchange_rate ? num(p.exchange_rate).toFixed(6) : '-'}</td>
                        <td className="px-3 py-2 text-gray-500">{p.reference_number || '-'}</td>
                      </tr>
                    ))}
                    {(detail.payments || []).length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-500">{t('transactions.noPayments', 'No payments')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-1">
                  <div className="flex justify-between"><span className="text-gray-500">{t('transactions.amountBeforeVat', 'Before VAT')}</span><span>{num(detail.amount_before_vat).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{t('transactions.vatAmount', 'VAT')}</span><span>{num(detail.vat_amount).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{t('transactions.serviceCharge', 'Service')}</span><span>{num(detail.service_charge).toFixed(2)}</span></div>
                  <div className="flex justify-between pt-2 border-t text-base font-semibold"><span>{t('transactions.totalAmount', 'Total')}</span><span>{num(detail.total_amount).toFixed(2)} {detail.currency_code || ''}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{t('transactions.paid', 'Paid')}</span><span>{num(detail.total_paid).toFixed(2)}</span></div>
                  <div className="flex justify-between text-base font-semibold"><span>{t('transactions.remaining', 'Remaining')}</span><span>{num(detail.amount_remaining).toFixed(2)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
