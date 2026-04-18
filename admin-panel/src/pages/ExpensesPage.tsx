import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2, Eye, CreditCard, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import expenseService, { Expense } from '../services/frontend-expenseService';
import tenantExpenseSourceService, { TenantExpenseSource } from '../services/frontend-tenantExpenseSourceService';
import tenantPaymentTypeService, { TenantPaymentType } from '../services/tenantPaymentTypeService';
import { storeService } from '../services/storeService';
import type { Store } from '../services/storeService';

interface Currency { id: number; code: string; symbol: string; name: string; }

const num = (v: any) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
};

export default function ExpensesPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant, user } = useAuthStore();
  const canCreate = hasPermission('expenses.create');
  const canEdit = hasPermission('expenses.edit');
  const canDelete = hasPermission('expenses.delete');

  const getTranslatedName = (translations: Array<{ language_code?: string; name: string }> | undefined, fallback = '-') => {
    if (!translations || translations.length === 0) return fallback;
    return translations.find(tr => tr.language_code === i18n.language)?.name
      || translations.find(tr => tr.language_code === 'en')?.name
      || translations[0].name
      || fallback;
  };

  const [items, setItems] = useState<Expense[]>([]);
  const [sources, setSources] = useState<TenantExpenseSource[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<TenantPaymentType[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [showDetail, setShowDetail] = useState(false);
  const [detail, setDetail] = useState<Expense | null>(null);

  const [showPayModal, setShowPayModal] = useState(false);
  const [payExpenseId, setPayExpenseId] = useState<number | null>(null);
  const [payExpense, setPayExpense] = useState<Expense | null>(null);

  // Filters
  const [filterStore, setFilterStore] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);

  // Form
  const [formStoreId, setFormStoreId] = useState(0);
  const [formSourceId, setFormSourceId] = useState(0);
  const [formInvoiceNumber, setFormInvoiceNumber] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrencyId, setFormCurrencyId] = useState(0);
  const [formDueDate, setFormDueDate] = useState('');
  const [formAttachmentUrl, setFormAttachmentUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Pay form
  const [payPaymentTypeId, setPayPaymentTypeId] = useState(0);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payCurrencyId, setPayCurrencyId] = useState(0);
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');

  if (!selectedTenant) {
    return <div className="p-6 text-center text-gray-500">{t('common.selectTenantFirst', 'Please select a tenant first')}</div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const filters: Record<string, any> = {};
      if (filterStore) filters.store_id = filterStore;
      if (filterSource) filters.tenant_expense_source_id = filterSource;
      if (filterStatus) filters.payment_status = filterStatus;
      if (filterOverdue) filters.overdue_only = true;

      const [expData, sourceData, storeData, ptData, currencyResp] = await Promise.all([
        expenseService.getAll(filters),
        tenantExpenseSourceService.getAll({ is_active: true }).catch(() => []),
        storeService.getAll().catch(() => []),
        tenantPaymentTypeService.getAll({ is_active: true }).catch(() => []),
        api.get('/api/tenant/currencies').catch(() => ({ data: { data: [] } })),
      ]);
      setItems(expData);
      setSources(sourceData);
      setStores(storeData);
      setPaymentTypes(ptData);
      setCurrencies(currencyResp.data?.data || []);
    } catch {
      toast.error(t('expenses.fetchError', 'Failed to load expenses'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedTenant?.id, filterStore, filterSource, filterStatus, filterOverdue]);

  const resetForm = () => {
    setFormStoreId(0);
    setFormSourceId(0);
    setFormInvoiceNumber('');
    setFormDescription('');
    setFormAmount('');
    setFormCurrencyId(currencies[0]?.id ?? 0);
    setFormDueDate('');
    setFormAttachmentUrl('');
    setFormNotes('');
  };

  const handleCreate = () => {
    setEditingId(null);
    resetForm();
    setShowModal(true);
  };

  const handleEdit = async (id: number) => {
    try {
      const full = await expenseService.getById(id);
      setEditingId(id);
      setFormStoreId(full.store_id || 0);
      setFormSourceId(full.tenant_expense_source_id);
      setFormInvoiceNumber(full.invoice_number || '');
      setFormDescription(full.description);
      setFormAmount(String(full.amount));
      setFormCurrencyId(full.currency_id);
      setFormDueDate(full.due_date || '');
      setFormAttachmentUrl(full.attachment_url || '');
      setFormNotes(full.notes || '');
      setShowModal(true);
    } catch {
      toast.error(t('expenses.fetchError', 'Failed to load expense'));
    }
  };

  const handleView = async (id: number) => {
    try {
      const full = await expenseService.getById(id);
      setDetail(full);
      setShowDetail(true);
    } catch {
      toast.error(t('expenses.fetchError', 'Failed to load expense'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('expenses.confirmDelete', 'Delete this expense and its payments?'))) return;
    try {
      await expenseService.delete(id);
      toast.success(t('expenses.deleted', 'Expense deleted'));
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('expenses.deleteError', 'Failed to delete'));
    }
  };

  const handleSave = async () => {
    if (!formSourceId) { toast.error(t('expenses.sourceRequired', 'Expense source is required')); return; }
    if (!formDescription.trim()) { toast.error(t('expenses.descriptionRequired', 'Description is required')); return; }
    if (!formAmount || num(formAmount) <= 0) { toast.error(t('expenses.amountRequired', 'Amount must be greater than zero')); return; }
    if (!formCurrencyId) { toast.error(t('expenses.currencyRequired', 'Currency is required')); return; }

    try {
      setSaving(true);
      const payload = {
        store_id: formStoreId || null,
        tenant_expense_source_id: formSourceId,
        invoice_number: formInvoiceNumber.trim() || null,
        description: formDescription.trim(),
        amount: num(formAmount),
        currency_id: formCurrencyId,
        due_date: formDueDate || null,
        attachment_url: formAttachmentUrl.trim() || null,
        notes: formNotes.trim() || null,
      };
      if (editingId) {
        await expenseService.update(editingId, payload);
        toast.success(t('expenses.updated', 'Expense updated'));
      } else {
        await expenseService.create(payload);
        toast.success(t('expenses.created', 'Expense created'));
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('expenses.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const openPayModal = (exp: Expense) => {
    setPayExpenseId(exp.id);
    setPayExpense(exp);
    setPayPaymentTypeId(paymentTypes[0]?.id ?? 0);
    setPayAmount(String(num(exp.balance ?? num(exp.amount) - num(exp.amount_paid ?? 0))));
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayCurrencyId(exp.currency_id);
    setPayReference('');
    setPayNotes('');
    setShowPayModal(true);
  };

  const handleRecordPayment = async () => {
    if (!payExpenseId) return;
    if (!payAmount || num(payAmount) <= 0) { toast.error(t('expenses.paymentAmountRequired', 'Payment amount must be greater than zero')); return; }
    if (!payDate) { toast.error(t('expenses.paymentDateRequired', 'Payment date is required')); return; }
    if (!payCurrencyId) { toast.error(t('expenses.currencyRequired', 'Currency is required')); return; }
    if (!user?.id) { toast.error(t('expenses.userRequired', 'Current user could not be determined')); return; }

    try {
      setSaving(true);
      await expenseService.addPayment(payExpenseId, {
        tenant_payment_type_id: payPaymentTypeId || null,
        currency_id: payCurrencyId,
        amount: num(payAmount),
        payment_date: payDate,
        reference_number: payReference.trim() || null,
        notes: payNotes.trim() || null,
        paid_by: user.id,
      });
      toast.success(t('expenses.paymentRecorded', 'Payment recorded'));
      setShowPayModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('expenses.paymentError', 'Failed to record payment'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!confirm(t('expenses.confirmDeletePayment', 'Delete this payment?'))) return;
    try {
      await expenseService.deletePayment(paymentId);
      toast.success(t('expenses.paymentDeleted', 'Payment deleted'));
      if (detail) {
        const refreshed = await expenseService.getById(detail.id);
        setDetail(refreshed);
      }
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('expenses.paymentDeleteError', 'Failed to delete payment'));
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partially_paid': return 'bg-yellow-100 text-yellow-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (exp: Expense) => {
    if (exp.payment_status === 'paid' || !exp.due_date) return false;
    return new Date(exp.due_date) < new Date();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('expenses.title', 'Expenses')}</h1>
        {canCreate && (
          <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> {t('expenses.add', 'New Expense')}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={filterStore} onChange={e => setFilterStore(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">{t('expenses.allStores', 'All Stores')}</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">{t('expenses.allSources', 'All Sources')}</option>
          {sources.map(s => <option key={s.id} value={s.id}>{getTranslatedName(s.translations)}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">{t('expenses.allStatuses', 'All Statuses')}</option>
          <option value="unpaid">{t('expenses.statusUnpaid', 'Unpaid')}</option>
          <option value="partially_paid">{t('expenses.statusPartiallyPaid', 'Partially Paid')}</option>
          <option value="paid">{t('expenses.statusPaid', 'Paid')}</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={filterOverdue} onChange={e => setFilterOverdue(e.target.checked)} className="rounded" />
          <span>{t('expenses.overdueOnly', 'Overdue only')}</span>
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('expenses.date', 'Date')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('expenses.invoiceNumber', 'Invoice #')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('expenses.description', 'Description')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('expenses.source', 'Source')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('expenses.store', 'Store')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('expenses.amount', 'Amount')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('expenses.paid', 'Paid')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('expenses.dueDate', 'Due')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('expenses.status', 'Status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(item.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.invoice_number || '-'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 truncate max-w-xs">{item.description}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{getTranslatedName(item.source_translations)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.store_name || t('expenses.tenantLevel', 'Tenant-level')}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-700">{item.currency_symbol || ''}{num(item.amount).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-700">{item.currency_symbol || ''}{num(item.amount_paid ?? 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm">
                    {item.due_date ? (
                      <span className={`inline-flex items-center gap-1 ${isOverdue(item) ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                        {isOverdue(item) && <AlertTriangle className="w-3 h-3" />}
                        {new Date(item.due_date).toLocaleDateString()}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColor(item.payment_status)}`}>
                      {t(`expenses.status${item.payment_status.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')}`, item.payment_status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button onClick={() => handleView(item.id)} title={t('common.view', 'View')} className="text-gray-600 hover:text-gray-800 mr-3"><Eye className="w-4 h-4" /></button>
                    {canEdit && item.payment_status !== 'paid' && (
                      <button onClick={() => openPayModal(item)} title={t('expenses.recordPayment', 'Record Payment')} className="text-green-600 hover:text-green-800 mr-3"><CreditCard className="w-4 h-4" /></button>
                    )}
                    {canEdit && <button onClick={() => handleEdit(item.id)} className="text-blue-600 hover:text-blue-800 mr-3"><Pencil className="w-4 h-4" /></button>}
                    {canDelete && <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={10} className="px-6 py-8 text-center text-gray-500">{t('expenses.empty', 'No expenses found')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{editingId ? t('expenses.edit', 'Edit Expense') : t('expenses.add', 'New Expense')}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenses.source', 'Expense Source')} *</label>
                  <select value={formSourceId} onChange={e => setFormSourceId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value={0}>{t('expenses.selectSource', 'Select a source')}</option>
                    {sources.map(s => <option key={s.id} value={s.id}>{getTranslatedName(s.translations)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenses.store', 'Store')}</label>
                  <select value={formStoreId} onChange={e => setFormStoreId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value={0}>{t('expenses.tenantLevel', 'Tenant-level')}</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenses.invoiceNumber', 'Invoice Number')}</label>
                  <input type="text" value={formInvoiceNumber} onChange={e => setFormInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenses.dueDate', 'Due Date')}</label>
                  <input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenses.description', 'Description')} *</label>
                <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenses.amount', 'Amount')} *</label>
                  <input type="number" step="0.01" value={formAmount} onChange={e => setFormAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenses.currency', 'Currency')} *</label>
                  <select value={formCurrencyId} onChange={e => setFormCurrencyId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value={0}>{t('expenses.selectCurrency', 'Select a currency')}</option>
                    {currencies.map(c => <option key={c.id} value={c.id}>{c.code} ({c.symbol})</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenses.attachmentUrl', 'Attachment URL')}</label>
                <input type="url" value={formAttachmentUrl} onChange={e => setFormAttachmentUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenses.notes', 'Notes')}</label>
                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
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

      {/* Record Payment modal */}
      {showPayModal && payExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{t('expenses.recordPayment', 'Record Payment')}</h2>
              <button onClick={() => setShowPayModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-blue-50 rounded text-sm">
                <div><span className="text-gray-600">{t('expenses.description', 'Description')}:</span> <strong>{payExpense.description}</strong></div>
                <div><span className="text-gray-600">{t('expenses.amount', 'Amount')}:</span> <strong>{payExpense.currency_symbol}{num(payExpense.amount).toFixed(2)}</strong></div>
                <div><span className="text-gray-600">{t('expenses.balance', 'Balance')}:</span> <strong>{payExpense.currency_symbol}{num(payExpense.balance ?? num(payExpense.amount) - num(payExpense.amount_paid ?? 0)).toFixed(2)}</strong></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenses.paymentType', 'Payment Type')}</label>
                  <select value={payPaymentTypeId} onChange={e => setPayPaymentTypeId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value={0}>{t('expenses.none', 'None')}</option>
                    {paymentTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.code}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenses.paymentAmount', 'Amount')} *</label>
                  <input type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenses.paymentDate', 'Date')} *</label>
                  <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenses.currency', 'Currency')} *</label>
                  <select value={payCurrencyId} onChange={e => setPayCurrencyId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    {currencies.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenses.reference', 'Reference Number')}</label>
                <input type="text" value={payReference} onChange={e => setPayReference(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenses.notes', 'Notes')}</label>
                <textarea value={payNotes} onChange={e => setPayNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowPayModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">{t('common.cancel', 'Cancel')}</button>
              <button onClick={handleRecordPayment} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('expenses.recordPayment', 'Record Payment')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {showDetail && detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{t('expenses.detailTitle', 'Expense')} {detail.invoice_number ? `#${detail.invoice_number}` : `#${detail.id}`}</h2>
              <button onClick={() => setShowDetail(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div><span className="text-gray-500">{t('expenses.description', 'Description')}:</span> {detail.description}</div>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-gray-500">{t('expenses.store', 'Store')}:</span> {detail.store_name || t('expenses.tenantLevel', 'Tenant-level')}</div>
                <div><span className="text-gray-500">{t('expenses.dueDate', 'Due Date')}:</span> {detail.due_date ? new Date(detail.due_date).toLocaleDateString() : '-'}</div>
              </div>
              <div className="grid grid-cols-3 gap-4 py-3 border-t border-b">
                <div><span className="text-gray-500">{t('expenses.amount', 'Amount')}</span><div className="font-semibold">{detail.currency_symbol}{num(detail.amount).toFixed(2)}</div></div>
                <div><span className="text-gray-500">{t('expenses.paid', 'Paid')}</span><div className="font-semibold text-green-700">{detail.currency_symbol}{num(detail.amount_paid ?? 0).toFixed(2)}</div></div>
                <div><span className="text-gray-500">{t('expenses.balance', 'Balance')}</span><div className="font-semibold text-red-700">{detail.currency_symbol}{num(detail.balance ?? 0).toFixed(2)}</div></div>
              </div>
              {detail.attachment_url && (
                <div><span className="text-gray-500">{t('expenses.attachment', 'Attachment')}:</span> <a href={detail.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{detail.attachment_url}</a></div>
              )}
              {detail.notes && <div><span className="text-gray-500">{t('expenses.notes', 'Notes')}:</span> {detail.notes}</div>}
              <div>
                <h3 className="font-semibold mt-4 mb-2">{t('expenses.payments', 'Payments')}</h3>
                {(detail.payments || []).length === 0 ? (
                  <div className="text-gray-500 italic">{t('expenses.noPayments', 'No payments recorded yet')}</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1 text-left">{t('expenses.paymentDate', 'Date')}</th>
                        <th className="px-2 py-1 text-left">{t('expenses.paymentType', 'Type')}</th>
                        <th className="px-2 py-1 text-right">{t('expenses.paymentAmount', 'Amount')}</th>
                        <th className="px-2 py-1 text-left">{t('expenses.reference', 'Reference')}</th>
                        <th className="px-2 py-1 text-left">{t('expenses.paidBy', 'Paid By')}</th>
                        <th className="px-2 py-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detail.payments || []).map(p => (
                        <tr key={p.id} className="border-t">
                          <td className="px-2 py-1">{new Date(p.payment_date).toLocaleDateString()}</td>
                          <td className="px-2 py-1">{p.payment_type_code || '-'}</td>
                          <td className="px-2 py-1 text-right">{p.payment_currency_symbol}{num(p.amount).toFixed(2)}</td>
                          <td className="px-2 py-1">{p.reference_number || '-'}</td>
                          <td className="px-2 py-1">{[p.paid_by_first_name, p.paid_by_last_name].filter(Boolean).join(' ') || p.paid_by_email || '-'}</td>
                          <td className="px-2 py-1 text-right">
                            {canEdit && p.id && (
                              <button onClick={() => handleDeletePayment(p.id!)} className="text-red-600 hover:text-red-800"><Trash2 className="w-3 h-3" /></button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
