import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import tenantExpenseSourceService, { TenantExpenseSource } from '../services/frontend-tenantExpenseSourceService';
import tenantExpenseCategoryService, { TenantExpenseCategory } from '../services/frontend-tenantExpenseCategoryService';
import { languageService, Language } from '../services/languageService';

export default function TenantExpenseSourcesPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();

  const canCreate = hasPermission('tenant_expense_sources.create');
  const canEdit = hasPermission('tenant_expense_sources.edit');
  const canDelete = hasPermission('tenant_expense_sources.delete');

  const getTranslatedName = (translations: Array<{ language_code?: string; name: string }> | undefined, fallback = '-') => {
    if (!translations || translations.length === 0) return fallback;
    return translations.find(tr => tr.language_code === i18n.language)?.name
      || translations.find(tr => tr.language_code === 'en')?.name
      || translations[0].name
      || fallback;
  };

  const [items, setItems] = useState<TenantExpenseSource[]>([]);
  const [categories, setCategories] = useState<TenantExpenseCategory[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [filterCategory, setFilterCategory] = useState('');
  const [filterActive, setFilterActive] = useState('');

  const [formCategoryId, setFormCategoryId] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [translations, setTranslations] = useState<Array<{ language_id: number; language_code: string; name: string; description: string }>>([]);
  const [activeTab, setActiveTab] = useState('');

  if (!selectedTenant) {
    return <div className="p-6 text-center text-gray-500">{t('common.selectTenantFirst', 'Please select a tenant first')}</div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const filters: Record<string, any> = {};
      if (filterCategory) filters.tenant_expense_category_id = filterCategory;
      if (filterActive !== '') filters.is_active = filterActive === 'true';

      const [itemsData, catsData, langsData] = await Promise.all([
        tenantExpenseSourceService.getAll(filters),
        tenantExpenseCategoryService.getAll().catch(() => []),
        languageService.getLanguages(),
      ]);
      setItems(itemsData);
      setCategories(catsData);
      const activeLangs = langsData.filter((l: Language) => l.is_active);
      setLanguages(activeLangs);
      if (activeLangs.length > 0 && !activeTab) setActiveTab(activeLangs[0].code);
    } catch {
      toast.error(t('tenantExpenseSources.fetchError', 'Failed to load expense sources'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedTenant?.id, filterCategory, filterActive]);

  const handleCreate = () => {
    if (categories.length === 0) {
      toast.error(t('tenantExpenseSources.noCategories', 'Create an expense category first'));
      return;
    }
    setEditingId(null);
    setFormCategoryId(categories[0].id);
    setFormIsActive(true);
    setTranslations(languages.map(l => ({ language_id: l.id, language_code: l.code, name: '', description: '' })));
    setActiveTab(languages[0]?.code || '');
    setShowModal(true);
  };

  const handleEdit = (item: TenantExpenseSource) => {
    setEditingId(item.id);
    setFormCategoryId(item.tenant_expense_category_id);
    setFormIsActive(!!item.is_active);
    setTranslations(languages.map(l => {
      const existing = item.translations?.find(tr => tr.language_code === l.code);
      return {
        language_id: l.id,
        language_code: l.code,
        name: existing?.name || '',
        description: existing?.description || '',
      };
    }));
    setActiveTab(languages[0]?.code || '');
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('tenantExpenseSources.confirmDelete', 'Are you sure?'))) return;
    try {
      await tenantExpenseSourceService.delete(id);
      toast.success(t('tenantExpenseSources.deleted', 'Deleted'));
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('tenantExpenseSources.deleteError', 'Failed to delete'));
    }
  };

  const handleSave = async () => {
    if (!formCategoryId) { toast.error(t('tenantExpenseSources.categoryRequired', 'Category is required')); return; }
    const hasName = translations.some(tr => tr.name.trim());
    if (!hasName) { toast.error(t('tenantExpenseSources.nameRequired', 'At least one name translation is required')); return; }

    try {
      setSaving(true);
      const payload: any = {
        tenant_expense_category_id: formCategoryId,
        is_active: formIsActive,
        translations: translations.filter(tr => tr.name.trim()).map(tr => ({
          language_id: tr.language_id,
          name: tr.name,
          description: tr.description || null,
        })),
      };
      if (editingId) {
        await tenantExpenseSourceService.update(editingId, payload);
        toast.success(t('tenantExpenseSources.updated', 'Updated'));
      } else {
        await tenantExpenseSourceService.create(payload);
        toast.success(t('tenantExpenseSources.created', 'Created'));
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('tenantExpenseSources.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('tenantExpenseSources.title', 'Expense Sources')}</h1>
        {canCreate && (
          <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> {t('tenantExpenseSources.add', 'Add Source')}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">{t('tenantExpenseSources.allCategories', 'All Categories')}</option>
          {categories.map(c => <option key={c.id} value={c.id}>{getTranslatedName(c.translations, c.code)}</option>)}
        </select>
        <select value={filterActive} onChange={e => setFilterActive(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">{t('tenantExpenseSources.allStatuses', 'All Statuses')}</option>
          <option value="true">{t('common.active', 'Active')}</option>
          <option value="false">{t('common.inactive', 'Inactive')}</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantExpenseSources.category', 'Category')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantExpenseSources.name', 'Name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status', 'Status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {getTranslatedName(item.category_translations, item.category_code || '-')}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{getTranslatedName(item.translations)}</td>
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
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">{t('tenantExpenseSources.empty', 'No expense sources found')}</td></tr>
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
                {editingId ? t('tenantExpenseSources.edit', 'Edit Source') : t('tenantExpenseSources.add', 'Add Source')}
              </h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantExpenseSources.category', 'Category')} *</label>
                <select value={formCategoryId} onChange={e => setFormCategoryId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value={0}>{t('tenantExpenseSources.selectCategory', 'Select a category')}</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{getTranslatedName(c.translations, c.code)}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formIsActive} onChange={e => setFormIsActive(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">{t('common.active', 'Active')}</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('tenantExpenseSources.translations', 'Translations')}</label>
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
                        {t('tenantExpenseSources.translationName', 'Name')} ({tr.language_code.toUpperCase()})
                      </label>
                      <input type="text" value={tr.name}
                        onChange={e => setTranslations(prev => prev.map(p => p.language_code === tr.language_code ? { ...p, name: e.target.value } : p))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('tenantExpenseSources.translationDescription', 'Description')} ({tr.language_code.toUpperCase()})
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
    </div>
  );
}
