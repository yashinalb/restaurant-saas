import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import tenantCustomerService, { TenantCustomer } from '../services/tenantCustomerService';

export default function TenantCustomersPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();
  const canManage = hasPermission('customers.manage');

  const [items, setItems] = useState<TenantCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formIsRegistered, setFormIsRegistered] = useState(false);
  const [formAddressLine1, setFormAddressLine1] = useState('');
  const [formAddressLine2, setFormAddressLine2] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formPostalCode, setFormPostalCode] = useState('');
  const [formCountryCode, setFormCountryCode] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  if (!selectedTenant) {
    return <div className="p-6 text-center text-gray-500">{t('common.selectTenantFirst', 'Please select a tenant first')}</div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await tenantCustomerService.getAll();
      setItems(data);
    } catch (error) {
      toast.error(t('tenantCustomers.fetchError', 'Failed to load'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedTenant?.id]);

  const resetForm = () => {
    setFormName(''); setFormEmail(''); setFormPhone(''); setFormPassword('');
    setFormIsRegistered(false); setFormAddressLine1(''); setFormAddressLine2('');
    setFormCity(''); setFormPostalCode(''); setFormCountryCode('');
    setFormNotes(''); setFormIsActive(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (item: TenantCustomer) => {
    setEditingId(item.id);
    setFormName(item.name);
    setFormEmail(item.email || '');
    setFormPhone(item.phone || '');
    setFormPassword('');
    setFormIsRegistered(!!item.is_registered);
    setFormAddressLine1(item.address_line_1 || '');
    setFormAddressLine2(item.address_line_2 || '');
    setFormCity(item.city || '');
    setFormPostalCode(item.postal_code || '');
    setFormCountryCode(item.country_code || '');
    setFormNotes(item.notes || '');
    setFormIsActive(!!item.is_active);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('tenantCustomers.confirmDelete', 'Are you sure?'))) return;
    try {
      await tenantCustomerService.delete(id);
      toast.success(t('tenantCustomers.deleted', 'Deleted'));
      fetchData();
    } catch (error) {
      toast.error(t('tenantCustomers.deleteError', 'Failed to delete'));
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error(t('tenantCustomers.nameRequired', 'Name is required')); return; }
    try {
      setSaving(true);
      const payload: any = {
        name: formName,
        email: formEmail || null,
        phone: formPhone || null,
        is_registered: formIsRegistered,
        address_line_1: formAddressLine1 || undefined,
        address_line_2: formAddressLine2 || undefined,
        city: formCity || undefined,
        postal_code: formPostalCode || undefined,
        country_code: formCountryCode || undefined,
        notes: formNotes || undefined,
        is_active: formIsActive,
      };
      if (formPassword) {
        payload.password_hash = formPassword;
      }
      if (editingId) {
        await tenantCustomerService.update(editingId, payload);
        toast.success(t('tenantCustomers.updated', 'Updated'));
      } else {
        await tenantCustomerService.create(payload);
        toast.success(t('tenantCustomers.created', 'Created'));
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('tenantCustomers.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('tenantCustomers.title', 'Customers')}</h1>
        {canManage && (
          <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> {t('tenantCustomers.add', 'Add Customer')}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantCustomers.name', 'Name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantCustomers.email', 'Email')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantCustomers.phone', 'Phone')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantCustomers.city', 'City')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantCustomers.type', 'Type')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status', 'Status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.email || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.city || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${item.is_registered ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                      {item.is_registered ? t('tenantCustomers.registered', 'Registered') : t('tenantCustomers.guest', 'Guest')}
                    </span>
                  </td>
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
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">{t('tenantCustomers.empty', 'No customers found')}</td></tr>
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
                {editingId ? t('tenantCustomers.edit', 'Edit Customer') : t('tenantCustomers.add', 'Add Customer')}
              </h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantCustomers.name', 'Name')} *</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantCustomers.email', 'Email')}</label>
                  <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantCustomers.phone', 'Phone')}</label>
                  <input type="text" value={formPhone} onChange={e => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantCustomers.password', 'Password')}</label>
                  <input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)}
                    placeholder={editingId ? t('tenantCustomers.passwordPlaceholder', 'Leave blank to keep') : ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formIsRegistered} onChange={e => setFormIsRegistered(e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-700">{t('tenantCustomers.registered', 'Registered')}</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantCustomers.addressLine1', 'Address Line 1')}</label>
                <input type="text" value={formAddressLine1} onChange={e => setFormAddressLine1(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantCustomers.addressLine2', 'Address Line 2')}</label>
                <input type="text" value={formAddressLine2} onChange={e => setFormAddressLine2(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantCustomers.city', 'City')}</label>
                  <input type="text" value={formCity} onChange={e => setFormCity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantCustomers.postalCode', 'Postal Code')}</label>
                  <input type="text" value={formPostalCode} onChange={e => setFormPostalCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantCustomers.countryCode', 'Country')}</label>
                  <input type="text" value={formCountryCode} onChange={e => setFormCountryCode(e.target.value)} maxLength={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantCustomers.notes', 'Notes')}</label>
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
