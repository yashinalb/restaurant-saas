import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2, Search } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import tenantSupplierService, { TenantSupplier } from '../services/frontend-tenantSupplierService';

export default function TenantSuppliersPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();
  const canCreate = hasPermission('suppliers.create');
  const canEdit = hasPermission('suppliers.edit');
  const canDelete = hasPermission('suppliers.delete');

  const [items, setItems] = useState<TenantSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('');

  // Form
  const [formName, setFormName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formTaxId, setFormTaxId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  if (!selectedTenant) {
    return <div className="p-6 text-center text-gray-500">{t('common.selectTenantFirst', 'Please select a tenant first')}</div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const filters: Record<string, any> = {};
      if (search.trim()) filters.search = search.trim();
      if (filterActive !== '') filters.is_active = filterActive === 'true';
      const data = await tenantSupplierService.getAll(filters);
      setItems(data);
    } catch {
      toast.error(t('tenantSuppliers.fetchError', 'Failed to load suppliers'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedTenant?.id, filterActive]);

  const resetForm = () => {
    setFormName('');
    setFormContactPerson('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormTaxId('');
    setFormNotes('');
    setFormIsActive(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (item: TenantSupplier) => {
    setEditingId(item.id);
    setFormName(item.name);
    setFormContactPerson(item.contact_person || '');
    setFormPhone(item.phone || '');
    setFormEmail(item.email || '');
    setFormAddress(item.address || '');
    setFormTaxId(item.tax_id || '');
    setFormNotes(item.notes || '');
    setFormIsActive(!!item.is_active);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('tenantSuppliers.confirmDelete', 'Are you sure you want to delete this supplier?'))) return;
    try {
      await tenantSupplierService.delete(id);
      toast.success(t('tenantSuppliers.deleted', 'Supplier deleted'));
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('tenantSuppliers.deleteError', 'Failed to delete supplier'));
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error(t('tenantSuppliers.nameRequired', 'Name is required')); return; }
    try {
      setSaving(true);
      const payload = {
        name: formName.trim(),
        contact_person: formContactPerson.trim() || null,
        phone: formPhone.trim() || null,
        email: formEmail.trim() || null,
        address: formAddress.trim() || null,
        tax_id: formTaxId.trim() || null,
        notes: formNotes.trim() || null,
        is_active: formIsActive,
      };
      if (editingId) {
        await tenantSupplierService.update(editingId, payload);
        toast.success(t('tenantSuppliers.updated', 'Supplier updated'));
      } else {
        await tenantSupplierService.create(payload);
        toast.success(t('tenantSuppliers.created', 'Supplier created'));
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('tenantSuppliers.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('tenantSuppliers.title', 'Suppliers')}</h1>
        {canCreate && (
          <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> {t('tenantSuppliers.add', 'Add Supplier')}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') fetchData(); }}
            placeholder={t('tenantSuppliers.searchPlaceholder', 'Search by name, contact, email, phone')}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select value={filterActive} onChange={e => setFilterActive(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">{t('tenantSuppliers.allStatuses', 'All Statuses')}</option>
          <option value="true">{t('common.active', 'Active')}</option>
          <option value="false">{t('common.inactive', 'Inactive')}</option>
        </select>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantSuppliers.name', 'Name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantSuppliers.contactPerson', 'Contact Person')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantSuppliers.phone', 'Phone')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantSuppliers.email', 'Email')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantSuppliers.taxId', 'Tax ID')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status', 'Status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.contact_person || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.email || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.tax_id || '-'}</td>
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
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">{t('tenantSuppliers.empty', 'No suppliers found')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">
                {editingId ? t('tenantSuppliers.edit', 'Edit Supplier') : t('tenantSuppliers.add', 'Add Supplier')}
              </h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantSuppliers.name', 'Name')} *</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantSuppliers.contactPerson', 'Contact Person')}</label>
                <input type="text" value={formContactPerson} onChange={e => setFormContactPerson(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantSuppliers.phone', 'Phone')}</label>
                  <input type="text" value={formPhone} onChange={e => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantSuppliers.email', 'Email')}</label>
                  <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantSuppliers.address', 'Address')}</label>
                <textarea value={formAddress} onChange={e => setFormAddress(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantSuppliers.taxId', 'Tax ID')}</label>
                <input type="text" value={formTaxId} onChange={e => setFormTaxId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantSuppliers.notes', 'Notes')}</label>
                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <label className="flex items-center gap-2">
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
