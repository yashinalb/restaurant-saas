import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Store, MapPin, Phone, Monitor, CheckCircle, XCircle } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/authStore';
import { storeService, Store as StoreType, StoreFormData } from '../../services/storeService';

const emptyForm: StoreFormData = {
  name: '',
  slug: '',
  code: '',
  address: '',
  city: '',
  postal_code: '',
  country_code: '',
  phone: '',
  email: '',
  timezone: 'UTC',
  opening_hours: null,
  table_count: 0,
  kitchen_printer_ip: '',
  bar_printer_ip: '',
  receipt_printer_ip: '',
  kds_enabled: false,
  kiosk_enabled: false,
  online_ordering_enabled: false,
  qr_ordering_enabled: false,
  default_tax_rate: 0,
  service_charge_rate: 0,
  is_active: true,
};

export default function StoresPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();

  const canManage = hasPermission('stores.manage');

  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<StoreFormData>({ ...emptyForm });

  if (!selectedTenant) {
    return (
      <div className="p-6 text-center text-gray-500">
        {t('common.selectTenantFirst', 'Please select a tenant first')}
      </div>
    );
  }

  useEffect(() => {
    loadStores();
  }, [selectedTenant?.id]);

  const loadStores = async () => {
    try {
      setLoading(true);
      const data = await storeService.getAll();
      setStores(data);
    } catch (error) {
      toast.error(t('stores.toast.loadFailed', 'Failed to load stores'));
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const handleEdit = (store: StoreType) => {
    setEditingId(store.id);
    setForm({
      name: store.name,
      slug: store.slug,
      code: store.code || '',
      address: store.address || '',
      city: store.city || '',
      postal_code: store.postal_code || '',
      country_code: store.country_code || '',
      phone: store.phone || '',
      email: store.email || '',
      timezone: store.timezone || 'UTC',
      opening_hours: store.opening_hours,
      table_count: store.table_count || 0,
      kitchen_printer_ip: store.kitchen_printer_ip || '',
      bar_printer_ip: store.bar_printer_ip || '',
      receipt_printer_ip: store.receipt_printer_ip || '',
      kds_enabled: !!store.kds_enabled,
      kiosk_enabled: !!store.kiosk_enabled,
      online_ordering_enabled: !!store.online_ordering_enabled,
      qr_ordering_enabled: !!store.qr_ordering_enabled,
      default_tax_rate: store.default_tax_rate || 0,
      service_charge_rate: store.service_charge_rate || 0,
      is_active: !!store.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('stores.confirm.delete', 'Are you sure you want to delete this store?'))) return;
    try {
      await storeService.delete(id);
      toast.success(t('stores.toast.deleted', 'Store deleted successfully'));
      loadStores();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('stores.toast.deleteFailed', 'Failed to delete store'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug) {
      toast.error(t('stores.toast.nameRequired', 'Name and slug are required'));
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await storeService.update(editingId, form);
        toast.success(t('stores.toast.updated', 'Store updated successfully'));
      } else {
        await storeService.create(form);
        toast.success(t('stores.toast.created', 'Store created successfully'));
      }
      setShowModal(false);
      loadStores();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('stores.toast.saveFailed', 'Failed to save store'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">{t('stores.loading', 'Loading stores...')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('stores.title', 'Stores')}</h1>
          <p className="text-gray-600 mt-1">{t('stores.subtitle', 'Manage your restaurant locations')}</p>
        </div>
        {canManage && (
          <button
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Plus className="w-5 h-5" />
            {t('stores.add', 'Add Store')}
          </button>
        )}
      </div>

      {/* Stores Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        {stores.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Store className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>{t('stores.empty', 'No stores yet. Add your first restaurant location.')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('stores.table.name', 'Name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('stores.table.location', 'Location')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('stores.table.contact', 'Contact')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('stores.table.features', 'Features')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('stores.table.status', 'Status')}</th>
                  {canManage && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('stores.table.actions', 'Actions')}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stores.map((store) => (
                  <tr key={store.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{store.name}</p>
                        <p className="text-sm text-gray-500">{store.slug}</p>
                        {store.code && <p className="text-xs text-gray-400">{store.code}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-gray-600">
                          {store.address && <p>{store.address}</p>}
                          {store.city && <p>{store.city}{store.postal_code ? `, ${store.postal_code}` : ''}</p>}
                          {!store.address && !store.city && <p className="text-gray-400">-</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {store.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {store.phone}
                          </div>
                        )}
                        {store.email && <p>{store.email}</p>}
                        {!store.phone && !store.email && <span className="text-gray-400">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {store.kds_enabled ? <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">KDS</span> : null}
                        {store.kiosk_enabled ? <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">Kiosk</span> : null}
                        {store.online_ordering_enabled ? <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Online</span> : null}
                        {store.qr_ordering_enabled ? <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">QR</span> : null}
                        {!store.kds_enabled && !store.kiosk_enabled && !store.online_ordering_enabled && !store.qr_ordering_enabled && (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {store.is_active ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 flex items-center gap-1 w-fit">
                          <CheckCircle className="w-3 h-3" />
                          {t('stores.status.active', 'Active')}
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3" />
                          {t('stores.status.inactive', 'Inactive')}
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(store)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title={t('stores.actions.edit', 'Edit')}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(store.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title={t('stores.actions.delete', 'Delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingId ? t('stores.edit', 'Edit Store') : t('stores.add', 'Add Store')}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">{t('stores.form.basicInfo', 'Basic Information')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('stores.form.name', 'Name')} *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => {
                        setForm({ ...form, name: e.target.value, slug: editingId ? form.slug : generateSlug(e.target.value) });
                      }}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('stores.form.slug', 'Slug')} *</label>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('stores.form.code', 'Code')}</label>
                    <input
                      type="text"
                      value={form.code || ''}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('stores.form.timezone', 'Timezone')}</label>
                    <input
                      type="text"
                      value={form.timezone || 'UTC'}
                      onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">{t('stores.form.location', 'Location')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('stores.form.address', 'Address')}</label>
                    <input
                      type="text"
                      value={form.address || ''}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('stores.form.city', 'City')}</label>
                    <input
                      type="text"
                      value={form.city || ''}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('stores.form.postalCode', 'Postal Code')}</label>
                    <input
                      type="text"
                      value={form.postal_code || ''}
                      onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('stores.form.phone', 'Phone')}</label>
                    <input
                      type="text"
                      value={form.phone || ''}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('stores.form.email', 'Email')}</label>
                    <input
                      type="email"
                      value={form.email || ''}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Restaurant Settings */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">{t('stores.form.restaurantSettings', 'Restaurant Settings')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('stores.form.tableCount', 'Table Count')}</label>
                    <input
                      type="number"
                      min="0"
                      value={form.table_count || 0}
                      onChange={(e) => setForm({ ...form, table_count: parseInt(e.target.value) || 0 })}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('stores.form.taxRate', 'Default Tax Rate %')}</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.default_tax_rate || 0}
                      onChange={(e) => setForm({ ...form, default_tax_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('stores.form.serviceCharge', 'Service Charge %')}</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.service_charge_rate || 0}
                      onChange={(e) => setForm({ ...form, service_charge_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Printer IPs */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">{t('stores.form.printers', 'Printer Configuration')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('stores.form.kitchenPrinter', 'Kitchen Printer IP')}</label>
                    <input
                      type="text"
                      value={form.kitchen_printer_ip || ''}
                      onChange={(e) => setForm({ ...form, kitchen_printer_ip: e.target.value })}
                      placeholder="192.168.1.100"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('stores.form.barPrinter', 'Bar Printer IP')}</label>
                    <input
                      type="text"
                      value={form.bar_printer_ip || ''}
                      onChange={(e) => setForm({ ...form, bar_printer_ip: e.target.value })}
                      placeholder="192.168.1.101"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('stores.form.receiptPrinter', 'Receipt Printer IP')}</label>
                    <input
                      type="text"
                      value={form.receipt_printer_ip || ''}
                      onChange={(e) => setForm({ ...form, receipt_printer_ip: e.target.value })}
                      placeholder="192.168.1.102"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Feature Flags */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">{t('stores.form.features', 'Features')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { key: 'kds_enabled' as const, label: t('stores.form.kdsEnabled', 'Kitchen Display (KDS)'), icon: Monitor },
                    { key: 'kiosk_enabled' as const, label: t('stores.form.kioskEnabled', 'Kiosk Ordering') },
                    { key: 'online_ordering_enabled' as const, label: t('stores.form.onlineEnabled', 'Online Ordering') },
                    { key: 'qr_ordering_enabled' as const, label: t('stores.form.qrEnabled', 'QR Ordering') },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Active Status */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{t('stores.form.isActive', 'Active')}</span>
                </label>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? t('common.saving', 'Saving...') : (editingId ? t('common.save', 'Save') : t('stores.add', 'Add Store'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
