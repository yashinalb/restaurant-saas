import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import stockIntakeService, { StockIntake } from '../services/frontend-stockIntakeService';
import tenantSupplierService, { TenantSupplier } from '../services/frontend-tenantSupplierService';
import tenantInventoryProductService, { TenantInventoryProduct } from '../services/frontend-tenantInventoryProductService';
import supplierInvoiceService, { SupplierInvoice } from '../services/frontend-supplierInvoiceService';
import { storeService } from '../services/storeService';
import type { Store } from '../services/storeService';

const num = (v: any) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
};

export default function StockIntakesPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();
  const canCreate = hasPermission('stock_intakes.create');
  const canEdit = hasPermission('stock_intakes.edit');
  const canDelete = hasPermission('stock_intakes.delete');

  const [items, setItems] = useState<StockIntake[]>([]);
  const [suppliers, setSuppliers] = useState<TenantSupplier[]>([]);
  const [products, setProducts] = useState<TenantInventoryProduct[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [filterStore, setFilterStore] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [formStoreId, setFormStoreId] = useState(0);
  const [formSupplierId, setFormSupplierId] = useState(0);
  const [formInvoiceId, setFormInvoiceId] = useState(0);
  const [formProductId, setFormProductId] = useState(0);
  const [formQtyOrdered, setFormQtyOrdered] = useState('');
  const [formQtyReceived, setFormQtyReceived] = useState('0');
  const [formIsCarton, setFormIsCarton] = useState(false);
  const [formUnitsInCarton, setFormUnitsInCarton] = useState('');
  const [formReceivedAt, setFormReceivedAt] = useState('');
  const [formStatus, setFormStatus] = useState<'complete' | 'partial' | 'pending'>('complete');
  const [formNotes, setFormNotes] = useState('');

  if (!selectedTenant) {
    return <div className="p-6 text-center text-gray-500">{t('common.selectTenantFirst', 'Please select a tenant first')}</div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const filters: Record<string, any> = {};
      if (filterStore) filters.store_id = filterStore;
      if (filterSupplier) filters.tenant_supplier_id = filterSupplier;
      if (filterProduct) filters.tenant_inventory_product_id = filterProduct;
      if (filterStatus) filters.status = filterStatus;

      const [intakeData, supplierData, productData, storeData, invoiceData] = await Promise.all([
        stockIntakeService.getAll(filters),
        tenantSupplierService.getAll({ is_active: true }).catch(() => []),
        tenantInventoryProductService.getAll({ is_active: true }).catch(() => []),
        storeService.getAll().catch(() => []),
        supplierInvoiceService.getAll({ limit: 200 }).catch(() => []),
      ]);
      setItems(intakeData);
      setSuppliers(supplierData);
      setProducts(productData);
      setStores(storeData);
      setInvoices(invoiceData);
    } catch {
      toast.error(t('stockIntakes.fetchError', 'Failed to load stock intakes'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedTenant?.id, filterStore, filterSupplier, filterProduct, filterStatus]);

  const resetForm = () => {
    setFormStoreId(stores[0]?.id || 0);
    setFormSupplierId(0);
    setFormInvoiceId(0);
    setFormProductId(0);
    setFormQtyOrdered('');
    setFormQtyReceived('0');
    setFormIsCarton(false);
    setFormUnitsInCarton('');
    setFormReceivedAt(new Date().toISOString().slice(0, 16));
    setFormStatus('complete');
    setFormNotes('');
  };

  const handleCreate = () => {
    setEditingId(null);
    resetForm();
    setShowModal(true);
  };

  const handleEdit = async (item: StockIntake) => {
    try {
      const full = await stockIntakeService.getById(item.id);
      setEditingId(full.id);
      setFormStoreId(full.store_id);
      setFormSupplierId(full.tenant_supplier_id);
      setFormInvoiceId(full.supplier_invoice_id || 0);
      setFormProductId(full.tenant_inventory_product_id);
      setFormQtyOrdered(full.quantity_ordered != null ? String(full.quantity_ordered) : '');
      setFormQtyReceived(String(full.quantity_received));
      setFormIsCarton(!!full.is_carton);
      setFormUnitsInCarton(full.units_in_carton != null ? String(full.units_in_carton) : '');
      setFormReceivedAt(full.received_at ? full.received_at.slice(0, 16) : '');
      setFormStatus(full.status);
      setFormNotes(full.notes || '');
      setShowModal(true);
    } catch {
      toast.error(t('stockIntakes.fetchError', 'Failed to load intake'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('stockIntakes.confirmDelete', 'Delete this intake? Stock will be reversed.'))) return;
    try {
      await stockIntakeService.delete(id);
      toast.success(t('stockIntakes.deleted', 'Intake deleted'));
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('stockIntakes.deleteError', 'Failed to delete'));
    }
  };

  const handleSave = async () => {
    if (!formStoreId || !formSupplierId || !formProductId) {
      toast.error(t('stockIntakes.fieldsRequired', 'Store, supplier, and product are required'));
      return;
    }
    if (!formReceivedAt) {
      toast.error(t('stockIntakes.receivedAtRequired', 'Received date is required'));
      return;
    }
    if (formIsCarton && !formUnitsInCarton) {
      toast.error(t('stockIntakes.unitsInCartonRequired', 'Units in carton required when carton is enabled'));
      return;
    }
    try {
      setSaving(true);
      const payload = {
        store_id: formStoreId,
        tenant_supplier_id: formSupplierId,
        supplier_invoice_id: formInvoiceId || null,
        tenant_inventory_product_id: formProductId,
        quantity_ordered: formQtyOrdered ? num(formQtyOrdered) : null,
        quantity_received: num(formQtyReceived),
        is_carton: formIsCarton,
        units_in_carton: formIsCarton && formUnitsInCarton ? parseInt(formUnitsInCarton) : null,
        received_at: formReceivedAt,
        status: formStatus,
        notes: formNotes.trim() || null,
      };
      if (editingId) {
        await stockIntakeService.update(editingId, payload);
        toast.success(t('stockIntakes.updated', 'Intake updated'));
      } else {
        await stockIntakeService.create(payload);
        toast.success(t('stockIntakes.created', 'Intake created'));
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('stockIntakes.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'complete': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('stockIntakes.title', 'Stock Intakes')}</h1>
        {canCreate && (
          <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> {t('stockIntakes.add', 'Add Intake')}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={filterStore} onChange={e => setFilterStore(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">{t('stockIntakes.allStores', 'All Stores')}</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">{t('stockIntakes.allSuppliers', 'All Suppliers')}</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">{t('stockIntakes.allProducts', 'All Products')}</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">{t('stockIntakes.allStatuses', 'All Statuses')}</option>
          <option value="complete">{t('stockIntakes.statusComplete', 'Complete')}</option>
          <option value="partial">{t('stockIntakes.statusPartial', 'Partial')}</option>
          <option value="pending">{t('stockIntakes.statusPending', 'Pending')}</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('stockIntakes.receivedAt', 'Received')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('stockIntakes.product', 'Product')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('stockIntakes.store', 'Store')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('stockIntakes.supplier', 'Supplier')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('stockIntakes.invoice', 'Invoice')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('stockIntakes.quantityOrdered', 'Ordered')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('stockIntakes.quantityReceived', 'Received')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('stockIntakes.status', 'Status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(item.received_at).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {item.product_name}
                    {item.product_code && <span className="text-gray-400 text-xs ml-1">({item.product_code})</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.store_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.supplier_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.invoice_number || '-'}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">{item.quantity_ordered != null ? num(item.quantity_ordered).toFixed(3) : '-'}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-700">
                    {num(item.quantity_received).toFixed(3)}
                    {item.is_carton && item.total_units_received != null && (
                      <div className="text-xs text-gray-400">= {num(item.total_units_received).toFixed(3)} units</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColor(item.status)}`}>
                      {t(`stockIntakes.status${item.status.charAt(0).toUpperCase() + item.status.slice(1)}`, item.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    {canEdit && <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 mr-3"><Pencil className="w-4 h-4" /></button>}
                    {canDelete && <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">{t('stockIntakes.empty', 'No stock intakes found')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{editingId ? t('stockIntakes.edit', 'Edit Intake') : t('stockIntakes.add', 'Add Intake')}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('stockIntakes.store', 'Store')} *</label>
                  <select value={formStoreId} onChange={e => setFormStoreId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value={0}>{t('stockIntakes.selectStore', 'Select a store')}</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('stockIntakes.supplier', 'Supplier')} *</label>
                  <select value={formSupplierId} onChange={e => setFormSupplierId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value={0}>{t('stockIntakes.selectSupplier', 'Select a supplier')}</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('stockIntakes.product', 'Product')} *</label>
                  <select value={formProductId} onChange={e => setFormProductId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value={0}>{t('stockIntakes.selectProduct', 'Select a product')}</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('stockIntakes.invoice', 'Invoice')}</label>
                  <select value={formInvoiceId} onChange={e => setFormInvoiceId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value={0}>{t('stockIntakes.noInvoice', 'None')}</option>
                    {invoices.map(i => <option key={i.id} value={i.id}>{i.invoice_number}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('stockIntakes.quantityOrdered', 'Quantity Ordered')}</label>
                  <input type="number" step="0.001" value={formQtyOrdered} onChange={e => setFormQtyOrdered(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('stockIntakes.quantityReceived', 'Quantity Received')} *</label>
                  <input type="number" step="0.001" value={formQtyReceived} onChange={e => setFormQtyReceived(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('stockIntakes.receivedAt', 'Received At')} *</label>
                  <input type="datetime-local" value={formReceivedAt} onChange={e => setFormReceivedAt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formIsCarton} onChange={e => setFormIsCarton(e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-700">{t('stockIntakes.isCarton', 'Carton')}</span>
                  </label>
                </div>
                {formIsCarton && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('stockIntakes.unitsInCarton', 'Units per Carton')} *</label>
                    <input type="number" value={formUnitsInCarton} onChange={e => setFormUnitsInCarton(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('stockIntakes.status', 'Status')}</label>
                  <select value={formStatus} onChange={e => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="complete">{t('stockIntakes.statusComplete', 'Complete')}</option>
                    <option value="partial">{t('stockIntakes.statusPartial', 'Partial')}</option>
                    <option value="pending">{t('stockIntakes.statusPending', 'Pending')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('stockIntakes.notes', 'Notes')}</label>
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
    </div>
  );
}
