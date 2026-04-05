import React, { useState, useEffect } from 'react';
import tenantTypeService, { TenantType, TenantTypeTranslation } from '../services/tenantTypeService';
import { languageService, Language } from '../services/languageService';
import { useTranslation } from 'react-i18next';


const TenantTypesPage: React.FC = () => {
  const { t } = useTranslation();
  const [tenantTypes, setTenantTypes] = useState<TenantType[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenantType, setEditingTenantType] = useState<TenantType | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    icon_url: '',
    sort_order: 0,
    is_active: true,
    translations: [] as TenantTypeTranslation[],
  });

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [typesData, langsData] = await Promise.all([
        tenantTypeService.getAllTenantTypes(),
        languageService.getLanguages(),
      ]);
      setTenantTypes(typesData);
      setLanguages(langsData.filter(l => l.is_active));
      setError(null);
    } catch (err) {
      setError(t('tenantTypes.toast.loadFailed'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTenantType(null);
    setFormData({
      code: '',
      icon_url: '',
      sort_order: tenantTypes.length,
      is_active: true,
      translations: languages.map(lang => ({
        language_id: lang.id,
        name: '',
        description: '',
      })),
    });
    setIsModalOpen(true);
  };

  const openEditModal = (tenantType: TenantType) => {
    setEditingTenantType(tenantType);
    setFormData({
      code: tenantType.code,
      icon_url: tenantType.icon_url || '',
      sort_order: tenantType.sort_order,
      is_active: tenantType.is_active,
      translations: languages.map(lang => {
        const existing = tenantType.translations.find(t => t.language_id === lang.id);
        return {
          language_id: lang.id,
          name: existing?.name || '',
          description: existing?.description || '',
        };
      }),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTenantType(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Filter out empty translations
      const validTranslations = formData.translations.filter(t => t.name.trim() !== '');

      if (validTranslations.length === 0) {
        alert(t('tenantTypes.toast.translationRequired'));
        return;
      }

      const dataToSubmit = {
        ...formData,
        translations: validTranslations,
      };

      if (editingTenantType) {
        await tenantTypeService.updateTenantType(editingTenantType.id, dataToSubmit);
      } else {
        await tenantTypeService.createTenantType(dataToSubmit);
      }

      await loadData();
      closeModal();
    } catch (err: any) {
      alert(err.response?.data?.error || t('tenantTypes.toast.saveFailed'));
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('tenantTypes.toast.confirmDelete'))) {
      return;
    }

    try {
      await tenantTypeService.deleteTenantType(id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || t('tenantTypes.toast.deleteFailed'));
      console.error(err);
    }
  };

  const updateTranslation = (langId: number, field: 'name' | 'description', value: string) => {
    setFormData(prev => ({
      ...prev,
      translations: prev.translations.map(t =>
        t.language_id === langId ? { ...t, [field]: value } : t
      ),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">{t('tenantTypes.loading')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('tenantTypes.title')}</h1>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {t('tenantTypes.addTenantType')}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Tenant Types Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('tenantTypes.tableHeaders.sort')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('tenantTypes.tableHeaders.code')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('tenantTypes.tableHeaders.name')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('tenantTypes.tableHeaders.icon')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('tenantTypes.tableHeaders.tenants')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('tenantTypes.tableHeaders.status')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('tenantTypes.tableHeaders.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tenantTypes.map((tenantType) => (
              <tr key={tenantType.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {tenantType.sort_order}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                    {tenantType.code}
                  </code>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {tenantType.translations[0]?.name || t('tenantTypes.noTranslation')}
                  </div>
                  {tenantType.translations[0]?.description && (
                    <div className="text-sm text-gray-500">
                      {tenantType.translations[0].description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {tenantType.icon_url ? (
                    <img
                      src={tenantType.icon_url}
                      alt="Icon"
                      className="h-8 w-8 object-contain"
                    />
                  ) : (
                    <span className="text-gray-400 text-sm">{t('tenantTypes.noIcon')}</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {t('tenantTypes.tenants', { count: tenantType.tenant_count || 0 })}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      tenantType.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {tenantType.is_active ? t('tenantTypes.status.active') : t('tenantTypes.status.inactive')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => openEditModal(tenantType)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    {t('tenantTypes.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(tenantType.id)}
                    className="text-red-600 hover:text-red-900"
                    disabled={tenantType.tenant_count! > 0}
                  >
                    {t('tenantTypes.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {tenantTypes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">{t('tenantTypes.noTenantTypes')}</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingTenantType ? t('tenantTypes.modal.editTitle') : t('tenantTypes.modal.createTitle')}
              </h2>

              <form onSubmit={handleSubmit}>
                {/* Basic Info */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('tenantTypes.modal.code')}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder={t('tenantTypes.modal.placeholders.code')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('tenantTypes.modal.iconUrl')}
                    </label>
                    <input
                      type="text"
                      value={formData.icon_url}
                      onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder={t('tenantTypes.modal.placeholders.iconUrl')}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('tenantTypes.modal.sortOrder')}
                      </label>
                      <input
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) =>
                          setFormData({ ...formData, sort_order: parseInt(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('tenantTypes.modal.status')}
                      </label>
                      <select
                        value={formData.is_active ? '1' : '0'}
                        onChange={(e) =>
                          setFormData({ ...formData, is_active: e.target.value === '1' })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="1">{t('tenantTypes.status.active')}</option>
                        <option value="0">{t('tenantTypes.status.inactive')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Translations */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">{t('tenantTypes.modal.translations')}</h3>
                  <div className="space-y-4">
                    {languages.map((lang) => {
                      const translation = formData.translations.find(
                        (t) => t.language_id === lang.id
                      );
                      return (
                        <div key={lang.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center mb-3">
                            <span className="font-medium">{lang.name}</span>
                            <span className="ml-2 text-xs text-gray-500">({lang.code})</span>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">{t('tenantTypes.modal.name')}</label>
                              <input
                                type="text"
                                value={translation?.name || ''}
                                onChange={(e) =>
                                  updateTranslation(lang.id, 'name', e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                placeholder={t('tenantTypes.modal.placeholders.nameIn', { language: lang.name })}
                              />
                            </div>

                            <div>
                              <label className="block text-sm text-gray-600 mb-1">
                                {t('tenantTypes.modal.description')}
                              </label>
                              <textarea
                                value={translation?.description || ''}
                                onChange={(e) =>
                                  updateTranslation(lang.id, 'description', e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                rows={2}
                                placeholder={t('tenantTypes.modal.placeholders.descriptionIn', { language: lang.name })}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    {t('tenantTypes.modal.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingTenantType ? t('tenantTypes.modal.update') : t('tenantTypes.modal.create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantTypesPage;
