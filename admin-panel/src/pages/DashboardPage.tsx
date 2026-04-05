import { useAuthStore } from '../store/authStore';
import { useTranslation } from 'react-i18next';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user, selectedTenant } = useAuthStore();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-600 mt-2">
          {t('dashboard.welcomeBack', { name: user?.first_name || user?.email })}
        </p>
      </div>

      {selectedTenant && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('dashboard.currentTenant')}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">{t('dashboard.tenantFields.name')}</p>
              <p className="font-medium">{selectedTenant.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('dashboard.tenantFields.slug')}</p>
              <p className="font-medium">{selectedTenant.slug}</p>
            </div>
            {selectedTenant.role_name && (
              <div>
                <p className="text-sm text-gray-500">{t('dashboard.tenantFields.yourRole')}</p>
                <p className="font-medium">{selectedTenant.role_display_name}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">{t('dashboard.stats.totalProducts')}</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
          <p className="text-sm text-gray-600 mt-1">{t('dashboard.stats.comingSoon')}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">{t('dashboard.stats.activeCampaigns')}</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
          <p className="text-sm text-gray-600 mt-1">{t('dashboard.stats.comingSoon')}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">{t('dashboard.stats.categories')}</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">6</p>
          <p className="text-sm text-gray-600 mt-1">{t('dashboard.stats.fromSeedData')}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">{t('dashboard.stats.productViews')}</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
          <p className="text-sm text-gray-600 mt-1">{t('dashboard.stats.comingSoon')}</p>
        </div>
      </div>


    </div>
  );
}
