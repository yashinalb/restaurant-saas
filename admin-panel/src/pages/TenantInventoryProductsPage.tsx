import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2, Search, Star, AlertTriangle } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import tenantInventoryProductService, { TenantInventoryProduct, InventoryProductSupplier } from '../services/frontend-tenantInventoryProductService';
import tenantSupplierService, { TenantSupplier } from '../services/frontend-tenantSupplierService';

const num = (v: any) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
};

export default function TenantInventoryProductsPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();
  const canCreate = hasPermission('inventory_products.create');
  const canEdit = hasPermission('inventory_products.edit');
  const canDelete = hasPermission('inventory_products.delete');

  const [items, setItems] = useState<TenantInventoryProduct[]>([]);
  const [suppliers, setSuppliers] = useState<TenantSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterSupplierId, setFilterSupplierId] = useState('');

  // Form
  const [formProductCode, setFormProductCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formUnitInStock, setFormUnitInStock] = useState('0');
  const [formIsWeighted, setFormIsWeighted] = useState(false);
  const [formHasCarton, setFormHasCarton] = useState(false);
  const [formUnitsPerCarton, setFormUnitsPerCarton] = useState('');
  const [formBuyingPriceExclVat, setFormBuyingPriceExclVat] = useState('');
  const [formVatType, setFormVatType] = useState<'percentage' | 'exempt'>('percentage');
  const [formVatPercentage, setFormVatPercentage] = useState('0');
  const [formBuyingPriceInclVat, setFormBuyingPriceInclVat] = useState('');
  const [formLowStockThreshold, setFormLowStockThreshold] = useState('0');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSuppliers, setFormSuppliers] = useState<InventoryProductSupplier[]>([]);

  if (!selectedTenant) {
    return <div className="p-6 text-center text-gray-500">{t('common.selectTenantFirst', 'Please select a tenant first')}</div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const filters: Record<string, any> = {};
      if (search.trim()) filters.search = search.trim();
      if (filterActive !== '') filters.is_active = filterActive === 'true';
      if (filterLowStock) filters.low_stock = true;
      if (filterSupplierId) filters.supplier_id = filterSupplierId;

      const [productData, supplierData] = await Promise.all([
        tenantInventoryProductService.getAll(filters),
        tenantSupplierService.getAll({ is_active: true }).catch(() => []),
      ]);
      setItems(productData);
      setSuppliers(supplierData);
    } catch {
      toast.error(t('tenantInventoryProducts.fetchError', 'Failed to load inventory products'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedTenant?.id, filterActive, filterLowStock, filterSupplierId]);

  const resetForm = () => {
    setFormProductCode('');
    setFormName('');
    setFormUnitInStock('0');
    setFormIsWeighted(false);
    setFormHasCarton(false);
    setFormUnitsPerCarton('');
    setFormBuyingPriceExclVat('');
    setFormVatType('percentage');
    setFormVatPercentage('0');
    setFormBuyingPriceInclVat('');
    setFormLowStockThreshold('0');
    setFormIsActive(true);
    setFormSuppliers([]);
  };

  const handleCreate = () => {
    setEditingId(null);
    resetForm();
    setShowModal(true);
  };

  const handleEdit = async (item: TenantInventoryProduct) => {
    try {
      const full = await tenantInventoryProductService.getById(item.id);
      setEditingId(full.id);
      setFormProductCode(full.product_code || '');
      setFormName(full.name);
      setFormUnitInStock(String(full.unit_in_stock ?? 0));
      setFormIsWeighted(!!full.is_weighted);
      setFormHasCarton(!!full.has_carton);
      setFormUnitsPerCarton(full.units_per_carton != null ? String(full.units_per_carton) : '');
      setFormBuyingPriceExclVat(full.buying_price_excl_vat != null ? String(full.buying_price_excl_vat) : '');
      setFormVatType(full.vat_type);
      setFormVatPercentage(String(full.vat_percentage ?? 0));
      setFormBuyingPriceInclVat(full.buying_price_incl_vat != null ? String(full.buying_price_incl_vat) : '');
      setFormLowStockThreshold(String(full.low_stock_threshold ?? 0));
      setFormIsActive(!!full.is_active);
      setFormSuppliers(full.suppliers || []);
      setShowModal(true);
    } catch {
      toast.error(t('tenantInventoryProducts.fetchError', 'Failed to load product'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('tenantInventoryProducts.confirmDelete', 'Are you sure you want to delete this product?'))) return;
    try {
      await tenantInventoryProductService.delete(id);
      toast.success(t('tenantInventoryProducts.deleted', 'Product deleted'));
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('tenantInventoryProducts.deleteError', 'Failed to delete'));
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error(t('tenantInventoryProducts.nameRequired', 'Name is required')); return; }
    if (formHasCarton && !formUnitsPerCarton) {
      toast.error(t('tenantInventoryProducts.unitsPerCartonRequired', 'Units per carton is required when carton is enabled'));
      return;
    }

    try {
      setSaving(true);
      const payload = {
        product_code: formProductCode.trim() || null,
        name: formName.trim(),
        unit_in_stock: num(formUnitInStock),
        is_weighted: formIsWeighted,
        has_carton: formHasCarton,
        units_per_carton: formHasCarton && formUnitsPerCarton ? parseInt(formUnitsPerCarton) : null,
        buying_price_excl_vat: formBuyingPriceExclVat ? num(formBuyingPriceExclVat) : null,
        vat_type: formVatType,
        vat_percentage: num(formVatPercentage),
        buying_price_incl_vat: formBuyingPriceInclVat ? num(formBuyingPriceInclVat) : null,
        low_stock_threshold: num(formLowStockThreshold),
        is_active: formIsActive,
        suppliers: formSuppliers.map(s => ({
          tenant_supplier_id: s.tenant_supplier_id,
          is_primary: !!s.is_primary,
          supplier_sku: s.supplier_sku || null,
        })),
      };
      if (editingId) {
        await tenantInventoryProductService.update(editingId, payload);
        toast.success(t('tenantInventoryProducts.updated', 'Product updated'));
      } else {
        await tenantInventoryProductService.create(payload);
        toast.success(t('tenantInventoryProducts.created', 'Product created'));
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('tenantInventoryProducts.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const addSupplier = () => {
    const availableSuppliers = suppliers.filter(s => !formSuppliers.some(fs => fs.tenant_supplier_id === s.id));
    if (availableSuppliers.length === 0) {
      toast.error(t('tenantInventoryProducts.noMoreSuppliers', 'No more suppliers to add'));
      return;
    }
    setFormSuppliers([...formSuppliers, {
      tenant_supplier_id: availableSuppliers[0].id,
      is_primary: formSuppliers.length === 0,
      supplier_sku: '',
    }]);
  };

  const removeSupplier = (idx: number) => {
    const next = formSuppliers.filter((_, i) => i !== idx);
    if (next.length > 0 && !next.some(s => s.is_primary)) {
      next[0].is_primary = true;
    }
    setFormSuppliers(next);
  };

  const updateSupplier = (idx: number, updates: Partial<InventoryProductSupplier>) => {
    const next = [...formSuppliers];
    next[idx] = { ...next[idx], ...updates };
    setFormSuppliers(next);
  };

  const setPrimary = (idx: number) => {
    setFormSuppliers(formSuppliers.map((s, i) => ({ ...s, is_primary: i === idx })));
  };

  const isLowStock = (p: TenantInventoryProduct) => num(p.unit_in_stock) <= num(p.low_stock_threshold);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('tenantInventoryProducts.title', 'Inventory Products')}</h1>
        {canCreate && (
          <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> {t('tenantInventoryProducts.add', 'Add Product')}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') fetchData(); }}
            placeholder={t('tenantInventoryProducts.searchPlaceholder', 'Search by name or code')}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select value={filterSupplierId} onChange={e => setFilterSupplierId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">{t('tenantInventoryProducts.allSuppliers', 'All Suppliers')}</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterActive} onChange={e => setFilterActive(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">{t('tenantInventoryProducts.allStatuses', 'All Statuses')}</option>
          <option value="true">{t('common.active', 'Active')}</option>
          <option value="false">{t('common.inactive', 'Inactive')}</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={filterLowStock} onChange={e => setFilterLowStock(e.target.checked)} className="rounded" />
          <span>{t('tenantInventoryProducts.lowStockOnly', 'Low stock only')}</span>
        </label>
        <button onClick={fetchData} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
          {t('common.search', 'Search')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantInventoryProducts.productCode', 'Code')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantInventoryProducts.name', 'Name')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('tenantInventoryProducts.unitInStock', 'Stock')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('tenantInventoryProducts.lowStockThreshold', 'Threshold')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('tenantInventoryProducts.buyingPriceInclVat', 'Price (incl. VAT)')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantInventoryProducts.suppliers', 'Suppliers')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status', 'Status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-500">{item.product_code || '-'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <span className={`inline-flex items-center gap-1 ${isLowStock(item) ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                      {isLowStock(item) && <AlertTriangle className="w-4 h-4" />}
                      {num(item.unit_in_stock).toFixed(3)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">{num(item.low_stock_threshold).toFixed(3)}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-700">
                    {item.buying_price_incl_vat != null ? num(item.buying_price_incl_vat).toFixed(2) : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.supplier_count || 0}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {item.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {canEdit && <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 mr-3"><Pencil className="w-4 h-4" /></button>}
                    {canDelete && <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">{t('tenantInventoryProducts.empty', 'No inventory products found')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">
                {editingId ? t('tenantInventoryProducts.edit', 'Edit Product') : t('tenantInventoryProducts.add', 'Add Product')}
              </h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantInventoryProducts.productCode', 'Product Code')}</label>
                  <input type="text" value={formProductCode} onChange={e => setFormProductCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantInventoryProducts.name', 'Name')} *</label>
                  <input type="text" value={formName} onChange={e => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantInventoryProducts.unitInStock', 'Unit in Stock')}</label>
                  <input type="number" step="0.001" value={formUnitInStock} onChange={e => setFormUnitInStock(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantInventoryProducts.lowStockThreshold', 'Low Stock Threshold')}</label>
                  <input type="number" step="0.001" value={formLowStockThreshold} onChange={e => setFormLowStockThreshold(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formIsWeighted} onChange={e => setFormIsWeighted(e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-700">{t('tenantInventoryProducts.isWeighted', 'Weighted')}</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formHasCarton} onChange={e => setFormHasCarton(e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-700">{t('tenantInventoryProducts.hasCarton', 'Has Carton')}</span>
                  </label>
                </div>
                {formHasCarton && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantInventoryProducts.unitsPerCarton', 'Units per Carton')} *</label>
                    <input type="number" value={formUnitsPerCarton} onChange={e => setFormUnitsPerCarton(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantInventoryProducts.buyingPriceExclVat', 'Buying Price (excl. VAT)')}</label>
                  <input type="number" step="0.01" value={formBuyingPriceExclVat} onChange={e => setFormBuyingPriceExclVat(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantInventoryProducts.vatType', 'VAT Type')}</label>
                  <select value={formVatType} onChange={e => setFormVatType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="percentage">{t('tenantInventoryProducts.vatPercentage', 'Percentage')}</option>
                    <option value="exempt">{t('tenantInventoryProducts.vatExempt', 'Exempt')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantInventoryProducts.vatPercent', 'VAT %')}</label>
                  <input type="number" step="0.01" value={formVatPercentage} onChange={e => setFormVatPercentage(e.target.value)}
                    disabled={formVatType === 'exempt'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantInventoryProducts.buyingPriceInclVat', 'Buying Price (incl. VAT)')}</label>
                  <input type="number" step="0.01" value={formBuyingPriceInclVat} onChange={e => setFormBuyingPriceInclVat(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Suppliers section */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">{t('tenantInventoryProducts.suppliers', 'Suppliers')}</label>
                  <button type="button" onClick={addSupplier}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <Plus className="w-4 h-4" /> {t('tenantInventoryProducts.addSupplier', 'Add Supplier')}
                  </button>
                </div>
                {formSuppliers.length === 0 ? (
                  <div className="text-sm text-gray-500 italic py-2">{t('tenantInventoryProducts.noSuppliers', 'No suppliers linked. Click "Add Supplier" to link one.')}</div>
                ) : (
                  <div className="space-y-2">
                    {formSuppliers.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                        <button type="button" onClick={() => setPrimary(idx)} title={t('tenantInventoryProducts.setPrimary', 'Set as primary')}
                          className={s.is_primary ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}>
                          <Star className={`w-5 h-5 ${s.is_primary ? 'fill-current' : ''}`} />
                        </button>
                        <select value={s.tenant_supplier_id} onChange={e => updateSupplier(idx, { tenant_supplier_id: Number(e.target.value) })}
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm">
                          {suppliers.map(sup => (
                            <option key={sup.id} value={sup.id}
                              disabled={formSuppliers.some((fs, i) => i !== idx && fs.tenant_supplier_id === sup.id)}>
                              {sup.name}
                            </option>
                          ))}
                        </select>
                        <input type="text" placeholder={t('tenantInventoryProducts.supplierSku', 'Supplier SKU')}
                          value={s.supplier_sku || ''} onChange={e => updateSupplier(idx, { supplier_sku: e.target.value })}
                          className="w-40 px-3 py-1.5 border border-gray-300 rounded text-sm" />
                        <button type="button" onClick={() => removeSupplier(idx)}
                          className="text-red-600 hover:text-red-800"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 pt-2">
                <input type="checkbox" checked={formIsActive} onChange={e => setFormIsActive(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">{t('common.active', 'Active')}</span>
              </label>
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
