import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2, Download } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import tenantMenuCategoryService, { TenantMenuCategory, MasterCategoryForImport } from '../services/tenantMenuCategoryService';
import { languageService, Language } from '../services/languageService';
import { storeService, Store } from '../services/storeService';

export default function TenantMenuCategoriesPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();

  const canCreate = hasPermission('menu_categories.create');
  const canEdit = hasPermission('menu_categories.edit');
  const canDelete = hasPermission('menu_categories.delete');

  const getTranslatedName = (translations: Array<{ language_code?: string; name: string }> | undefined, fallback = '-') => {
    if (!translations || translations.length === 0) return fallback;
    return translations.find(tr => tr.language_code === i18n.language)?.name
      || translations.find(tr => tr.language_code === 'en')?.name
      || translations[0].name
      || fallback;
  };

  const [items, setItems] = useState<TenantMenuCategory[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formSlug, setFormSlug] = useState('');
  const [formStoreId, setFormStoreId] = useState<number | ''>('');
  const [formParentId, setFormParentId] = useState<number | ''>('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formShowOnWebsite, setFormShowOnWebsite] = useState(true);
  const [formShowOnPos, setFormShowOnPos] = useState(true);
  const [formShowOnKiosk, setFormShowOnKiosk] = useState(true);
  const [formVatRate, setFormVatRate] = useState('');
  const [translations, setTranslations] = useState<Array<{ language_id: number; language_code: string; name: string; description: string }>>([]);
  const [activeTab, setActiveTab] = useState('');

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [masterItems, setMasterItems] = useState<MasterCategoryForImport[]>([]);
  const [selectedMasterIds, setSelectedMasterIds] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);

  if (!selectedTenant) {
    return <div className="p-6 text-center text-gray-500">{t('common.selectTenantFirst', 'Please select a tenant first')}</div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsData, langsData, storesData] = await Promise.all([
        tenantMenuCategoryService.getAll(),
        languageService.getLanguages(),
        storeService.getAll(),
      ]);
      setItems(itemsData);
      const activeLangs = langsData.filter((l: Language) => l.is_active);
      setLanguages(activeLangs);
      setStores(storesData);
      if (activeLangs.length > 0 && !activeTab) setActiveTab(activeLangs[0].code);
    } catch (error) {
      toast.error(t('tenantMenuCategories.fetchError', 'Failed to load menu categories'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedTenant?.id]);

  const getParentName = (parentId: number | null) => {
    if (!parentId) return '-';
    const parent = items.find(i => i.id === parentId);
    return parent ? getTranslatedName(parent.translations, parent.slug) : '-';
  };

  const getStoreName = (storeId: number | null) => {
    if (!storeId) return t('tenantMenuCategories.allStores', 'All Stores');
    const store = stores.find(s => s.id === storeId);
    return store?.name || '-';
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormSlug(''); setFormStoreId(''); setFormParentId(''); setFormImageUrl('');
    setFormSortOrder(0); setFormIsActive(true); setFormShowOnWebsite(true);
    setFormShowOnPos(true); setFormShowOnKiosk(true); setFormVatRate('');
    setTranslations(languages.map(l => ({ language_id: l.id, language_code: l.code, name: '', description: '' })));
    setActiveTab(languages[0]?.code || '');
    setShowModal(true);
  };

  const handleEdit = (item: TenantMenuCategory) => {
    setEditingId(item.id);
    setFormSlug(item.slug); setFormStoreId(item.store_id || ''); setFormParentId(item.parent_id || '');
    setFormImageUrl(item.image_url || ''); setFormSortOrder(item.sort_order);
    setFormIsActive(!!item.is_active); setFormShowOnWebsite(!!item.show_on_website);
    setFormShowOnPos(!!item.show_on_pos); setFormShowOnKiosk(!!item.show_on_kiosk);
    setFormVatRate(item.vat_rate !== null ? String(item.vat_rate) : '');
    setTranslations(languages.map(l => {
      const existing = item.translations?.find(tr => tr.language_code === l.code);
      return { language_id: l.id, language_code: l.code, name: existing?.name || '', description: existing?.description || '' };
    }));
    setActiveTab(languages[0]?.code || '');
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('tenantMenuCategories.confirmDelete', 'Are you sure?'))) return;
    try {
      await tenantMenuCategoryService.delete(id);
      toast.success(t('tenantMenuCategories.deleted', 'Deleted'));
      fetchData();
    } catch (error) {
      toast.error(t('tenantMenuCategories.deleteError', 'Failed to delete'));
    }
  };

  const handleSave = async () => {
    if (!formSlug.trim()) { toast.error(t('tenantMenuCategories.slugRequired', 'Slug is required')); return; }
    try {
      setSaving(true);
      const payload = {
        slug: formSlug, store_id: formStoreId || null, parent_id: formParentId || null,
        image_url: formImageUrl || undefined, sort_order: formSortOrder,
        is_active: formIsActive, show_on_website: formShowOnWebsite,
        show_on_pos: formShowOnPos, show_on_kiosk: formShowOnKiosk,
        vat_rate: formVatRate !== '' ? parseFloat(formVatRate) : null,
        translations: translations.filter(tr => tr.name.trim()).map(tr => ({
          language_id: tr.language_id, name: tr.name, description: tr.description || undefined,
        })),
      };
      if (editingId) {
        await tenantMenuCategoryService.update(editingId, payload);
        toast.success(t('tenantMenuCategories.updated', 'Updated'));
      } else {
        await tenantMenuCategoryService.create(payload);
        toast.success(t('tenantMenuCategories.created', 'Created'));
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('tenantMenuCategories.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const openImportModal = async () => {
    try {
      const data = await tenantMenuCategoryService.getAvailableMaster();
      setMasterItems(data);
      setSelectedMasterIds(new Set());
      setShowImportModal(true);
    } catch (error) {
      toast.error(t('tenantMenuCategories.fetchError', 'Failed to load master categories'));
    }
  };

  const handleImport = async () => {
    if (selectedMasterIds.size === 0) return;
    try {
      setImporting(true);
      const result = await tenantMenuCategoryService.importFromMaster(Array.from(selectedMasterIds));
      toast.success(t('tenantMenuCategories.importedCount', `Imported ${result.imported_count} categories`));
      setShowImportModal(false);
      fetchData();
    } catch (error) {
      toast.error(t('tenantMenuCategories.saveError', 'Failed to import'));
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

  const parentOptions = items.filter(i => i.id !== editingId);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('tenantMenuCategories.title', 'Menu Categories')}</h1>
        <div className="flex gap-2">
          {canCreate && (
            <button onClick={openImportModal} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              <Download className="w-4 h-4" /> {t('tenantMenuCategories.importFromMaster', 'Import from Master')}
            </button>
          )}
          {canCreate && (
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> {t('tenantMenuCategories.add', 'Add Category')}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantMenuCategories.slug', 'Slug')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantMenuCategories.name', 'Name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantMenuCategories.parent', 'Parent')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantMenuCategories.store', 'Store')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantMenuCategories.visibility', 'Visibility')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status', 'Status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{item.slug}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{getTranslatedName(item.translations)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{getParentName(item.parent_id)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{getStoreName(item.store_id)}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {item.show_on_website && <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Web</span>}
                      {item.show_on_pos && <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">POS</span>}
                      {item.show_on_kiosk && <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">Kiosk</span>}
                    </div>
                  </td>
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
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">{t('tenantMenuCategories.empty', 'No menu categories found')}</td></tr>
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
                {editingId ? t('tenantMenuCategories.edit', 'Edit Category') : t('tenantMenuCategories.add', 'Add Category')}
              </h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantMenuCategories.slug', 'Slug')} *</label>
                  <input type="text" value={formSlug} onChange={e => setFormSlug(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantMenuCategories.parent', 'Parent Category')}</label>
                  <select value={formParentId} onChange={e => setFormParentId(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">{t('tenantMenuCategories.noParent', '-- No Parent --')}</option>
                    {parentOptions.map(cat => (
                      <option key={cat.id} value={cat.id}>{getTranslatedName(cat.translations, cat.slug)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantMenuCategories.store', 'Store')}</label>
                  <select value={formStoreId} onChange={e => setFormStoreId(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">{t('tenantMenuCategories.allStores', 'All Stores')}</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantMenuCategories.vatRate', 'VAT Rate (%)')}</label>
                  <input type="number" step="0.01" value={formVatRate} onChange={e => setFormVatRate(e.target.value)}
                    placeholder="e.g. 18.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantMenuCategories.imageUrl', 'Image URL')}</label>
                <input type="text" value={formImageUrl} onChange={e => setFormImageUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantMenuCategories.sortOrder', 'Sort Order')}</label>
                  <input type="number" value={formSortOrder} onChange={e => setFormSortOrder(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formIsActive} onChange={e => setFormIsActive(e.target.checked)} className="rounded" />
                  <span className="text-sm text-gray-700">{t('common.active', 'Active')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formShowOnWebsite} onChange={e => setFormShowOnWebsite(e.target.checked)} className="rounded" />
                  <span className="text-sm text-gray-700">{t('tenantMenuCategories.showOnWebsite', 'Website')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formShowOnPos} onChange={e => setFormShowOnPos(e.target.checked)} className="rounded" />
                  <span className="text-sm text-gray-700">{t('tenantMenuCategories.showOnPos', 'POS')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formShowOnKiosk} onChange={e => setFormShowOnKiosk(e.target.checked)} className="rounded" />
                  <span className="text-sm text-gray-700">{t('tenantMenuCategories.showOnKiosk', 'Kiosk')}</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('tenantMenuCategories.translations', 'Translations')}</label>
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
                        {t('tenantMenuCategories.translationName', 'Name')} ({tr.language_code.toUpperCase()})
                      </label>
                      <input type="text" value={tr.name}
                        onChange={e => setTranslations(prev => prev.map(p => p.language_code === tr.language_code ? { ...p, name: e.target.value } : p))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('tenantMenuCategories.translationDescription', 'Description')} ({tr.language_code.toUpperCase()})
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
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                {t('common.cancel', 'Cancel')}
              </button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import from Master Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{t('tenantMenuCategories.importTitle', 'Import from Master Categories')}</h2>
              <button onClick={() => setShowImportModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-4">{t('tenantMenuCategories.importSubtitle', 'Select master categories to import into your tenant.')}</p>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setSelectedMasterIds(new Set(masterItems.filter(m => !m.is_imported).map(m => m.id)))}
                  className="text-xs text-blue-600 hover:underline">{t('tenantMenuCategories.selectAll', 'Select All')}</button>
                <button onClick={() => setSelectedMasterIds(new Set())}
                  className="text-xs text-gray-500 hover:underline">{t('tenantMenuCategories.deselectAll', 'Deselect All')}</button>
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
                    {item.is_imported && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        {t('tenantMenuCategories.alreadyImported', 'Imported')}
                      </span>
                    )}
                  </label>
                ))}
                {masterItems.length === 0 && (
                  <p className="text-center text-gray-500 py-4">{t('tenantMenuCategories.noMasterAvailable', 'No master categories available')}</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between p-6 border-t">
              <span className="text-sm text-gray-500">{selectedMasterIds.size} {t('tenantMenuCategories.selected', 'selected')}</span>
              <div className="flex gap-3">
                <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                  {t('common.cancel', 'Cancel')}
                </button>
                <button onClick={handleImport} disabled={importing || selectedMasterIds.size === 0}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : t('tenantMenuCategories.importSelected', 'Import Selected')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
