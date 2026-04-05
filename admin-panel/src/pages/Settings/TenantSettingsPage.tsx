import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Trash2, X, Settings, Save, Pencil } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/authStore';
import { tenantSettingService, TenantSetting } from '../../services/tenantSettingService';

const SETTING_TYPES = ['string', 'number', 'boolean', 'json'] as const;

export default function TenantSettingsPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();

  const canManage = hasPermission('settings.manage');

  const [settings, setSettings] = useState<TenantSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ setting_key: '', setting_value: '', setting_type: 'string' as string });

  if (!selectedTenant) {
    return (
      <div className="p-6 text-center text-gray-500">
        {t('common.selectTenantFirst', 'Please select a tenant first')}
      </div>
    );
  }

  useEffect(() => {
    loadSettings();
  }, [selectedTenant?.id]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await tenantSettingService.getAll();
      setSettings(data);
    } catch (error) {
      toast.error(t('tenantSettings.toast.loadFailed', 'Failed to load settings'));
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingKey(null);
    setForm({ setting_key: '', setting_value: '', setting_type: 'string' });
    setShowModal(true);
  };

  const handleEdit = (setting: TenantSetting) => {
    setEditingKey(setting.setting_key);
    setForm({
      setting_key: setting.setting_key,
      setting_value: setting.setting_value || '',
      setting_type: setting.setting_type || 'string',
    });
    setShowModal(true);
  };

  const handleDelete = async (key: string) => {
    if (!confirm(t('tenantSettings.confirm.delete', 'Are you sure you want to delete this setting?'))) return;
    try {
      await tenantSettingService.deleteByKey(key);
      toast.success(t('tenantSettings.toast.deleted', 'Setting deleted'));
      loadSettings();
    } catch (error) {
      toast.error(t('tenantSettings.toast.deleteFailed', 'Failed to delete setting'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.setting_key) {
      toast.error(t('tenantSettings.toast.keyRequired', 'Setting key is required'));
      return;
    }

    setSaving(true);
    try {
      await tenantSettingService.upsert({
        setting_key: form.setting_key,
        setting_value: form.setting_value,
        setting_type: form.setting_type as any,
      });
      toast.success(editingKey
        ? t('tenantSettings.toast.updated', 'Setting updated')
        : t('tenantSettings.toast.created', 'Setting created'));
      setShowModal(false);
      loadSettings();
    } catch (error) {
      toast.error(t('tenantSettings.toast.saveFailed', 'Failed to save setting'));
    } finally {
      setSaving(false);
    }
  };

  const formatValue = (setting: TenantSetting) => {
    if (!setting.setting_value) return <span className="text-gray-400 italic">empty</span>;
    if (setting.setting_type === 'boolean') {
      return setting.setting_value === 'true' || setting.setting_value === '1'
        ? <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">true</span>
        : <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">false</span>;
    }
    if (setting.setting_type === 'json') {
      return <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">{setting.setting_value}</code>;
    }
    return <span className="break-all">{setting.setting_value}</span>;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">{t('tenantSettings.loading', 'Loading settings...')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('tenantSettings.title', 'Settings')}</h1>
          <p className="text-gray-600 mt-1">{t('tenantSettings.subtitle', 'Manage tenant configuration settings')}</p>
        </div>
        {canManage && (
          <button
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Plus className="w-5 h-5" />
            {t('tenantSettings.add', 'Add Setting')}
          </button>
        )}
      </div>

      {/* Settings Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        {settings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Settings className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>{t('tenantSettings.empty', 'No settings configured yet.')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantSettings.table.key', 'Key')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantSettings.table.value', 'Value')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantSettings.table.type', 'Type')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantSettings.table.updated', 'Updated')}</th>
                  {canManage && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('tenantSettings.table.actions', 'Actions')}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {settings.map((setting) => (
                  <tr key={setting.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{setting.setting_key}</code>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-md">
                      {formatValue(setting)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">{setting.setting_type}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(setting.updated_at).toLocaleDateString()}
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEdit(setting)} className="text-blue-600 hover:text-blue-800 p-1">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(setting.setting_key)} className="text-red-600 hover:text-red-800 p-1">
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingKey ? t('tenantSettings.edit', 'Edit Setting') : t('tenantSettings.add', 'Add Setting')}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantSettings.form.key', 'Setting Key')} *</label>
                <input
                  type="text"
                  value={form.setting_key}
                  onChange={(e) => setForm({ ...form, setting_key: e.target.value })}
                  disabled={!!editingKey}
                  placeholder="e.g. receipt_header, default_language"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantSettings.form.type', 'Type')}</label>
                <select
                  value={form.setting_type}
                  onChange={(e) => setForm({ ...form, setting_type: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {SETTING_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantSettings.form.value', 'Value')}</label>
                {form.setting_type === 'boolean' ? (
                  <select
                    value={form.setting_value}
                    onChange={(e) => setForm({ ...form, setting_value: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : form.setting_type === 'json' ? (
                  <textarea
                    value={form.setting_value}
                    onChange={(e) => setForm({ ...form, setting_value: e.target.value })}
                    rows={5}
                    placeholder='{"key": "value"}'
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                ) : (
                  <input
                    type={form.setting_type === 'number' ? 'number' : 'text'}
                    value={form.setting_value}
                    onChange={(e) => setForm({ ...form, setting_value: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>

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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
