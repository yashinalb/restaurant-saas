import { useEffect, useState } from 'react';
import { X, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { masterProductService, MasterProduct } from '../services/masterProductService';
import tenantTypeService, { TenantType } from '../services/tenantTypeService';

interface ManageProductTenantTypesModalProps {
  product: MasterProduct;
  onClose: () => void;
  onSuccess: () => void;
}

interface TenantTypeSelection {
  tenant_type_id: number;
  is_featured: boolean;
  sort_order: number;
}

export default function ManageProductTenantTypesModal({
  product,
  onClose,
  onSuccess,
}: ManageProductTenantTypesModalProps) {
  const { t } = useTranslation();
  const [allTenantTypes, setAllTenantTypes] = useState<TenantType[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<Map<number, TenantTypeSelection>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [product.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [typesData, linkedData] = await Promise.all([
        tenantTypeService.getAllTenantTypes(),
        masterProductService.getProductTenantTypes(product.id),
      ]);

      setAllTenantTypes(typesData.filter(t => t.is_active));

      // Initialize selected types with existing links
      const selections = new Map<number, TenantTypeSelection>();
      linkedData.forEach((link: any) => {
        selections.set(link.tenant_type_id, {
          tenant_type_id: link.tenant_type_id,
          is_featured: link.is_featured || false,
          sort_order: link.sort_order || 0,
        });
      });
      setSelectedTypes(selections);
    } catch (error: any) {
      toast.error(t('modals.manageProductTenantTypes.loadFailed'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleType = (tenantTypeId: number) => {
    const newSelections = new Map(selectedTypes);
    if (newSelections.has(tenantTypeId)) {
      newSelections.delete(tenantTypeId);
    } else {
      // Get max sort order + 1
      let maxOrder = 0;
      newSelections.forEach((sel) => {
        if (sel.sort_order > maxOrder) maxOrder = sel.sort_order;
      });
      newSelections.set(tenantTypeId, {
        tenant_type_id: tenantTypeId,
        is_featured: false,
        sort_order: maxOrder + 1,
      });
    }
    setSelectedTypes(newSelections);
  };

  const handleUpdateSetting = (
    tenantTypeId: number,
    field: 'is_featured' | 'sort_order',
    value: boolean | number
  ) => {
    const newSelections = new Map(selectedTypes);
    const current = newSelections.get(tenantTypeId);
    if (current) {
      newSelections.set(tenantTypeId, {
        ...current,
        [field]: value,
      });
      setSelectedTypes(newSelections);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const tenantTypes = Array.from(selectedTypes.values());
      await masterProductService.updateProductTenantTypes(product.id, tenantTypes);
      toast.success(t('modals.manageProductTenantTypes.updateSuccess'));
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('modals.manageProductTenantTypes.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const getTenantTypeName = (tenantType: TenantType) => {
    if (tenantType.translations && tenantType.translations.length > 0) {
      return tenantType.translations[0].name;
    }
    return tenantType.code;
  };

  const getProductName = () => {
    if (product.translations && product.translations.length > 0) {
      return product.translations[0].name;
    }
    return `Product ${product.id}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {t('modals.manageProductTenantTypes.title')}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('modals.common.product')}: {getProductName()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-4">{t('modals.manageProductTenantTypes.loadingTenantTypes')}</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                {t('modals.manageProductTenantTypes.selectDescription')}
              </p>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {allTenantTypes.map((tenantType) => {
                  const isSelected = selectedTypes.has(tenantType.id);
                  const selection = selectedTypes.get(tenantType.id);

                  return (
                    <div
                      key={tenantType.id}
                      className={`border rounded-lg p-4 transition ${
                        isSelected
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleType(tenantType.id)}
                          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {tenantType.icon_url ? (
                              tenantType.icon_url.startsWith('/uploads') ? (
                                <img
                                  src={`http://localhost:3006${tenantType.icon_url}`}
                                  alt=""
                                  className="w-8 h-8 object-cover rounded"
                                />
                              ) : tenantType.icon_url.startsWith('http') ? (
                                <img
                                  src={tenantType.icon_url}
                                  alt=""
                                  className="w-8 h-8 object-cover rounded"
                                />
                              ) : (
                                <span className="text-2xl">{tenantType.icon_url}</span>
                              )
                            ) : (
                              <Building2 className="w-5 h-5 text-gray-400" />
                            )}
                            <div>
                              <div className="font-medium text-gray-900">
                                {getTenantTypeName(tenantType)}
                              </div>
                              <div className="text-sm text-gray-500">{tenantType.code}</div>
                            </div>
                          </div>

                          {isSelected && selection && (
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`featured_${tenantType.id}`}
                                  checked={selection.is_featured}
                                  onChange={(e) =>
                                    handleUpdateSetting(
                                      tenantType.id,
                                      'is_featured',
                                      e.target.checked
                                    )
                                  }
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label
                                  htmlFor={`featured_${tenantType.id}`}
                                  className="text-sm text-gray-700"
                                >
                                  {t('modals.manageProductTenantTypes.featuredProduct')}
                                </label>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">
                                  {t('modals.common.sortOrder')}
                                </label>
                                <input
                                  type="number"
                                  value={selection.sort_order}
                                  onChange={(e) =>
                                    handleUpdateSetting(
                                      tenantType.id,
                                      'sort_order',
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

              <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-6">
                <p className="text-sm text-gray-600">
                  {t('modals.manageProductTenantTypes.selectedCount', { count: selectedTypes.size, total: allTenantTypes.length })}
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