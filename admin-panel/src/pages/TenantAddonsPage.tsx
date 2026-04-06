import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2, Download } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import tenantAddonService, { TenantAddon, MasterAddonForImport } from '../services/tenantAddonService';
import tenantAddonTypeService, { TenantAddonType } from '../services/tenantAddonTypeService';
import { languageService, Language } from '../services/languageService';
import { currencyService, Currency } from '../services/currencyService';

export default function TenantAddonsPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();

  const canCreate = hasPermission('addons.create');
  const canEdit = hasPermission('addons.edit');
  const canDelete = hasPermission('addons.delete');

  const getTranslatedName = (translations: Array<{ language_code?: string; name: string }> | undefined, fallback = '-') => {
    if (!translations || translations.length === 0) return fallback;
    return translations.find(tr => tr.language_code === i18n.language)?.name
      || translations.find(tr => tr.language_code === 'en')?.name
      || translations[0].name
      || fallback;
  };

  const [items, setItems] = useState<TenantAddon[]>([]);
  const [addonTypes, setAddonTypes] = useState<TenantAddonType[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [formAddonTypeId, setFormAddonTypeId] = useState<number | ''>('');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [translations, setTranslations] = useState<Array<{ language_id: number; language_code: string; name: string; description: string }>>([]);
  const [formPrices, setFormPrices] = useState<Array<{ store_id: number | null; currency_id: number; price: string; is_active: boolean }>>([]);
  const [activeTab, setActiveTab] = useState('');

  const [showImportModal, setShowImportModal] = useState(false);
  const [masterItems, setMasterItems] = useState<MasterAddonForImport[]>([]);
  const [selectedMasterIds, setSelectedMasterIds] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);

  if (!selectedTenant) {
    return <div className="p-6 text-center text-gray-500">{t('common.selectTenantFirst', 'Please select a tenant first')}</div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsData, typesData, langsData, currData] = await Promise.all([
        tenantAddonService.getAll(),
        tenantAddonTypeService.getAll(),
        languageService.getLanguages(),
        currencyService.getCurrencies(),
      ]);
      setItems(itemsData);
      setAddonTypes(typesData);
      const activeLangs = langsData.filter((l: Language) => l.is_active);
      setLanguages(activeLangs);
      setCurrencies(currData);
      if (activeLangs.length > 0 && !activeTab) setActiveTab(activeLangs[0].code);
    } catch (error) {
      toast.error(t('tenantAddons.fetchError', 'Failed to load addons'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedTenant?.id]);

  const getAddonTypeName = (typeId: number) => {
    const type = addonTypes.find(at => at.id === typeId);
    return type ? getTranslatedName(type.translations, type.code) : '-';
  };

  const initPrices = () => {
    if (currencies.length === 0) return [];
    return currencies.map(c => ({ store_id: null, currency_id: c.id, price: '0.00', is_active: true }));
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormAddonTypeId(''); setFormSortOrder(0); setFormIsActive(true);
    setTranslations(languages.map(l => ({ language_id: l.id, language_code: l.code, name: '', description: '' })));
    setFormPrices(initPrices());
    setActiveTab(languages[0]?.code || '');
    setShowModal(true);
  };

  const handleEdit = (item: TenantAddon) => {
    setEditingId(item.id);
    setFormAddonTypeId(item.tenant_addon_type_id); setFormSortOrder(item.sort_order); setFormIsActive(!!item.is_active);
    setTranslations(languages.map(l => {
      const existing = item.translations?.find(tr => tr.language_code === l.code);
      return { language_id: l.id, language_code: l.code, name: existing?.name || '', description: existing?.description || '' };
    }));
    const prices = currencies.map(c => {
      const existing = item.prices?.find(p => p.currency_id === c.id && p.store_id === null);
      return { store_id: null, currency_id: c.id, price: existing ? String(existing.price) : '0.00', is_active: existing ? !!existing.is_active : true };
    });
    setFormPrices(prices);
    setActiveTab(languages[0]?.code || '');
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('tenantAddons.confirmDelete', 'Are you sure?'))) return;
    try {
      await tenantAddonService.delete(id);
      toast.success(t('tenantAddons.deleted', 'Deleted'));
      fetchData();
    } catch (error) {
      toast.error(t('tenantAddons.deleteError', 'Failed to delete'));
    }
  };

  const handleSave = async () => {
    if (!formAddonTypeId) { toast.error(t('tenantAddons.addonTypeRequired', 'Addon type is required')); return; }
    try {
      setSaving(true);
      const payload = {
        tenant_addon_type_id: formAddonTypeId as number, sort_order: formSortOrder, is_active: formIsActive,
        translations: translations.filter(tr => tr.name.trim()).map(tr => ({
          language_id: tr.language_id, name: tr.name, description: tr.description || undefined,
        })),
        prices: formPrices.filter(p => parseFloat(p.price) > 0).map(p => ({
          store_id: p.store_id, currency_id: p.currency_id, price: parseFloat(p.price), is_active: p.is_active,
        })),
      };
      if (editingId) {
        await tenantAddonService.update(editingId, payload);
        toast.success(t('tenantAddons.updated', 'Updated'));
      } else {
        await tenantAddonService.create(payload);
        toast.success(t('tenantAddons.created', 'Created'));
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('tenantAddons.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const openImportModal = async () => {
    try {
      const data = await tenantAddonService.getAvailableMaster();
      setMasterItems(data);
      setSelectedMasterIds(new Set());
      setShowImportModal(true);
    } catch (error) {
      toast.error(t('tenantAddons.fetchError', 'Failed to load'));
    }
  };

  const handleImport = async () => {
    if (selectedMasterIds.size === 0) return;
    try {
      setImporting(true);
      const result = await tenantAddonService.importFromMaster(Array.from(selectedMasterIds));
      toast.success(t('tenantAddons.importedCount', `Imported ${result.imported_count} addons`));
      setShowImportModal(false);
      fetchData();
    } catch (error) {
      toast.error(t('tenantAddons.saveError', 'Failed to import'));
    } finally {
      setImporting(false);
    }
  };

  const toggleMasterId = (id: number) => {
    setSelectedMasterIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getMainPrice = (item: TenantAddon) => {
    const p = item.prices?.find(pr => pr.store_id === null);
    return p ? `${p.currency_symbol || ''}${p.price}` : '-';
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('tenantAddons.title', 'Addons')}</h1>
        <div className="flex gap-2">
          {canCreate && (
            <button onClick={openImportModal} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              <Download className="w-4 h-4" /> {t('tenantAddons.importFromMaster', 'Import from Master')}
            </button>
          )}
          {canCreate && (
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> {t('tenantAddons.add', 'Add Addon')}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantAddons.name', 'Name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantAddons.addonType', 'Type')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantAddons.price', 'Price')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantAddons.sortOrder', 'Sort')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status', 'Status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{getTranslatedName(item.translations)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{getAddonTypeName(item.tenant_addon_type_id)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-mono">{getMainPrice(item)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.sort_order}</td>
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
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">{t('tenantAddons.empty', 'No addons found')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">
                {editingId ? t('tenantAddons.edit', 'Edit Addon') : t('tenantAddons.add', 'Add Addon')}
              </h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantAddons.addonType', 'Addon Type')} *</label>
                  <select value={formAddonTypeId} onChange={e => setFormAddonTypeId(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">{t('tenantAddons.selectType', '-- Select Type --')}</option>
                    {addonTypes.map(at => (
                      <option key={at.id} value={at.id}>{getTranslatedName(at.translations, at.code)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantAddons.sortOrder', 'Sort Order')}</label>
                  <input type="number" value={formSortOrder} onChange={e => setFormSortOrder(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formIsActive} onChange={e => setFormIsActive(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">{t('common.active', 'Active')}</span>
              </label>

              {/* Prices */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('tenantAddons.prices', 'Prices')}</label>
                <div className="space-y-2">
                  {formPrices.map((p, idx) => {
                    const curr = currencies.find(c => c.id === p.currency_id);
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-sm font-medium w-16">{curr?.code || ''}</span>
                        <input type="number" step="0.01" value={p.price}
                          onChange={e => setFormPrices(prev => prev.map((pp, i) => i === idx ? { ...pp, price: e.target.value } : pp))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Translations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('tenantAddons.translations', 'Translations')}</label>
                <div className="flex gap-1 border-b mb-3">
                  {languages.map(lang => (
                    <button key={lang.code} onClick={() => setActiveTab(lang.code)}
                      className={`px-3 py-2 text-sm font-medium border-b-2 ${activeTab === lang.code ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                      {lang.code.toUpperCase()}
                    </button>
                  ))}
                </div>
                {translations.filter(tr => tr.language_code === activeTab).map(tr => (
                  <div key={tr.language_code} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('tenantAddons.translationName', 'Name')} ({tr.language_code.toUpperCase()})
                      </label>
                      <input type="text" value={tr.name}
                        onChange={e => setTranslations(prev => prev.map(p => p.language_code === tr.language_code ? { ...p, name: e.target.value } : p))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('tenantAddons.translationDescription', 'Description')} ({tr.language_code.toUpperCase()})
                      </label>
                      <textarea value={tr.description} rows={2}
                        onChange={e => setTranslations(prev => prev.map(p => p.language_code === tr.language_code ? { ...p, description: e.target.value } : p))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
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

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{t('tenantAddons.importTitle', 'Import from Master Addons')}</h2>
              <button onClick={() => setShowImportModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-4">{t('tenantAddons.importSubtitle', 'Select addons to import. Matching addon types must be imported first.')}</p>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setSelectedMasterIds(new Set(masterItems.filter(m => !m.is_imported).map(m => m.id)))}
                  className="text-xs text-blue-600 hover:underline">{t('tenantAddons.selectAll', 'Select All')}</button>
                <button onClick={() => setSelectedMasterIds(new Set())}
                  className="text-xs text-gray-500 hover:underline">{t('tenantAddons.deselectAll', 'Deselect All')}</button>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {masterItems.map(item => (
                  <label key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border ${item.is_imported ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50 cursor-pointer'}`}>
                    <input type="checkbox" disabled={item.is_imported} checked={selectedMasterIds.has(item.id)}
                      onChange={() => toggleMasterId(item.id)} className="rounded" />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{getTranslatedName(item.translations, item.code)}</span>
                      <span className="text-xs text-gray-400 ml-2">({item.addon_type_code})</span>
                    </div>
                    {item.is_imported && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{t('tenantAddons.alreadyImported', 'Imported')}</span>}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between p-6 border-t">
              <span className="text-sm text-gray-500">{selectedMasterIds.size} {t('tenantAddons.selected', 'selected')}</span>
              <div className="flex gap-3">
                <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">{t('common.cancel', 'Cancel')}</button>
                <button onClick={handleImport} disabled={importing || selectedMasterIds.size === 0}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : t('tenantAddons.importSelected', 'Import Selected')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
