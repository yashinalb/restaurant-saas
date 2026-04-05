import { useEffect, useState } from 'react';
import { X, DollarSign, Star, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { currencyService, Currency } from '../services/currencyService';
import { tenantService } from '@/services/tenantService-frontend';

interface ManageTenantCurrenciesModalProps {
  tenantId: number;
  tenantName: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface CurrencySelection {
  currency_id: number;
  is_default: boolean;
  is_active: boolean;
}

export default function ManageTenantCurrenciesModal({
  tenantId,
  tenantName,
  onClose,
  onSuccess,
}: ManageTenantCurrenciesModalProps) {
  const { t } = useTranslation();
  const [allCurrencies, setAllCurrencies] = useState<Currency[]>([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState<Map<number, CurrencySelection>>(
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
      const [allCurrsData, tenantCurrsData] = await Promise.all([
        currencyService.getCurrencies(),
        tenantService.getTenantCurrencies(tenantId),
      ]);

      setAllCurrencies(allCurrsData.filter((c) => c.is_active));

      // Initialize selected currencies
      const selections = new Map<number, CurrencySelection>();
      tenantCurrsData.forEach((curr: any) => {
        selections.set(curr.currency_id, {
          currency_id: curr.currency_id,
          is_default: curr.is_default || false,
          is_active: curr.is_active || true,
        });
      });
      setSelectedCurrencies(selections);
    } catch (error: any) {
      toast.error(t('modals.manageCurrencies.loadFailed'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCurrency = (currencyId: number) => {
    const newSelections = new Map(selectedCurrencies);
    if (newSelections.has(currencyId)) {
      newSelections.delete(currencyId);
    } else {
      newSelections.set(currencyId, {
        currency_id: currencyId,
        is_default: newSelections.size === 0, // First one is default
        is_active: true,
      });
    }
    setSelectedCurrencies(newSelections);
  };

  const handleSetDefault = (currencyId: number) => {
    const newSelections = new Map(selectedCurrencies);
    // Remove default from all
    newSelections.forEach((value, _key) => {
      value.is_default = false;
    });
    // Set this one as default
    const current = newSelections.get(currencyId);
    if (current) {
      current.is_default = true;
      newSelections.set(currencyId, current);
    }
    setSelectedCurrencies(newSelections);
  };

  const handleToggleActive = (currencyId: number) => {
    const newSelections = new Map(selectedCurrencies);
    const current = newSelections.get(currencyId);
    if (current) {
      current.is_active = !current.is_active;
      newSelections.set(currencyId, current);
    }
    setSelectedCurrencies(newSelections);
  };

  const handleSave = async () => {
    const selected = Array.from(selectedCurrencies.values());

    if (selected.length === 0) {
      toast.error(t('modals.manageCurrencies.selectAtLeastOne'));
      return;
    }

    const hasDefault = selected.some((c) => c.is_default);
    if (!hasDefault) {
      toast.error(t('modals.manageCurrencies.setOneAsDefault'));
      return;
    }

    try {
      setSaving(true);
      await tenantService.updateTenantCurrencies(tenantId, selected);
      toast.success(t('modals.manageCurrencies.updateSuccess'));
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('modals.manageCurrencies.updateFailed'));
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
              <DollarSign className="w-5 h-5" />
              {t('modals.manageCurrencies.title')}
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
              <p className="text-gray-600 mt-4">{t('modals.manageCurrencies.loadingCurrencies')}</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                {t('modals.manageCurrencies.selectDescription')}
              </p>

              <div className="space-y-2 mb-6">
                {allCurrencies.map((currency) => {
                  const isSelected = selectedCurrencies.has(currency.id);
                  const selection = selectedCurrencies.get(currency.id);

                  return (
                    <div
                      key={currency.id}
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
                          onChange={() => handleToggleCurrency(currency.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                              {currency.symbol}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {currency.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {currency.code} - {currency.symbol}
                              </div>
                            </div>
                          </div>

                          {isSelected && selection && (
                            <div className="mt-3 flex items-center gap-4">
                              <button
                                type="button"
                                onClick={() => handleSetDefault(currency.id)}
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
                                {selection.is_default ? t('modals.manageCurrencies.default') : t('modals.manageCurrencies.setAsDefault')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleActive(currency.id)}
                                className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition ${
                                  selection.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                <Eye className="w-3 h-3" />
                                {selection.is_active ? t('modals.manageCurrencies.active') : t('modals.manageCurrencies.inactive')}
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
                  {t('modals.manageCurrencies.selectedCount', { count: selectedCurrencies.size, total: allCurrencies.length })}
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
