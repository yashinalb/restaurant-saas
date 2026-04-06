import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import menuCategoryService, { MenuCategory } from '../services/menuCategoryService';
import { languageService, Language } from '../services/languageService';

export default function MenuCategoriesPage() {
  const { t, i18n } = useTranslation();

  const getTranslatedName = (translations: Array<{ language_code?: string; name: string }> | undefined, fallback = '-') => {
    if (!translations || translations.length === 0) return fallback;
    return translations.find(tr => tr.language_code === i18n.language)?.name
      || translations.find(tr => tr.language_code === 'en')?.name
      || translations[0].name
      || fallback;
  };

  const [items, setItems] = useState<MenuCategory[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [formCode, setFormCode] = useState('');
  const [formParentId, setFormParentId] = useState<number | ''>('');
  const [formIconUrl, setFormIconUrl] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [translations, setTranslations] = useState<Array<{ language_id: number; language_code: string; name: string; description: string }>>([]);
  const [activeTab, setActiveTab] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsData, langsData] = await Promise.all([
        menuCategoryService.getAll(),
        languageService.getLanguages(),
      ]);
      setItems(itemsData);
      const activeLangs = langsData.filter((l: Language) => l.is_active);
      setLanguages(activeLangs);
      if (activeLangs.length > 0 && !activeTab) setActiveTab(activeLangs[0].code);
    } catch (error) {
      toast.error(t('menuCategories.fetchError', 'Failed to load menu categories'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getParentName = (parentId: number | null) => {
    if (!parentId) return '-';
    const parent = items.find(i => i.id === parentId);
    return parent ? getTranslatedName(parent.translations, parent.code) : '-';
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormCode(''); setFormParentId(''); setFormIconUrl(''); setFormImageUrl(''); setFormSortOrder(0); setFormIsActive(true);
    setTranslations(languages.map(l => ({ language_id: l.id, language_code: l.code, name: '', description: '' })));
    setActiveTab(languages[0]?.code || '');
    setShowModal(true);
  };

  const handleEdit = (item: MenuCategory) => {
    setEditingId(item.id);
    setFormCode(item.code); setFormParentId(item.parent_id || ''); setFormIconUrl(item.icon_url || '');
    setFormImageUrl(item.image_url || ''); setFormSortOrder(item.sort_order); setFormIsActive(!!item.is_active);
    setTranslations(languages.map(l => {
      const existing = item.translations?.find(tr => tr.language_code === l.code);
      return { language_id: l.id, language_code: l.code, name: existing?.name || '', description: existing?.description || '' };
    }));
    setActiveTab(languages[0]?.code || '');
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('menuCategories.confirmDelete', 'Are you sure you want to delete this menu category?'))) return;
    try {
      await menuCategoryService.delete(id);
      toast.success(t('menuCategories.deleted', 'Menu category deleted'));
      fetchData();
    } catch (error) {
      toast.error(t('menuCategories.deleteError', 'Failed to delete menu category'));
    }
  };

  const handleSave = async () => {
    if (!formCode.trim()) { toast.error(t('menuCategories.codeRequired', 'Code is required')); return; }
    try {
      setSaving(true);
      const payload = {
        code: formCode, parent_id: formParentId || null, icon_url: formIconUrl || undefined,
        image_url: formImageUrl || undefined, sort_order: formSortOrder, is_active: formIsActive,
        translations: translations.filter(tr => tr.name.trim()).map(tr => ({ language_id: tr.language_id, name: tr.name, description: tr.description || undefined })),
      };
      if (editingId) {
        await menuCategoryService.update(editingId, payload);
        toast.success(t('menuCategories.updated', 'Menu category updated'));
      } else {
        await menuCategoryService.create(payload);
        toast.success(t('menuCategories.created', 'Menu category created'));
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('menuCategories.saveError', 'Failed to save menu category'));
    } finally {
      setSaving(false);
    }
  };

  // Available parents: exclude self when editing
  const parentOptions = items.filter(i => i.id !== editingId);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('menuCategories.title', 'Menu Categories')}</h1>
        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> {t('menuCategories.add', 'Add Menu Category')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('menuCategories.code', 'Code')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('menuCategories.name', 'Name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('menuCategories.parent', 'Parent')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('menuCategories.sortOrder', 'Sort')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status', 'Status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{item.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{getTranslatedName(item.translations)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{getParentName(item.parent_id)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.sort_order}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {item.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 mr-3"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">{t('menuCategories.empty', 'No menu categories found')}</td></tr>
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
                {editingId ? t('menuCategories.edit', 'Edit Menu Category') : t('menuCategories.add', 'Add Menu Category')}
              </h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('menuCategories.code', 'Code')} *</label>
                <input type="text" value={formCode} onChange={e => setFormCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('menuCategories.parent', 'Parent Category')}</label>
                <select value={formParentId} onChange={e => setFormParentId(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">{t('menuCategories.noParent', '-- No Parent (Top Level) --')}</option>
                  {parentOptions.map(cat => (
                    <option key={cat.id} value={cat.id}>{getTranslatedName(cat.translations, cat.code)} ({cat.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('menuCategories.iconUrl', 'Icon URL')}</label>
                <input type="text" value={formIconUrl} onChange={e => setFormIconUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('menuCategories.imageUrl', 'Image URL')}</label>
                <input type="text" value={formImageUrl} onChange={e => setFormImageUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('menuCategories.sortOrder', 'Sort Order')}</label>
                <input type="number" value={formSortOrder} onChange={e => setFormSortOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formIsActive} onChange={e => setFormIsActive(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">{t('common.active', 'Active')}</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('menuCategories.translations', 'Translations')}</label>
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
                        {t('menuCategories.translationName', 'Name')} ({tr.language_code.toUpperCase()})
                      </label>
                      <input type="text" value={tr.name}
                        onChange={e => setTranslations(prev => prev.map(p => p.language_code === tr.language_code ? { ...p, name: e.target.value } : p))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('menuCategories.translationDescription', 'Description')} ({tr.language_code.toUpperCase()})
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
    </div>
  );
}
