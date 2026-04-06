import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import tenantMenuItemService, { TenantMenuItem } from '../services/tenantMenuItemService';
import tenantMenuCategoryService, { TenantMenuCategory } from '../services/tenantMenuCategoryService';
import tenantOrderDestinationService, { TenantOrderDestination } from '../services/tenantOrderDestinationService';
import { languageService, Language } from '../services/languageService';
import { currencyService, Currency } from '../services/currencyService';

export default function TenantMenuItemsPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();

  const canCreate = hasPermission('menu_items.create');
  const canEdit = hasPermission('menu_items.edit');
  const canDelete = hasPermission('menu_items.delete');

  const getTranslatedName = (translations: Array<{ language_code?: string; name: string }> | undefined, fallback = '-') => {
    if (!translations || translations.length === 0) return fallback;
    return translations.find(tr => tr.language_code === i18n.language)?.name
      || translations.find(tr => tr.language_code === 'en')?.name
      || translations[0].name
      || fallback;
  };

  const [items, setItems] = useState<TenantMenuItem[]>([]);
  const [categories, setCategories] = useState<TenantMenuCategory[]>([]);
  const [destinations, setDestinations] = useState<TenantOrderDestination[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [formCategoryId, setFormCategoryId] = useState<number | ''>('');
  const [formDestinationId, setFormDestinationId] = useState<number | ''>('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formVatRate, setFormVatRate] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsWeighted, setFormIsWeighted] = useState(false);
  const [formIsCombo, setFormIsCombo] = useState(false);
  const [formShowOnWebsite, setFormShowOnWebsite] = useState(true);
  const [formShowOnPos, setFormShowOnPos] = useState(true);
  const [formShowOnKiosk, setFormShowOnKiosk] = useState(true);
  const [translations, setTranslations] = useState<Array<{ language_id: number; language_code: string; name: string; slug: string; description: string; short_description: string }>>([]);
  const [formPrices, setFormPrices] = useState<Array<{ store_id: number | null; currency_id: number; price: string; is_active: boolean }>>([]);
  const [activeTab, setActiveTab] = useState('');

  if (!selectedTenant) {
    return <div className="p-6 text-center text-gray-500">{t('common.selectTenantFirst', 'Please select a tenant first')}</div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsData, catsData, destsData, langsData, currData] = await Promise.all([
        tenantMenuItemService.getAll(),
        tenantMenuCategoryService.getAll(),
        tenantOrderDestinationService.getAll(),
        languageService.getLanguages(),
        currencyService.getCurrencies(),
      ]);
      setItems(itemsData);
      setCategories(catsData);
      setDestinations(destsData);
      const activeLangs = langsData.filter((l: Language) => l.is_active);
      setLanguages(activeLangs);
      setCurrencies(currData);
      if (activeLangs.length > 0 && !activeTab) setActiveTab(activeLangs[0].code);
    } catch (error) {
      toast.error(t('tenantMenuItems.fetchError', 'Failed to load menu items'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedTenant?.id]);

  const getCategoryName = (catId: number | null) => {
    if (!catId) return '-';
    const cat = categories.find(c => c.id === catId);
    return cat ? getTranslatedName(cat.translations, '-') : '-';
  };

  const getDestinationName = (destId: number | null) => {
    if (!destId) return '-';
    const dest = destinations.find(d => d.id === destId);
    return dest ? getTranslatedName(dest.translations, dest.code) : '-';
  };

  const initPrices = () => {
    if (currencies.length === 0) return [];
    return currencies.map(c => ({ store_id: null, currency_id: c.id, price: '0.00', is_active: true }));
  };

  const getMainPrice = (item: TenantMenuItem) => {
    const p = item.prices?.find(pr => pr.store_id === null);
    return p ? `${p.currency_symbol || ''}${p.price}` : '-';
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormCategoryId(''); setFormDestinationId(''); setFormImageUrl('');
    setFormSortOrder(0); setFormVatRate(''); setFormIsActive(true);
    setFormIsWeighted(false); setFormIsCombo(false);
    setFormShowOnWebsite(true); setFormShowOnPos(true); setFormShowOnKiosk(true);
    setTranslations(languages.map(l => ({ language_id: l.id, language_code: l.code, name: '', slug: '', description: '', short_description: '' })));
    setFormPrices(initPrices());
    setActiveTab(languages[0]?.code || '');
    setShowModal(true);
  };

  const handleEdit = (item: TenantMenuItem) => {
    setEditingId(item.id);
    setFormCategoryId(item.tenant_menu_category_id || '');
    setFormDestinationId(item.tenant_order_destination_id || '');
    setFormImageUrl(item.image_url || '');
    setFormSortOrder(item.sort_order);
    setFormVatRate(item.vat_rate != null ? String(item.vat_rate) : '');
    setFormIsActive(!!item.is_active);
    setFormIsWeighted(!!item.is_weighted);
    setFormIsCombo(!!item.is_combo);
    setFormShowOnWebsite(!!item.show_on_website);
    setFormShowOnPos(!!item.show_on_pos);
    setFormShowOnKiosk(!!item.show_on_kiosk);
    setTranslations(languages.map(l => {
      const existing = item.translations?.find(tr => tr.language_code === l.code);
      return {
        language_id: l.id, language_code: l.code,
        name: existing?.name || '', slug: existing?.slug || '',
        description: existing?.description || '', short_description: existing?.short_description || '',
      };
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
    if (!confirm(t('tenantMenuItems.confirmDelete', 'Are you sure?'))) return;
    try {
      await tenantMenuItemService.delete(id);
      toast.success(t('tenantMenuItems.deleted', 'Deleted'));
      fetchData();
    } catch (error) {
      toast.error(t('tenantMenuItems.deleteError', 'Failed to delete'));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload: any = {
        tenant_menu_category_id: formCategoryId || null,
        tenant_order_destination_id: formDestinationId || null,
        image_url: formImageUrl || null,
        sort_order: formSortOrder,
        vat_rate: formVatRate !== '' ? parseFloat(formVatRate) : null,
        is_active: formIsActive,
        is_weighted: formIsWeighted,
        is_combo: formIsCombo,
        show_on_website: formShowOnWebsite,
        show_on_pos: formShowOnPos,
        show_on_kiosk: formShowOnKiosk,
        translations: translations.filter(tr => tr.name.trim()).map(tr => ({
          language_id: tr.language_id, name: tr.name,
          slug: tr.slug || undefined,
          description: tr.description || undefined,
          short_description: tr.short_description || undefined,
        })),
        prices: formPrices.filter(p => parseFloat(p.price) > 0).map(p => ({
          store_id: p.store_id, currency_id: p.currency_id, price: parseFloat(p.price), is_active: p.is_active,
        })),
      };
      if (editingId) {
        await tenantMenuItemService.update(editingId, payload);
        toast.success(t('tenantMenuItems.updated', 'Updated'));
      } else {
        await tenantMenuItemService.create(payload);
        toast.success(t('tenantMenuItems.created', 'Created'));
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('tenantMenuItems.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('tenantMenuItems.title', 'Menu Items')}</h1>
        <div className="flex gap-2">
          {canCreate && (
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> {t('tenantMenuItems.add', 'Add Menu Item')}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantMenuItems.name', 'Name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantMenuItems.category', 'Category')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantMenuItems.destination', 'Destination')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantMenuItems.price', 'Price')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantMenuItems.showOn', 'Visibility')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status', 'Status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{getTranslatedName(item.translations)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{getCategoryName(item.tenant_menu_category_id)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{getDestinationName(item.tenant_order_destination_id)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-mono">{getMainPrice(item)}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {item.show_on_website && <span className="px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700">Web</span>}
                      {item.show_on_pos && <span className="px-1.5 py-0.5 text-xs rounded bg-green-100 text-green-700">POS</span>}
                      {item.show_on_kiosk && <span className="px-1.5 py-0.5 text-xs rounded bg-purple-100 text-purple-700">Kiosk</span>}
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
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">{t('tenantMenuItems.empty', 'No menu items found')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">
                {editingId ? t('tenantMenuItems.edit', 'Edit Menu Item') : t('tenantMenuItems.add', 'Add Menu Item')}
              </h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantMenuItems.category', 'Category')}</label>
                  <select value={formCategoryId} onChange={e => setFormCategoryId(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">{t('tenantMenuItems.noCategory', '-- No Category --')}</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{getTranslatedName(cat.translations, '-')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantMenuItems.destination', 'Order Destination')}</label>
                  <select value={formDestinationId} onChange={e => setFormDestinationId(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">{t('tenantMenuItems.noDestination', '-- No Destination --')}</option>
                    {destinations.map(dest => (
                      <option key={dest.id} value={dest.id}>{getTranslatedName(dest.translations, dest.code)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Settings checkboxes */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formIsActive} onChange={e => setFormIsActive(e.target.checked)} className="rounded" />
                  <span className="text-sm text-gray-700">{t('common.active', 'Active')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formIsWeighted} onChange={e => setFormIsWeighted(e.target.checked)} className="rounded" />
                  <span className="text-sm text-gray-700">{t('tenantMenuItems.isWeighted', 'Weighted Item')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formIsCombo} onChange={e => setFormIsCombo(e.target.checked)} className="rounded" />
                  <span className="text-sm text-gray-700">{t('tenantMenuItems.isCombo', 'Combo Item')}</span>
                </label>
              </div>

              {/* VAT Rate, Sort Order, Image URL */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantMenuItems.vatRate', 'VAT Rate (%)')}</label>
                  <input type="number" step="0.01" value={formVatRate} onChange={e => setFormVatRate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantMenuItems.sortOrder', 'Sort Order')}</label>
                  <input type="number" value={formSortOrder} onChange={e => setFormSortOrder(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantMenuItems.imageUrl', 'Image URL')}</label>
                  <input type="text" value={formImageUrl} onChange={e => setFormImageUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>

              {/* Visibility - Show On */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('tenantMenuItems.showOn', 'Show On')}</label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formShowOnWebsite} onChange={e => setFormShowOnWebsite(e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-700">{t('tenantMenuItems.showOnWebsite', 'Website')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formShowOnPos} onChange={e => setFormShowOnPos(e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-700">{t('tenantMenuItems.showOnPos', 'POS')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formShowOnKiosk} onChange={e => setFormShowOnKiosk(e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-700">{t('tenantMenuItems.showOnKiosk', 'Kiosk')}</span>
                  </label>
                </div>
              </div>

              {/* Prices */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('tenantMenuItems.prices', 'Prices')}</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('tenantMenuItems.translations', 'Translations')}</label>
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
                        {t('tenantMenuItems.translationName', 'Name')} ({tr.language_code.toUpperCase()})
                      </label>
                      <input type="text" value={tr.name}
                        onChange={e => setTranslations(prev => prev.map(p => p.language_code === tr.language_code ? { ...p, name: e.target.value } : p))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('tenantMenuItems.translationSlug', 'Slug')} ({tr.language_code.toUpperCase()})
                      </label>
                      <input type="text" value={tr.slug}
                        onChange={e => setTranslations(prev => prev.map(p => p.language_code === tr.language_code ? { ...p, slug: e.target.value } : p))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('tenantMenuItems.translationDescription', 'Description')} ({tr.language_code.toUpperCase()})
                      </label>
                      <textarea value={tr.description} rows={2}
                        onChange={e => setTranslations(prev => prev.map(p => p.language_code === tr.language_code ? { ...p, description: e.target.value } : p))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('tenantMenuItems.translationShortDescription', 'Short Description')} ({tr.language_code.toUpperCase()})
                      </label>
                      <input type="text" value={tr.short_description}
                        onChange={e => setTranslations(prev => prev.map(p => p.language_code === tr.language_code ? { ...p, short_description: e.target.value } : p))}
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
    </div>
  );
}
