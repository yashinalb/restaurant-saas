import { useEffect, useState } from 'react';
import { X, Globe, Star, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { languageService, Language } from '../services/languageService';
import { tenantService } from '@/services/tenantService-frontend';

interface ManageTenantLanguagesModalProps {
  tenantId: number;
  tenantName: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface LanguageSelection {
  language_id: number;
  is_default: boolean;
  is_active: boolean;
}

export default function ManageTenantLanguagesModal({
  tenantId,
  tenantName,
  onClose,
  onSuccess,
}: ManageTenantLanguagesModalProps) {
  const { t } = useTranslation();
  const [allLanguages, setAllLanguages] = useState<Language[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<Map<number, LanguageSelection>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allLangsData, tenantLangsData] = await Promise.all([
        languageService.getLanguages(),
        tenantService.getTenantLanguages(tenantId),
      ]);

      setAllLanguages(allLangsData.filter((l) => l.is_active));

      // Initialize selected languages
      const selections = new Map<number, LanguageSelection>();
      tenantLangsData.forEach((lang: any) => {
        selections.set(lang.language_id, {
          language_id: lang.language_id,
          is_default: lang.is_default || false,
          is_active: lang.is_active || true,
        });
      });
      setSelectedLanguages(selections);
    } catch (error: any) {
      toast.error(t('modals.manageLanguages.loadFailed'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLanguage = (languageId: number) => {
    const newSelections = new Map(selectedLanguages);
    if (newSelections.has(languageId)) {
      newSelections.delete(languageId);
    } else {
      newSelections.set(languageId, {
        language_id: languageId,
        is_default: newSelections.size === 0, // First one is default
        is_active: true,
      });
    }
    setSelectedLanguages(newSelections);
  };

  const handleSetDefault = (languageId: number) => {
    const newSelections = new Map(selectedLanguages);
    // Remove default from all
    newSelections.forEach((value, _key) => {
      value.is_default = false;
    });
    // Set this one as default
    const current = newSelections.get(languageId);
    if (current) {
      current.is_default = true;
      newSelections.set(languageId, current);
    }
    setSelectedLanguages(newSelections);
  };

  const handleToggleActive = (languageId: number) => {
    const newSelections = new Map(selectedLanguages);
    const current = newSelections.get(languageId);
    if (current) {
      current.is_active = !current.is_active;
      newSelections.set(languageId, current);
    }
    setSelectedLanguages(newSelections);
  };

  const handleSave = async () => {
    const selected = Array.from(selectedLanguages.values());

    if (selected.length === 0) {
      toast.error(t('modals.manageLanguages.selectAtLeastOne'));
      return;
    }

    const hasDefault = selected.some((l) => l.is_default);
    if (!hasDefault) {
      toast.error(t('modals.manageLanguages.setOneAsDefault'));
      return;
    }

    try {
      setSaving(true);
      await tenantService.updateTenantLanguages(tenantId, selected);
      toast.success(t('modals.manageLanguages.updateSuccess'));
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('modals.manageLanguages.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              {t('modals.manageLanguages.title')}
            </h2>
            <p className="text-sm text-gray-600 mt-1">{t('modals.common.tenant')}: {tenantName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-4">{t('modals.manageLanguages.loadingLanguages')}</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                {t('modals.manageLanguages.selectDescription')}
              </p>

              <div className="space-y-2 mb-6">
                {allLanguages.map((language) => {
                  const isSelected = selectedLanguages.has(language.id);
                  const selection = selectedLanguages.get(language.id);

                  return (
                    <div
                      key={language.id}
                      className={`border rounded-lg p-4 transition ${
                        isSelected
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleLanguage(language.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{language.flag_emoji || '🏴'}</span>
                            <div>
                              <div className="font-medium text-gray-900">
                                {language.native_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {language.name} ({language.code})
                              </div>
                            </div>
                          </div>

                          {isSelected && selection && (
                            <div className="mt-3 flex items-center gap-4">
                              <button
                                type="button"
                                onClick={() => handleSetDefault(language.id)}
                                className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition ${
                                  selection.is_default
                                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                <Star
                                  className={`w-3 h-3 ${
                                    selection.is_default ? 'fill-current' : ''
                                  }`}
                                />
                                {selection.is_default ? t('modals.manageLanguages.default') : t('modals.manageLanguages.setAsDefault')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleActive(language.id)}
                                className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition ${
                                  selection.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                <Eye className="w-3 h-3" />
                                {selection.is_active ? t('modals.manageLanguages.active') : t('modals.manageLanguages.inactive')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  {t('modals.manageLanguages.selectedCount', { count: selectedLanguages.size, total: allLanguages.length })}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={saving}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    {t('modals.common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                  >
                    {saving ? t('modals.common.saving') : t('modals.common.saveChanges')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
