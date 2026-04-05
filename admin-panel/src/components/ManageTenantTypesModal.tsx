import { useState, useEffect } from 'react';
import { X, Building2, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MasterCategory, masterCategoryService } from '../services/masterCategoryService';
import tenantTypeService, { TenantType } from '../services/tenantTypeService';
import { toast } from 'sonner';

interface ManageTenantTypesModalProps {
  category: MasterCategory;
  onClose: () => void;
  onSuccess: () => void;
}

interface TenantTypeLinkState {
  tenant_type_id: number;
  is_linked: boolean;
  is_default: boolean;
  sort_order: number;
}

export default function ManageTenantTypesModal({ category, onClose, onSuccess }: ManageTenantTypesModalProps) {
  const { t } = useTranslation();
  const [allTenantTypes, setAllTenantTypes] = useState<TenantType[]>([]);
  const [linkStates, setLinkStates] = useState<Record<number, TenantTypeLinkState>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [category.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all tenant types and current links in parallel
      const [tenantTypesData, linkedTypesData] = await Promise.all([
        tenantTypeService.getAllTenantTypes(),
        masterCategoryService.getCategoryTenantTypes(category.id),
      ]);

      setAllTenantTypes(tenantTypesData);

      // Build link states
      const states: Record<number, TenantTypeLinkState> = {};
      
      tenantTypesData.forEach((type, index) => {
        const existingLink = linkedTypesData.find(link => link.tenant_type_id === type.id);
        
        states[type.id] = {
          tenant_type_id: type.id,
          is_linked: !!existingLink,
          is_default: existingLink?.is_default || false,
          sort_order: existingLink?.sort_order ?? index,
        };
      });

      setLinkStates(states);
    } catch (error: any) {
      toast.error(t('modals.manageTenantTypes.loadFailed'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLink = (tenantTypeId: number) => {
    setLinkStates(prev => ({
      ...prev,
      [tenantTypeId]: {
        ...prev[tenantTypeId],
        is_linked: !prev[tenantTypeId].is_linked,
      },
    }));
  };

  const handleToggleDefault = (tenantTypeId: number) => {
    setLinkStates(prev => ({
      ...prev,
      [tenantTypeId]: {
        ...prev[tenantTypeId],
        is_default: !prev[tenantTypeId].is_default,
      },
    }));
  };

  const handleSortOrderChange = (tenantTypeId: number, value: string) => {
    const sortOrder = parseInt(value) || 0;
    setLinkStates(prev => ({
      ...prev,
      [tenantTypeId]: {
        ...prev[tenantTypeId],
        sort_order: sortOrder,
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Filter only linked types
      const linkedTypes = Object.values(linkStates)
        .filter(state => state.is_linked)
        .map(state => ({
          tenant_type_id: state.tenant_type_id,
          is_default: state.is_default,
          sort_order: state.sort_order,
        }));

      await masterCategoryService.updateCategoryTenantTypes(category.id, {
        tenant_types: linkedTypes,
      });

      toast.success(t('modals.manageTenantTypes.updateSuccess'));
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('modals.manageTenantTypes.updateFailed'));
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const getPrimaryName = (type: TenantType) => {
    if (type.translations && type.translations.length > 0) {
      return type.translations[0].name;
    }
    return type.code;
  };

  const linkedCount = Object.values(linkStates).filter(state => state.is_linked).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              {t('modals.manageTenantTypes.title')}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('modals.common.category')}: {category.translations?.[0]?.name || `Category ${category.id}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={saving}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-4">{t('modals.manageTenantTypes.loadingTenantTypes')}</p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>{t('modals.manageTenantTypes.selectedCount', { count: linkedCount })}</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {t('modals.manageTenantTypes.selectDescription')}
                </p>
              </div>

              <div className="space-y-3">
                {allTenantTypes.map((type) => {
                  const state = linkStates[type.id];
                  if (!state) return null;

                  return (
                    <div
                      key={type.id}
                      className={`border rounded-lg p-4 transition ${
                        state.is_linked
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div className="flex items-center pt-1">
                          <input
                            type="checkbox"
                            id={`type_${type.id}`}
                            checked={state.is_linked}
                            onChange={() => handleToggleLink(type.id)}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </div>

                        {/* Type Info */}
                        <div className="flex-1">
                          <label
                            htmlFor={`type_${type.id}`}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            {type.icon_url && (
                              <span className="text-2xl">{type.icon_url}</span>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">
                                {getPrimaryName(type)}
                              </div>
                              <div className="text-sm text-gray-500">{type.code}</div>
                            </div>
                          </label>

                          {/* Settings (only shown when linked) */}
                          {state.is_linked && (
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <div>
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={state.is_default}
                                    onChange={() => handleToggleDefault(type.id)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-gray-700">{t('modals.manageTenantTypes.defaultCategory')}</span>
                                </label>
                                <p className="text-xs text-gray-500 ml-6 mt-1">
                                  {t('modals.manageTenantTypes.showByDefault')}
                                </p>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  {t('modals.common.sortOrder')}
                                </label>
                                <input
                                  type="number"
                                  value={state.sort_order}
                                  onChange={(e) => handleSortOrderChange(type.id, e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  min="0"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {allTenantTypes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>{t('modals.manageTenantTypes.noTenantTypes')}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            {t('modals.common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {t('modals.common.saving')}
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {t('modals.common.saveChanges')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}