import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import tenantWaiterService, { TenantWaiter } from '../services/tenantWaiterService';
import { storeService, Store } from '../services/storeService';

export default function TenantWaitersPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();
  const canManage = hasPermission('waiters.manage');

  const [items, setItems] = useState<TenantWaiter[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formStoreId, setFormStoreId] = useState<number | ''>('');
  const [formPhone1, setFormPhone1] = useState('');
  const [formPhone2, setFormPhone2] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  if (!selectedTenant) {
    return <div className="p-6 text-center text-gray-500">{t('common.selectTenantFirst', 'Please select a tenant first')}</div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsData, storesData] = await Promise.all([
        tenantWaiterService.getAll(),
        storeService.getAll(),
      ]);
      setItems(itemsData);
      setStores(storesData);
    } catch (error) {
      toast.error(t('tenantWaiters.fetchError', 'Failed to load'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedTenant?.id]);

  const handleCreate = () => {
    setEditingId(null);
    setFormName(''); setFormPin(''); setFormStoreId('');
    setFormPhone1(''); setFormPhone2(''); setFormAddress(''); setFormImageUrl('');
    setFormIsActive(true);
    setShowModal(true);
  };

  const handleEdit = (item: TenantWaiter) => {
    setEditingId(item.id);
    setFormName(item.name); setFormPin(item.pin); setFormStoreId(item.store_id || '');
    setFormPhone1(item.phone_1 || ''); setFormPhone2(item.phone_2 || '');
    setFormAddress(item.address || ''); setFormImageUrl(item.image_url || '');
    setFormIsActive(!!item.is_active);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('tenantWaiters.confirmDelete', 'Are you sure?'))) return;
    try {
      await tenantWaiterService.delete(id);
      toast.success(t('tenantWaiters.deleted', 'Deleted'));
      fetchData();
    } catch (error) {
      toast.error(t('tenantWaiters.deleteError', 'Failed to delete'));
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error(t('tenantWaiters.nameRequired', 'Name is required')); return; }
    if (!formPin.trim()) { toast.error(t('tenantWaiters.pinRequired', 'PIN is required')); return; }
    if (formPin.length < 4 || formPin.length > 6) { toast.error(t('tenantWaiters.pinLength', 'PIN must be 4-6 digits')); return; }
    try {
      setSaving(true);
      const payload = {
        name: formName, pin: formPin, store_id: formStoreId || null,
        phone_1: formPhone1 || undefined, phone_2: formPhone2 || undefined,
        address: formAddress || undefined, image_url: formImageUrl || undefined,
        is_active: formIsActive,
      };
      if (editingId) {
        await tenantWaiterService.update(editingId, payload);
        toast.success(t('tenantWaiters.updated', 'Updated'));
      } else {
        await tenantWaiterService.create(payload);
        toast.success(t('tenantWaiters.created', 'Created'));
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('tenantWaiters.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('tenantWaiters.title', 'Waiters')}</h1>
        {canManage && (
          <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> {t('tenantWaiters.add', 'Add Waiter')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantWaiters.name', 'Name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantWaiters.pin', 'PIN')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantWaiters.store', 'Store')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantWaiters.phone', 'Phone')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status', 'Status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-500">{item.pin}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.store_name || t('tenantWaiters.allStores', 'All Stores')}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.phone_1 || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {item.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {canManage && <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 mr-3"><Pencil className="w-4 h-4" /></button>}
                    {canManage && <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">{t('tenantWaiters.empty', 'No waiters found')}</td></tr>
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
                {editingId ? t('tenantWaiters.edit', 'Edit Waiter') : t('tenantWaiters.add', 'Add Waiter')}
              </h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantWaiters.name', 'Name')} *</label>
                  <input type="text" value={formName} onChange={e => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantWaiters.pin', 'PIN')} *</label>
                  <input type="text" value={formPin} onChange={e => setFormPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="4-6 digits" maxLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono tracking-widest" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantWaiters.store', 'Store')}</label>
                <select value={formStoreId} onChange={e => setFormStoreId(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">{t('tenantWaiters.allStores', 'All Stores')}</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantWaiters.phone1', 'Phone 1')}</label>
                  <input type="text" value={formPhone1} onChange={e => setFormPhone1(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantWaiters.phone2', 'Phone 2')}</label>
                  <input type="text" value={formPhone2} onChange={e => setFormPhone2(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantWaiters.address', 'Address')}</label>
                <textarea value={formAddress} onChange={e => setFormAddress(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantWaiters.imageUrl', 'Image URL')}</label>
                <input type="text" value={formImageUrl} onChange={e => setFormImageUrl(e.target.value)}
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
