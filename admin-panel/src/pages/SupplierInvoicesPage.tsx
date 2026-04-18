import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2, Eye } from 'lucide-react';
import api from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import supplierInvoiceService, { SupplierInvoice, StockIntakeInput } from '../services/frontend-supplierInvoiceService';
import tenantSupplierService, { TenantSupplier } from '../services/frontend-tenantSupplierService';
import tenantInventoryProductService, { TenantInventoryProduct } from '../services/frontend-tenantInventoryProductService';
import { storeService } from '../services/storeService';
import type { Store } from '../services/storeService';

interface Currency { id: number; code: string; symbol: string; name: string; }

const num = (v: any) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
};

export default function SupplierInvoicesPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();
  const canCreate = hasPermission('supplier_invoices.create');
  const canEdit = hasPermission('supplier_invoices.edit');
  const canDelete = hasPermission('supplier_invoices.delete');

  const [items, setItems] = useState<SupplierInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<TenantSupplier[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [products, setProducts] = useState<TenantInventoryProduct[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailItem, setDetailItem] = useState<SupplierInvoice | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  // Form
  const [formSupplierId, setFormSupplierId] = useState(0);
  const [formInvoiceNumber, setFormInvoiceNumber] = useState('');
  const [formInvoiceDate, setFormInvoiceDate] = useState('');
  const [formAmountBeforeVat, setFormAmountBeforeVat] = useState('');
  const [formVatAmount, setFormVatAmount] = useState('');
  const [formTotalAmount, setFormTotalAmount] = useState('');
  const [formCurrencyId, setFormCurrencyId] = useState(0);
  const [formStockStatus, setFormStockStatus] = useState<'pending' | 'partial' | 'received'>('received');
  const [formNotes, setFormNotes] = useState('');
  const [formIntakes, setFormIntakes] = useState<StockIntakeInput[]>([]);

  if (!selectedTenant) {
    return <div className="p-6 text-center text-gray-500">{t('common.selectTenantFirst', 'Please select a tenant first')}</div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const filters: Record<string, any> = {};
      if (filterSupplier) filters.tenant_supplier_id = filterSupplier;
      if (filterStatus) filters.stock_status = filterStatus;
      if (filterFromDate) filters.from_date = filterFromDate;
      if (filterToDate) filters.to_date = filterToDate;

      const [invoiceData, supplierData, productData, storeData, currencyResp] = await Promise.all([
        supplierInvoiceService.getAll(filters),
        tenantSupplierService.getAll({ is_active: true }).catch(() => []),
        tenantInventoryProductService.getAll({ is_active: true }).catch(() => []),
        storeService.getAll().catch(() => []),
        api.get('/api/tenant/currencies').catch(() => ({ data: { data: [] } })),
      ]);
      setItems(invoiceData);
      setSuppliers(supplierData);
      setProducts(productData);
      setStores(storeData);
      setCurrencies(currencyResp.data?.data || []);
    } catch {
      toast.error(t('supplierInvoices.fetchError', 'Failed to load supplier invoices'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedTenant?.id, filterSupplier, filterStatus, filterFromDate, filterToDate]);

  const resetForm = () => {
    setFormSupplierId(0);
    setFormInvoiceNumber('');
    setFormInvoiceDate(new Date().toISOString().slice(0, 16));
    setFormAmountBeforeVat('');
    setFormVatAmount('');
    setFormTotalAmount('');
    setFormCurrencyId(currencies[0]?.id ?? 0);
    setFormStockStatus('received');
    setFormNotes('');
    setFormIntakes([]);
  };

  const handleCreate = () => {
    setEditingId(null);
    resetForm();
    setShowModal(true);
  };

  const handleView = async (id: number) => {
    try {
      const full = await supplierInvoiceService.getById(id);
      setDetailItem(full);
      setShowDetailModal(true);
    } catch {
      toast.error(t('supplierInvoices.fetchError', 'Failed to load invoice'));
    }
  };

  const handleEdit = async (id: number) => {
    try {
      const full = await supplierInvoiceService.getById(id);
      setEditingId(id);
      setFormSupplierId(full.tenant_supplier_id);
      setFormInvoiceNumber(full.invoice_number);
      setFormInvoiceDate(full.invoice_date ? full.invoice_date.slice(0, 16) : '');
      setFormAmountBeforeVat(full.total_amount_before_vat != null ? String(full.total_amount_before_vat) : '');
      setFormVatAmount(full.total_vat_amount != null ? String(full.total_vat_amount) : '');
      setFormTotalAmount(String(full.total_amount));
      setFormCurrencyId(full.currency_id);
      setFormStockStatus(full.stock_status);
      setFormNotes(full.notes || '');
      setFormIntakes((full.intakes || []).map(i => ({
        store_id: i.store_id,
        tenant_inventory_product_id: i.tenant_inventory_product_id,
        quantity_ordered: i.quantity_ordered != null ? num(i.quantity_ordered) : null,
        quantity_received: num(i.quantity_received),
        is_carton: !!i.is_carton,
        units_in_carton: i.units_in_carton,
        notes: i.notes,
        received_at: (i.received_at || '').slice(0, 16),
        status: i.status || 'complete',
      })));
      setShowModal(true);
    } catch {
      toast.error(t('supplierInvoices.fetchError', 'Failed to load invoice'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('supplierInvoices.confirmDelete', 'Delete this invoice? Linked stock will be reversed.'))) return;
    try {
      await supplierInvoiceService.delete(id);
      toast.success(t('supplierInvoices.deleted', 'Invoice deleted'));
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('supplierInvoices.deleteError', 'Failed to delete'));
    }
  };

  const addIntake = () => {
    if (products.length === 0) {
      toast.error(t('supplierInvoices.noProducts', 'No inventory products available. Create one first.'));
      return;
    }
    if (stores.length === 0) {
      toast.error(t('supplierInvoices.noStores', 'No stores available. Create one first.'));
      return;
    }
    setFormIntakes([...formIntakes, {
      store_id: stores[0].id,
      tenant_inventory_product_id: products[0].id,
      quantity_ordered: null,
      quantity_received: 0,
      is_carton: false,
      units_in_carton: null,
      received_at: formInvoiceDate || new Date().toISOString().slice(0, 16),
      status: 'complete',
    }]);
  };

  const updateIntake = (idx: number, updates: Partial<StockIntakeInput>) => {
    const next = [...formIntakes];
    next[idx] = { ...next[idx], ...updates } as StockIntakeInput;
    setFormIntakes(next);
  };

  const removeIntake = (idx: number) => {
    setFormIntakes(formIntakes.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!formSupplierId) { toast.error(t('supplierInvoices.supplierRequired', 'Supplier is required')); return; }
    if (!formInvoiceNumber.trim()) { toast.error(t('supplierInvoices.invoiceNumberRequired', 'Invoice number is required')); return; }
    if (!formInvoiceDate) { toast.error(t('supplierInvoices.invoiceDateRequired', 'Invoice date is required')); return; }
    if (!formCurrencyId) { toast.error(t('supplierInvoices.currencyRequired', 'Currency is required')); return; }
    if (!formTotalAmount || num(formTotalAmount) <= 0) { toast.error(t('supplierInvoices.totalRequired', 'Total amount is required')); return; }

    try {
      setSaving(true);
      const payload = {
        tenant_supplier_id: formSupplierId,
        invoice_number: formInvoiceNumber.trim(),
        invoice_date: formInvoiceDate,
        total_amount_before_vat: formAmountBeforeVat ? num(formAmountBeforeVat) : null,
        total_vat_amount: formVatAmount ? num(formVatAmount) : null,
        total_amount: num(formTotalAmount),
        currency_id: formCurrencyId,
        stock_status: formStockStatus,
        notes: formNotes.trim() || null,
        intakes: formIntakes,
      };
      if (editingId) {
        await supplierInvoiceService.update(editingId, payload);
        toast.success(t('supplierInvoices.updated', 'Invoice updated'));
      } else {
        await supplierInvoiceService.create(payload);
        toast.success(t('supplierInvoices.created', 'Invoice created'));
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('supplierInvoices.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'received': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('supplierInvoices.title', 'Supplier Invoices')}</h1>
        {canCreate && (
          <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> {t('supplierInvoices.add', 'New Invoice')}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">{t('supplierInvoices.allSuppliers', 'All Suppliers')}</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">{t('supplierInvoices.allStatuses', 'All Statuses')}</option>
          <option value="received">{t('supplierInvoices.statusReceived', 'Received')}</option>
          <option value="partial">{t('supplierInvoices.statusPartial', 'Partial')}</option>
          <option value="pending">{t('supplierInvoices.statusPending', 'Pending')}</option>
        </select>
        <input type="date" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
        <input type="date" value={filterToDate} onChange={e => setFilterToDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('supplierInvoices.invoiceNumber', 'Invoice #')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('supplierInvoices.date', 'Date')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('supplierInvoices.supplier', 'Supplier')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('supplierInvoices.total', 'Total')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('supplierInvoices.stockStatus', 'Stock Status')}</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('supplierInvoices.intakes', 'Intakes')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.invoice_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(item.invoice_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.supplier_name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-700">
                    {item.currency_symbol || ''}{num(item.total_amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColor(item.stock_status)}`}>
                      {t(`supplierInvoices.status${item.stock_status.charAt(0).toUpperCase() + item.stock_status.slice(1)}`, item.stock_status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500">{item.intake_count || 0}</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button onClick={() => handleView(item.id)} className="text-gray-600 hover:text-gray-800 mr-3"><Eye className="w-4 h-4" /></button>
                    {canEdit && <button onClick={() => handleEdit(item.id)} className="text-blue-600 hover:text-blue-800 mr-3"><Pencil className="w-4 h-4" /></button>}
                    {canDelete && <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">{t('supplierInvoices.empty', 'No invoices found')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {showDetailModal && detailItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{t('supplierInvoices.detailTitle', 'Invoice')} #{detailItem.invoice_number}</h2>
              <button onClick={() => setShowDetailModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-gray-500">{t('supplierInvoices.supplier', 'Supplier')}:</span> <span className="font-medium">{detailItem.supplier_name}</span></div>
                <div><span className="text-gray-500">{t('supplierInvoices.date', 'Date')}:</span> <span className="font-medium">{new Date(detailItem.invoice_date).toLocaleString()}</span></div>
                <div><span className="text-gray-500">{t('supplierInvoices.currency', 'Currency')}:</span> <span className="font-medium">{detailItem.currency_code}</span></div>
                <div><span className="text-gray-500">{t('supplierInvoices.stockStatus', 'Stock Status')}:</span>
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${statusColor(detailItem.stock_status)}`}>{detailItem.stock_status}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 py-3 border-t border-b">
                <div><span className="text-gray-500">{t('supplierInvoices.amountBeforeVat', 'Before VAT')}</span><div className="font-medium">{detailItem.total_amount_before_vat != null ? `${detailItem.currency_symbol || ''}${num(detailItem.total_amount_before_vat).toFixed(2)}` : '-'}</div></div>
                <div><span className="text-gray-500">{t('supplierInvoices.vatAmount', 'VAT')}</span><div className="font-medium">{detailItem.total_vat_amount != null ? `${detailItem.currency_symbol || ''}${num(detailItem.total_vat_amount).toFixed(2)}` : '-'}</div></div>
                <div><span className="text-gray-500">{t('supplierInvoices.total', 'Total')}</span><div className="font-bold">{detailItem.currency_symbol || ''}{num(detailItem.total_amount).toFixed(2)}</div></div>
              </div>
              {detailItem.notes && <div><span className="text-gray-500">{t('supplierInvoices.notes', 'Notes')}:</span> {detailItem.notes}</div>}
              <div>
                <h3 className="font-semibold mt-4 mb-2">{t('supplierInvoices.intakes', 'Stock Intakes')}</h3>
                {(detailItem.intakes || []).length === 0 ? (
                  <div className="text-gray-500 italic">{t('supplierInvoices.noIntakes', 'No stock intakes recorded')}</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1 text-left">{t('supplierInvoices.product', 'Product')}</th>
                        <th className="px-2 py-1 text-left">{t('supplierInvoices.store', 'Store')}</th>
                        <th className="px-2 py-1 text-right">{t('supplierInvoices.quantityOrdered', 'Ordered')}</th>
                        <th className="px-2 py-1 text-right">{t('supplierInvoices.quantityReceived', 'Received')}</th>
                        <th className="px-2 py-1 text-left">{t('supplierInvoices.status', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detailItem.intakes || []).map((i, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-2 py-1">{i.product_name} {i.product_code ? `(${i.product_code})` : ''}</td>
                          <td className="px-2 py-1">{i.store_name}</td>
                          <td className="px-2 py-1 text-right">{i.quantity_ordered != null ? num(i.quantity_ordered).toFixed(3) : '-'}</td>
                          <td className="px-2 py-1 text-right">{num(i.quantity_received).toFixed(3)}{i.is_carton ? ` (${num(i.total_units_received ?? 0).toFixed(3)} units)` : ''}</td>
                          <td className="px-2 py-1">{i.status}</td>
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

      {/* Edit/Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">
                {editingId ? t('supplierInvoices.edit', 'Edit Invoice') : t('supplierInvoices.add', 'New Invoice')}
              </h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierInvoices.supplier', 'Supplier')} *</label>
                  <select value={formSupplierId} onChange={e => setFormSupplierId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value={0}>{t('supplierInvoices.selectSupplier', 'Select a supplier')}</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierInvoices.invoiceNumber', 'Invoice Number')} *</label>
                  <input type="text" value={formInvoiceNumber} onChange={e => setFormInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierInvoices.date', 'Invoice Date')} *</label>
                  <input type="datetime-local" value={formInvoiceDate} onChange={e => setFormInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierInvoices.currency', 'Currency')} *</label>
                  <select value={formCurrencyId} onChange={e => setFormCurrencyId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value={0}>{t('supplierInvoices.selectCurrency', 'Select a currency')}</option>
                    {currencies.map(c => <option key={c.id} value={c.id}>{c.code} ({c.symbol})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierInvoices.amountBeforeVat', 'Amount Before VAT')}</label>
                  <input type="number" step="0.01" value={formAmountBeforeVat} onChange={e => setFormAmountBeforeVat(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierInvoices.vatAmount', 'VAT Amount')}</label>
                  <input type="number" step="0.01" value={formVatAmount} onChange={e => setFormVatAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierInvoices.total', 'Total')} *</label>
                  <input type="number" step="0.01" value={formTotalAmount} onChange={e => setFormTotalAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierInvoices.stockStatus', 'Stock Status')}</label>
                  <select value={formStockStatus} onChange={e => setFormStockStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="received">{t('supplierInvoices.statusReceived', 'Received')}</option>
                    <option value="partial">{t('supplierInvoices.statusPartial', 'Partial')}</option>
                    <option value="pending">{t('supplierInvoices.statusPending', 'Pending')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierInvoices.notes', 'Notes')}</label>
                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Intakes */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">{t('supplierInvoices.intakes', 'Stock Intakes')}</label>
                  <button type="button" onClick={addIntake}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <Plus className="w-4 h-4" /> {t('supplierInvoices.addIntake', 'Add Intake')}
                  </button>
                </div>
                {formIntakes.length === 0 ? (
                  <div className="text-sm text-gray-500 italic py-2">{t('supplierInvoices.noIntakesHint', 'Add stock intakes to automatically update product stock on save.')}</div>
                ) : (
                  <div className="space-y-2">
                    {formIntakes.map((intake, idx) => (
                      <div key={idx} className="p-3 border border-gray-200 rounded-lg">
                        <div className="grid grid-cols-6 gap-2">
                          <select value={intake.tenant_inventory_product_id}
                            onChange={e => updateIntake(idx, { tenant_inventory_product_id: Number(e.target.value) })}
                            className="col-span-2 px-2 py-1 border border-gray-300 rounded text-sm">
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <select value={intake.store_id}
                            onChange={e => updateIntake(idx, { store_id: Number(e.target.value) })}
                            className="px-2 py-1 border border-gray-300 rounded text-sm">
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                          <input type="number" step="0.001" placeholder={t('supplierInvoices.quantityOrdered', 'Ordered')}
                            value={intake.quantity_ordered ?? ''}
                            onChange={e => updateIntake(idx, { quantity_ordered: e.target.value ? num(e.target.value) : null })}
                            className="px-2 py-1 border border-gray-300 rounded text-sm" />
                          <input type="number" step="0.001" placeholder={t('supplierInvoices.quantityReceived', 'Received')}
                            value={intake.quantity_received}
                            onChange={e => updateIntake(idx, { quantity_received: num(e.target.value) })}
                            className="px-2 py-1 border border-gray-300 rounded text-sm" />
                          <button type="button" onClick={() => removeIntake(idx)}
                            className="text-red-600 hover:text-red-800 flex items-center justify-center"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="grid grid-cols-5 gap-2 mt-2">
                          <label className="flex items-center gap-1 text-xs">
                            <input type="checkbox" checked={!!intake.is_carton}
                              onChange={e => updateIntake(idx, { is_carton: e.target.checked })} className="rounded" />
                            {t('supplierInvoices.isCarton', 'Carton')}
                          </label>
                          {intake.is_carton && (
                            <input type="number" placeholder={t('supplierInvoices.unitsInCarton', 'Units/carton')}
                              value={intake.units_in_carton ?? ''}
                              onChange={e => updateIntake(idx, { units_in_carton: e.target.value ? parseInt(e.target.value) : null })}
                              className="px-2 py-1 border border-gray-300 rounded text-xs" />
                          )}
                          <input type="datetime-local" value={intake.received_at}
                            onChange={e => updateIntake(idx, { received_at: e.target.value })}
                            className="px-2 py-1 border border-gray-300 rounded text-xs col-span-2" />
                          <select value={intake.status || 'complete'}
                            onChange={e => updateIntake(idx, { status: e.target.value as any })}
                            className="px-2 py-1 border border-gray-300 rounded text-xs">
                            <option value="complete">{t('supplierInvoices.intakeComplete', 'Complete')}</option>
                            <option value="partial">{t('supplierInvoices.intakePartial', 'Partial')}</option>
                            <option value="pending">{t('supplierInvoices.intakePending', 'Pending')}</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
    </div>
  );
}
