import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2, Download } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import tenantOrderDestinationService, { TenantOrderDestination, MasterOrderDestForImport } from '../services/tenantOrderDestinationService';
import { languageService, Language } from '../services/languageService';

export default function TenantOrderDestinationsPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();

  const canCreate = hasPermission('order_destinations.create');
  const canEdit = hasPermission('order_destinations.edit');
  const canDelete = hasPermission('order_destinations.delete');

  const getTranslatedName = (translations: Array<{ language_code?: string; name: string }> | undefined, fallback = '-') => {
    if (!translations || translations.length === 0) return fallback;
    return translations.find(tr => tr.language_code === i18n.language)?.name
      || translations.find(tr => tr.language_code === 'en')?.name
      || translations[0].name
      || fallback;
  };

  const [items, setItems] = useState<TenantOrderDestination[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [formCode, setFormCode] = useState('');
  const [formPrinterIp, setFormPrinterIp] = useState('');
  const [formKdsScreenId, setFormKdsScreenId] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [translations, setTranslations] = useState<Array<{ language_id: number; language_code: string; name: string }>>([]);
  const [activeTab, setActiveTab] = useState('');

  const [showImportModal, setShowImportModal] = useState(false);
  const [masterItems, setMasterItems] = useState<MasterOrderDestForImport[]>([]);
  const [selectedMasterIds, setSelectedMasterIds] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);

  if (!selectedTenant) {
    return <div className="p-6 text-center text-gray-500">{t('common.selectTenantFirst', 'Please select a tenant first')}</div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsData, langsData] = await Promise.all([
        tenantOrderDestinationService.getAll(),
        languageService.getLanguages(),
      ]);
      setItems(itemsData);
      const activeLangs = langsData.filter((l: Language) => l.is_active);
      setLanguages(activeLangs);
      if (activeLangs.length > 0 && !activeTab) setActiveTab(activeLangs[0].code);
    } catch (error) {
      toast.error(t('tenantOrderDestinations.fetchError', 'Failed to load'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedTenant?.id]);

  const handleCreate = () => {
    setEditingId(null);
    setFormCode(''); setFormPrinterIp(''); setFormKdsScreenId(''); setFormSortOrder(0); setFormIsActive(true);
    setTranslations(languages.map(l => ({ language_id: l.id, language_code: l.code, name: '' })));
    setActiveTab(languages[0]?.code || '');
    setShowModal(true);
  };

  const handleEdit = (item: TenantOrderDestination) => {
    setEditingId(item.id);
    setFormCode(item.code); setFormPrinterIp(item.printer_ip || '');
    setFormKdsScreenId(item.kds_screen_id !== null ? String(item.kds_screen_id) : '');
    setFormSortOrder(item.sort_order); setFormIsActive(!!item.is_active);
    setTranslations(languages.map(l => {
      const existing = item.translations?.find(tr => tr.language_code === l.code);
      return { language_id: l.id, language_code: l.code, name: existing?.name || '' };
    }));
    setActiveTab(languages[0]?.code || '');
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('tenantOrderDestinations.confirmDelete', 'Are you sure?'))) return;
    try {
      await tenantOrderDestinationService.delete(id);
      toast.success(t('tenantOrderDestinations.deleted', 'Deleted'));
      fetchData();
    } catch (error) {
      toast.error(t('tenantOrderDestinations.deleteError', 'Failed to delete'));
    }
  };

  const handleSave = async () => {
    if (!formCode.trim()) { toast.error(t('tenantOrderDestinations.codeRequired', 'Code is required')); return; }
    try {
      setSaving(true);
      const payload = {
        code: formCode, printer_ip: formPrinterIp || undefined,
        kds_screen_id: formKdsScreenId !== '' ? parseInt(formKdsScreenId) : null,
        sort_order: formSortOrder, is_active: formIsActive,
        translations: translations.filter(tr => tr.name.trim()).map(tr => ({ language_id: tr.language_id, name: tr.name })),
      };
      if (editingId) {
        await tenantOrderDestinationService.update(editingId, payload);
        toast.success(t('tenantOrderDestinations.updated', 'Updated'));
      } else {
        await tenantOrderDestinationService.create(payload);
        toast.success(t('tenantOrderDestinations.created', 'Created'));
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('tenantOrderDestinations.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const openImportModal = async () => {
    try {
      const data = await tenantOrderDestinationService.getAvailableMaster();
      setMasterItems(data);
      setSelectedMasterIds(new Set());
      setShowImportModal(true);
    } catch (error) {
      toast.error(t('tenantOrderDestinations.fetchError', 'Failed to load'));
    }
  };

  const handleImport = async () => {
    if (selectedMasterIds.size === 0) return;
    try {
      setImporting(true);
      const result = await tenantOrderDestinationService.importFromMaster(Array.from(selectedMasterIds));
      toast.success(t('tenantOrderDestinations.importedCount', `Imported ${result.imported_count}`));
      setShowImportModal(false);
      fetchData();
    } catch (error) {
      toast.error(t('tenantOrderDestinations.saveError', 'Failed to import'));
    } finally {
      setImporting(false);
    }
  };

  const toggleMasterId = (id: number) => {
    setSelectedMasterIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('tenantOrderDestinations.title', 'Order Destinations')}</h1>
        <div className="flex gap-2">
          {canCreate && (
            <button onClick={openImportModal} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              <Download className="w-4 h-4" /> {t('tenantOrderDestinations.importFromMaster', 'Import from Master')}
            </button>
          )}
          {canCreate && (
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> {t('tenantOrderDestinations.add', 'Add Destination')}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantOrderDestinations.code', 'Code')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantOrderDestinations.name', 'Name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantOrderDestinations.printerIp', 'Printer IP')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantOrderDestinations.kdsScreen', 'KDS Screen')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status', 'Status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{item.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{getTranslatedName(item.translations)}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-500">{item.printer_ip || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.kds_screen_id ?? '-'}</td>
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
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">{t('tenantOrderDestinations.empty', 'No order destinations found')}</td></tr>
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
                {editingId ? t('tenantOrderDestinations.edit', 'Edit Destination') : t('tenantOrderDestinations.add', 'Add Destination')}
              </h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantOrderDestinations.code', 'Code')} *</label>
                <input type="text" value={formCode} onChange={e => setFormCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantOrderDestinations.printerIp', 'Printer IP')}</label>
                <input type="text" value={formPrinterIp} onChange={e => setFormPrinterIp(e.target.value)}
                  placeholder="192.168.1.100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantOrderDestinations.kdsScreen', 'KDS Screen ID')}</label>
                <input type="number" value={formKdsScreenId} onChange={e => setFormKdsScreenId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantOrderDestinations.sortOrder', 'Sort Order')}</label>
                <input type="number" value={formSortOrder} onChange={e => setFormSortOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formIsActive} onChange={e => setFormIsActive(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">{t('common.active', 'Active')}</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('tenantOrderDestinations.translations', 'Translations')}</label>
                <div className="flex gap-1 border-b mb-3">
                  {languages.map(lang => (
                    <button key={lang.code} onClick={() => setActiveTab(lang.code)}
                      className={`px-3 py-2 text-sm font-medium border-b-2 ${activeTab === lang.code ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                      {lang.code.toUpperCase()}
                    </button>
                  ))}
                </div>
                {translations.filter(tr => tr.language_code === activeTab).map(tr => (
                  <div key={tr.language_code}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('tenantOrderDestinations.translationName', 'Name')} ({tr.language_code.toUpperCase()})
                    </label>
                    <input type="text" value={tr.name}
                      onChange={e => setTranslations(prev => prev.map(p => p.language_code === tr.language_code ? { ...p, name: e.target.value } : p))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                ))}
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

      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{t('tenantOrderDestinations.importTitle', 'Import from Master')}</h2>
              <button onClick={() => setShowImportModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-4">{t('tenantOrderDestinations.importSubtitle', 'Select destinations to import.')}</p>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setSelectedMasterIds(new Set(masterItems.filter(m => !m.is_imported).map(m => m.id)))}
                  className="text-xs text-blue-600 hover:underline">{t('tenantOrderDestinations.selectAll', 'Select All')}</button>
                <button onClick={() => setSelectedMasterIds(new Set())}
                  className="text-xs text-gray-500 hover:underline">{t('tenantOrderDestinations.deselectAll', 'Deselect All')}</button>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {masterItems.map(item => (
                  <label key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border ${item.is_imported ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50 cursor-pointer'}`}>
                    <input type="checkbox" disabled={item.is_imported} checked={selectedMasterIds.has(item.id)}
                      onChange={() => toggleMasterId(item.id)} className="rounded" />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{getTranslatedName(item.translations, item.code)}</span>
                      <span className="text-xs text-gray-400 ml-2">({item.code})</span>
                    </div>
                    {item.is_imported && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{t('tenantOrderDestinations.alreadyImported', 'Imported')}</span>}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between p-6 border-t">
              <span className="text-sm text-gray-500">{selectedMasterIds.size} {t('tenantOrderDestinations.selected', 'selected')}</span>
              <div className="flex gap-3">
                <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">{t('common.cancel', 'Cancel')}</button>
                <button onClick={handleImport} disabled={importing || selectedMasterIds.size === 0}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : t('tenantOrderDestinations.importSelected', 'Import Selected')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
