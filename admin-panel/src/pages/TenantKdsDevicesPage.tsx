import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, RefreshCw, Copy, Check } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import kdsDeviceService, { KdsDeviceListRow, CreatedPairingCode } from '../services/frontend-kdsDeviceService';
import tenantOrderDestinationService, { TenantOrderDestination } from '../services/tenantOrderDestinationService';
import { storeService, Store } from '../services/storeService';

export default function TenantKdsDevicesPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();
  const canManage = hasPermission('kds.manage_device');

  const [devices, setDevices] = useState<KdsDeviceListRow[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [destinations, setDestinations] = useState<TenantOrderDestination[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [formStoreId, setFormStoreId] = useState<number | ''>('');
  const [formDestId, setFormDestId] = useState<number | ''>('');
  const [formName, setFormName] = useState('');
  const [saving, setSaving] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<CreatedPairingCode | null>(null);
  const [copied, setCopied] = useState(false);

  const getTranslatedName = (translations: Array<{ language_code?: string; name: string }> | undefined, fallback = '-') => {
    if (!translations || translations.length === 0) return fallback;
    return translations.find(tr => tr.language_code === i18n.language)?.name
      || translations.find(tr => tr.language_code === 'en')?.name
      || translations[0].name
      || fallback;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [devicesData, storesData, destsData] = await Promise.all([
        kdsDeviceService.list(),
        storeService.getAll({ is_active: true }),
        tenantOrderDestinationService.getAll(),
      ]);
      setDevices(devicesData);
      setStores(storesData);
      setDestinations(destsData);
    } catch {
      toast.error(t('kdsDevices.fetchError', 'Failed to load KDS devices'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTenant) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant?.id]);

  if (!selectedTenant) {
    return <div className="p-6 text-center text-gray-500">{t('common.selectTenantFirst', 'Please select a tenant first')}</div>;
  }

  const openCreate = () => {
    setFormStoreId('');
    setFormDestId('');
    setFormName('');
    setGeneratedCode(null);
    setCopied(false);
    setShowModal(true);
  };

  const handleCreate = async () => {
    if (!formStoreId || !formDestId) {
      toast.error(t('kdsDevices.form.required', 'Select a store and destination'));
      return;
    }
    try {
      setSaving(true);
      const result = await kdsDeviceService.createPairingCode({
        store_id: Number(formStoreId),
        tenant_order_destination_id: Number(formDestId),
        name: formName.trim() || null,
      });
      setGeneratedCode(result);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('kdsDevices.form.error', 'Failed to create code'));
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode.pairing_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t('common.copyError', 'Copy failed'));
    }
  };

  const handleRevoke = async (row: KdsDeviceListRow) => {
    if (!confirm(t('kdsDevices.confirmRevoke', 'Revoke this device? It will need to be re-paired.'))) return;
    try {
      await kdsDeviceService.revoke(row.id);
      toast.success(t('kdsDevices.revoked', 'Device revoked'));
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('kdsDevices.revokeError', 'Failed to revoke'));
    }
  };

  const deviceStatus = (d: KdsDeviceListRow): string => {
    if (!d.is_active) return t('kdsDevices.status.revoked', 'Revoked');
    if (d.paired_at) return t('kdsDevices.status.paired', 'Paired');
    if (d.pairing_code && d.pairing_code_expires_at && new Date(d.pairing_code_expires_at) > new Date()) {
      return t('kdsDevices.status.awaitingPair', 'Awaiting pair');
    }
    return t('kdsDevices.status.expired', 'Code expired');
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('kdsDevices.title', 'KDS Devices')}</h1>
          <p className="text-sm text-gray-500">{t('kdsDevices.subtitle', 'Pair a kitchen display to a specific store and destination.')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
          </button>
          {canManage && (
            <button onClick={openCreate}
              className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm">
              <Plus className="w-4 h-4" /> {t('kdsDevices.new', 'New Pairing Code')}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>
      ) : devices.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center text-gray-500">
          {t('kdsDevices.empty', 'No KDS devices yet. Click "New Pairing Code" to create one.')}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2">{t('kdsDevices.name', 'Name')}</th>
                <th className="text-left px-4 py-2">{t('kdsDevices.store', 'Store')}</th>
                <th className="text-left px-4 py-2">{t('kdsDevices.destination', 'Destination')}</th>
                <th className="text-left px-4 py-2">{t('kdsDevices.statusCol', 'Status')}</th>
                <th className="text-left px-4 py-2">{t('kdsDevices.code', 'Code')}</th>
                <th className="text-left px-4 py-2">{t('kdsDevices.lastSeen', 'Last seen')}</th>
                <th className="text-right px-4 py-2">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(d => (
                <tr key={d.id} className="border-t">
                  <td className="px-4 py-2">{d.name || `#${d.id}`}</td>
                  <td className="px-4 py-2">{d.store_name || '-'}</td>
                  <td className="px-4 py-2">{d.destination_name || '-'}</td>
                  <td className="px-4 py-2">{deviceStatus(d)}</td>
                  <td className="px-4 py-2 font-mono">{d.paired_at ? '-' : (d.pairing_code || '-')}</td>
                  <td className="px-4 py-2 text-gray-500">{d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : '-'}</td>
                  <td className="px-4 py-2 text-right">
                    {canManage && d.is_active && (
                      <button onClick={() => handleRevoke(d)} className="text-red-600 hover:text-red-800" title={t('kdsDevices.revoke', 'Revoke')}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{t('kdsDevices.newPairing', 'New Pairing Code')}</h3>

            {!generatedCode ? (
              <>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('kdsDevices.store', 'Store')}</label>
                    <select value={formStoreId}
                      onChange={e => setFormStoreId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full border border-gray-300 rounded px-3 py-2">
                      <option value="">—</option>
                      {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('kdsDevices.destination', 'Destination')}</label>
                    <select value={formDestId}
                      onChange={e => setFormDestId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full border border-gray-300 rounded px-3 py-2">
                      <option value="">—</option>
                      {destinations.filter(d => d.is_active).map(d => (
                        <option key={d.id} value={d.id}>{getTranslatedName(d.translations, d.code)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('kdsDevices.nameOptional', 'Name (optional)')}</label>
                    <input value={formName} onChange={e => setFormName(e.target.value)}
                      placeholder={t('kdsDevices.namePlaceholder', 'e.g. "Kitchen Station 1"')}
                      className="w-full border border-gray-300 rounded px-3 py-2" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button onClick={handleCreate} disabled={saving}
                    className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t('kdsDevices.generateCode', 'Generate code')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-2">{t('kdsDevices.codeInstructions', 'Enter this code on the KDS display to pair it. The code expires soon.')}</p>
                <div className="bg-amber-50 border-2 border-amber-300 rounded-lg py-6 px-4 text-center mb-3">
                  <div className="text-5xl font-mono font-bold tracking-widest text-amber-800">
                    {generatedCode.pairing_code}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {t('kdsDevices.expiresAt', 'Expires at')}: {new Date(generatedCode.expires_at).toLocaleTimeString()}
                  </div>
                </div>
                <div className="flex justify-between">
                  <button onClick={handleCopy}
                    className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm flex items-center gap-2">
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? t('common.copied', 'Copied') : t('common.copy', 'Copy')}
                  </button>
                  <button onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 text-sm">
                    {t('common.done', 'Done')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
