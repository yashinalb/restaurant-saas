import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2, Eye, CreditCard } from 'lucide-react';
import api from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import supplierCreditService, { SupplierCredit } from '../services/frontend-supplierCreditService';
import tenantSupplierService, { TenantSupplier } from '../services/frontend-tenantSupplierService';
import supplierInvoiceService, { SupplierInvoice } from '../services/frontend-supplierInvoiceService';
import tenantPaymentTypeService, { TenantPaymentType } from '../services/tenantPaymentTypeService';

interface Currency { id: number; code: string; symbol: string; name: string; }

const num = (v: any) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
};

export default function SupplierCreditsPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant, user } = useAuthStore();
  const canCreate = hasPermission('supplier_credits.create');
  const canEdit = hasPermission('supplier_credits.edit');
  const canDelete = hasPermission('supplier_credits.delete');

  const [items, setItems] = useState<SupplierCredit[]>([]);
  const [suppliers, setSuppliers] = useState<TenantSupplier[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<TenantPaymentType[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [showDetail, setShowDetail] = useState(false);
  const [detail, setDetail] = useState<SupplierCredit | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentCreditId, setPaymentCreditId] = useState<number | null>(null);
  const [payingForCredit, setPayingForCredit] = useState<SupplierCredit | null>(null);

  // Filters
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterUnpaidOnly, setFilterUnpaidOnly] = useState(false);

  // Credit form
  const [formSupplierId, setFormSupplierId] = useState(0);
  const [formInvoiceId, setFormInvoiceId] = useState(0);
  const [formCreditAmount, setFormCreditAmount] = useState('');
  const [formCurrencyId, setFormCurrencyId] = useState(0);

  // Payment form
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
      if (filterSupplier) filters.tenant_supplier_id = filterSupplier;
      if (filterUnpaidOnly) filters.unpaid_only = true;

      const [creditData, supplierData, invoiceData, ptData, currencyResp] = await Promise.all([
        supplierCreditService.getAll(filters),
        tenantSupplierService.getAll({ is_active: true }).catch(() => []),
        supplierInvoiceService.getAll({ limit: 200 }).catch(() => []),
        tenantPaymentTypeService.getAll({ is_active: true }).catch(() => []),
        api.get('/api/tenant/currencies').catch(() => ({ data: { data: [] } })),
      ]);
      setItems(creditData);
      setSuppliers(supplierData);
      setInvoices(invoiceData);
      setPaymentTypes(ptData);
      setCurrencies(currencyResp.data?.data || []);
    } catch {
      toast.error(t('supplierCredits.fetchError', 'Failed to load supplier credits'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedTenant?.id, filterSupplier, filterUnpaidOnly]);

  const resetForm = () => {
    setFormSupplierId(0);
    setFormInvoiceId(0);
    setFormCreditAmount('');
    setFormCurrencyId(currencies[0]?.id ?? 0);
  };

  const handleCreate = () => {
    setEditingId(null);
    resetForm();
    setShowModal(true);
  };

  const handleEdit = async (id: number) => {
    try {
      const full = await supplierCreditService.getById(id);
      setEditingId(id);
      setFormSupplierId(full.tenant_supplier_id);
      setFormInvoiceId(full.supplier_invoice_id || 0);
      setFormCreditAmount(String(full.credit_amount));
      setFormCurrencyId(full.currency_id);
      setShowModal(true);
    } catch {
      toast.error(t('supplierCredits.fetchError', 'Failed to load credit'));
    }
  };

  const handleView = async (id: number) => {
    try {
      const full = await supplierCreditService.getById(id);
      setDetail(full);
      setShowDetail(true);
    } catch {
      toast.error(t('supplierCredits.fetchError', 'Failed to load credit'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('supplierCredits.confirmDelete', 'Delete this credit and all its payments?'))) return;
    try {
      await supplierCreditService.delete(id);
      toast.success(t('supplierCredits.deleted', 'Credit deleted'));
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('supplierCredits.deleteError', 'Failed to delete'));
    }
  };

  const handleSave = async () => {
    if (!formSupplierId) { toast.error(t('supplierCredits.supplierRequired', 'Supplier is required')); return; }
    if (!formCurrencyId) { toast.error(t('supplierCredits.currencyRequired', 'Currency is required')); return; }
    if (!formCreditAmount || num(formCreditAmount) <= 0) {
      toast.error(t('supplierCredits.creditAmountRequired', 'Credit amount must be greater than zero'));
      return;
    }

    try {
      setSaving(true);
      const payload = {
        tenant_supplier_id: formSupplierId,
        supplier_invoice_id: formInvoiceId || null,
        credit_amount: num(formCreditAmount),
        currency_id: formCurrencyId,
      };
      if (editingId) {
        await supplierCreditService.update(editingId, payload);
        toast.success(t('supplierCredits.updated', 'Credit updated'));
      } else {
        await supplierCreditService.create(payload);
        toast.success(t('supplierCredits.created', 'Credit created'));
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('supplierCredits.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const openPaymentModal = (credit: SupplierCredit) => {
    setPaymentCreditId(credit.id);
    setPayingForCredit(credit);
    setPayPaymentTypeId(paymentTypes[0]?.id ?? 0);
    setPayAmount(String(num(credit.balance)));
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayCurrencyId(credit.currency_id);
    setPayReference('');
    setPayNotes('');
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async () => {
    if (!paymentCreditId) return;
    if (!payPaymentTypeId) { toast.error(t('supplierCredits.paymentTypeRequired', 'Payment type is required')); return; }
    if (!payAmount || num(payAmount) <= 0) { toast.error(t('supplierCredits.paymentAmountRequired', 'Payment amount must be greater than zero')); return; }
    if (!payDate) { toast.error(t('supplierCredits.paymentDateRequired', 'Payment date is required')); return; }
    if (!payCurrencyId) { toast.error(t('supplierCredits.currencyRequired', 'Currency is required')); return; }
    if (!user?.id) { toast.error(t('supplierCredits.userRequired', 'Current user could not be determined')); return; }

    try {
      setSaving(true);
      await supplierCreditService.addPayment(paymentCreditId, {
        tenant_payment_type_id: payPaymentTypeId,
        paid_by: user.id,
        payment_amount: num(payAmount),
        payment_date: payDate,
        currency_id: payCurrencyId,
        reference_number: payReference.trim() || null,
        notes: payNotes.trim() || null,
      });
      toast.success(t('supplierCredits.paymentRecorded', 'Payment recorded'));
      setShowPaymentModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('supplierCredits.paymentError', 'Failed to record payment'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!confirm(t('supplierCredits.confirmDeletePayment', 'Delete this payment?'))) return;
    try {
      await supplierCreditService.deletePayment(paymentId);
      toast.success(t('supplierCredits.paymentDeleted', 'Payment deleted'));
      if (detail) {
        const refreshed = await supplierCreditService.getById(detail.id);
        setDetail(refreshed);
      }
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('supplierCredits.paymentDeleteError', 'Failed to delete payment'));
    }
  };

  const balanceBadge = (credit: SupplierCredit) => {
    const balance = num(credit.balance);
    if (balance <= 0) return 'bg-green-100 text-green-800';
    if (num(credit.amount_paid) > 0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const balanceLabel = (credit: SupplierCredit) => {
    const balance = num(credit.balance);
    if (balance <= 0) return t('supplierCredits.paid', 'Paid');
    if (num(credit.amount_paid) > 0) return t('supplierCredits.partial', 'Partial');
    return t('supplierCredits.unpaid', 'Unpaid');
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('supplierCredits.title', 'Supplier Credits')}</h1>
        {canCreate && (
          <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> {t('supplierCredits.add', 'New Credit')}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">{t('supplierCredits.allSuppliers', 'All Suppliers')}</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={filterUnpaidOnly} onChange={e => setFilterUnpaidOnly(e.target.checked)} className="rounded" />
          <span>{t('supplierCredits.unpaidOnly', 'Unpaid only')}</span>
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('supplierCredits.date', 'Date')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('supplierCredits.supplier', 'Supplier')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('supplierCredits.invoice', 'Invoice')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('supplierCredits.creditAmount', 'Credit')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('supplierCredits.amountPaid', 'Paid')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('supplierCredits.balance', 'Balance')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('supplierCredits.status', 'Status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(item.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.supplier_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.invoice_number || '-'}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-700">{item.currency_symbol || ''}{num(item.credit_amount).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-700">{item.currency_symbol || ''}{num(item.amount_paid).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold">{item.currency_symbol || ''}{num(item.balance).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${balanceBadge(item)}`}>{balanceLabel(item)}</span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button onClick={() => handleView(item.id)} title={t('common.view', 'View')} className="text-gray-600 hover:text-gray-800 mr-3"><Eye className="w-4 h-4" /></button>
                    {canEdit && num(item.balance) > 0 && (
                      <button onClick={() => openPaymentModal(item)} title={t('supplierCredits.recordPayment', 'Record Payment')} className="text-green-600 hover:text-green-800 mr-3"><CreditCard className="w-4 h-4" /></button>
                    )}
                    {canEdit && <button onClick={() => handleEdit(item.id)} className="text-blue-600 hover:text-blue-800 mr-3"><Pencil className="w-4 h-4" /></button>}
                    {canDelete && <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">{t('supplierCredits.empty', 'No supplier credits found')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Credit Create/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">
                {editingId ? t('supplierCredits.edit', 'Edit Credit') : t('supplierCredits.add', 'New Credit')}
              </h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierCredits.supplier', 'Supplier')} *</label>
                <select value={formSupplierId} onChange={e => setFormSupplierId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value={0}>{t('supplierCredits.selectSupplier', 'Select a supplier')}</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierCredits.invoice', 'Invoice')}</label>
                <select value={formInvoiceId} onChange={e => setFormInvoiceId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value={0}>{t('supplierCredits.noInvoice', 'None')}</option>
                  {invoices
                    .filter(i => !formSupplierId || i.tenant_supplier_id === formSupplierId)
                    .map(i => <option key={i.id} value={i.id}>{i.invoice_number}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierCredits.creditAmount', 'Credit Amount')} *</label>
                  <input type="number" step="0.01" value={formCreditAmount} onChange={e => setFormCreditAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierCredits.currency', 'Currency')} *</label>
                  <select value={formCurrencyId} onChange={e => setFormCurrencyId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value={0}>{t('supplierCredits.selectCurrency', 'Select a currency')}</option>
                    {currencies.map(c => <option key={c.id} value={c.id}>{c.code} ({c.symbol})</option>)}
                  </select>
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

      {/* Record Payment modal */}
      {showPaymentModal && payingForCredit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{t('supplierCredits.recordPayment', 'Record Payment')}</h2>
              <button onClick={() => setShowPaymentModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-blue-50 rounded text-sm">
                <div><span className="text-gray-600">{t('supplierCredits.supplier', 'Supplier')}:</span> <strong>{payingForCredit.supplier_name}</strong></div>
                <div><span className="text-gray-600">{t('supplierCredits.balance', 'Balance')}:</span> <strong>{payingForCredit.currency_symbol}{num(payingForCredit.balance).toFixed(2)}</strong></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierCredits.paymentType', 'Payment Type')} *</label>
                  <select value={payPaymentTypeId} onChange={e => setPayPaymentTypeId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value={0}>{t('supplierCredits.selectPaymentType', 'Select type')}</option>
                    {paymentTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.code}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierCredits.paymentAmount', 'Amount')} *</label>
                  <input type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierCredits.paymentDate', 'Date')} *</label>
                  <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierCredits.currency', 'Currency')} *</label>
                  <select value={payCurrencyId} onChange={e => setPayCurrencyId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    {currencies.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierCredits.reference', 'Reference Number')}</label>
                <input type="text" value={payReference} onChange={e => setPayReference(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierCredits.notes', 'Notes')}</label>
                <textarea value={payNotes} onChange={e => setPayNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">{t('common.cancel', 'Cancel')}</button>
              <button onClick={handleRecordPayment} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('supplierCredits.recordPayment', 'Record Payment')}
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
              <h2 className="text-lg font-semibold">{t('supplierCredits.detailTitle', 'Credit Detail')}</h2>
              <button onClick={() => setShowDetail(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-gray-500">{t('supplierCredits.supplier', 'Supplier')}:</span> <strong>{detail.supplier_name}</strong></div>
                <div><span className="text-gray-500">{t('supplierCredits.invoice', 'Invoice')}:</span> {detail.invoice_number || '-'}</div>
                <div><span className="text-gray-500">{t('supplierCredits.currency', 'Currency')}:</span> {detail.currency_code}</div>
                <div><span className="text-gray-500">{t('supplierCredits.date', 'Created')}:</span> {new Date(detail.created_at).toLocaleString()}</div>
              </div>
              <div className="grid grid-cols-3 gap-4 py-3 border-t border-b">
                <div><span className="text-gray-500">{t('supplierCredits.creditAmount', 'Credit')}</span><div className="font-semibold">{detail.currency_symbol}{num(detail.credit_amount).toFixed(2)}</div></div>
                <div><span className="text-gray-500">{t('supplierCredits.amountPaid', 'Paid')}</span><div className="font-semibold text-green-700">{detail.currency_symbol}{num(detail.amount_paid).toFixed(2)}</div></div>
                <div><span className="text-gray-500">{t('supplierCredits.balance', 'Balance')}</span><div className="font-semibold text-red-700">{detail.currency_symbol}{num(detail.balance).toFixed(2)}</div></div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">{t('supplierCredits.payments', 'Payments')}</h3>
                {(detail.payments || []).length === 0 ? (
                  <div className="text-gray-500 italic">{t('supplierCredits.noPayments', 'No payments recorded yet')}</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1 text-left">{t('supplierCredits.paymentDate', 'Date')}</th>
                        <th className="px-2 py-1 text-left">{t('supplierCredits.paymentType', 'Type')}</th>
                        <th className="px-2 py-1 text-right">{t('supplierCredits.paymentAmount', 'Amount')}</th>
                        <th className="px-2 py-1 text-left">{t('supplierCredits.reference', 'Reference')}</th>
                        <th className="px-2 py-1 text-left">{t('supplierCredits.paidBy', 'Paid By')}</th>
                        <th className="px-2 py-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detail.payments || []).map(p => (
                        <tr key={p.id} className="border-t">
                          <td className="px-2 py-1">{new Date(p.payment_date).toLocaleDateString()}</td>
                          <td className="px-2 py-1">{p.payment_type_code}</td>
                          <td className="px-2 py-1 text-right">{p.payment_currency_symbol}{num(p.payment_amount).toFixed(2)}</td>
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
