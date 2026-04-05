import { useEffect, useState } from 'react';
import { Languages as LanguagesIcon, Plus, Edit, Trash2, GripVertical, X } from 'lucide-react';
import { languageService, Language, CreateLanguageData } from '../services/languageService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function LanguagesPage() {
  const { t } = useTranslation();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState<CreateLanguageData>({
    code: '',
    name: '',
    native_name: '',
    is_rtl: false,
    is_active: true,
  });

  const [editForm, setEditForm] = useState<Partial<Language>>({});

  useEffect(() => {
    loadLanguages();
  }, []);

  const loadLanguages = async () => {
    try {
      setLoading(true);
      const data = await languageService.getLanguages();
      setLanguages(data);
    } catch (error: any) {
      toast.error(t('languages.toast.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLanguage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.code || !createForm.name || !createForm.native_name) {
      toast.error(t('languages.toast.requiredFields'));
      return;
    }

    try {
      await languageService.createLanguage(createForm);
      toast.success(t('languages.toast.createSuccess'));
      setShowCreateModal(false);
      resetCreateForm();
      loadLanguages();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('languages.toast.createFailed'));
    }
  };

  const handleUpdateLanguage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLanguage) return;

    try {
      await languageService.updateLanguage(selectedLanguage.id, editForm);
      toast.success(t('languages.toast.updateSuccess'));
      setShowEditModal(false);
      loadLanguages();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('languages.toast.updateFailed'));
    }
  };

  const handleDeleteLanguage = async (language: Language) => {
    if (!confirm(t('languages.confirmDelete', { name: language.name }))) return;

    try {
      await languageService.deleteLanguage(language.id);
      toast.success(t('languages.toast.deleteSuccess'));
      loadLanguages();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('languages.toast.deleteFailed'));
    }
  };

  const openEditModal = (language: Language) => {
    setSelectedLanguage(language);
    setEditForm({
      code: language.code,
      name: language.name,
      native_name: language.native_name,
      is_rtl: language.is_rtl,
      is_active: language.is_active,
    });
    setShowEditModal(true);
  };

  const resetCreateForm = () => {
    setCreateForm({
      code: '',
      name: '',
      native_name: '',
      is_rtl: false,
      is_active: true,
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('languages.title')}</h1>
          <p className="text-gray-600 mt-2">{t('languages.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          {t('languages.addLanguage')}
        </button>
      </div>

      {/* Languages Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">{t('languages.loading')}</p>
        </div>
      ) : languages.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <LanguagesIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">{t('languages.noLanguages')}</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            {t('languages.addFirst')}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('languages.tableHeaders.order')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('languages.tableHeaders.code')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('languages.tableHeaders.name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('languages.tableHeaders.nativeName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('languages.tableHeaders.direction')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('languages.tableHeaders.tenants')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('languages.tableHeaders.status')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('languages.tableHeaders.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {languages.map((language) => (
                <tr key={language.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm font-medium text-gray-900">
                      {language.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{language.name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{language.native_name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {language.is_rtl ? t('languages.direction.rtl') : t('languages.direction.ltr')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{language.tenant_count || 0}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        language.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {language.is_active ? t('languages.status.active') : t('languages.status.inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(language)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title={t('languages.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLanguage(language)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title={t('languages.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t('languages.createModal.title')}</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLanguage} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('languages.createModal.languageCode')}
                </label>
                <input
                  type="text"
                  required
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('languages.createModal.placeholders.code')}
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('languages.createModal.nameEnglish')}
                </label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('languages.createModal.placeholders.name')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('languages.createModal.nativeName')}
                </label>
                <input
                  type="text"
                  required
                  value={createForm.native_name}
                  onChange={(e) => setCreateForm({ ...createForm, native_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('languages.createModal.placeholders.nativeName')}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_rtl"
                  checked={createForm.is_rtl}
                  onChange={(e) => setCreateForm({ ...createForm, is_rtl: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_rtl" className="text-sm font-medium text-gray-700">
                  {t('languages.createModal.rtl')}
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={createForm.is_active}
                  onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  {t('languages.createModal.active')}
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('languages.createModal.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  {t('languages.createModal.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedLanguage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t('languages.editModal.title')}</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateLanguage} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('languages.editModal.languageCode')}
                </label>
                <input
                  type="text"
                  value={editForm.code}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('languages.editModal.nameEnglish')}
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('languages.editModal.nativeName')}
                </label>
                <input
                  type="text"
                  value={editForm.native_name}
                  onChange={(e) => setEditForm({ ...editForm, native_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_is_rtl"
                  checked={editForm.is_rtl}
                  onChange={(e) => setEditForm({ ...editForm, is_rtl: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="edit_is_rtl" className="text-sm font-medium text-gray-700">
                  {t('languages.editModal.rtl')}
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="edit_is_active" className="text-sm font-medium text-gray-700">
                  {t('languages.editModal.active')}
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('languages.editModal.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  {t('languages.editModal.update')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
