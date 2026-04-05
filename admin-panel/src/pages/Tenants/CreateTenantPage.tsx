import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Store } from 'lucide-react';
import { subscriptionPlanService, SubscriptionPlan } from '../../services/subscriptionPlanService-frontend';
import { languageService, Language } from '../../services/languageService';
import { currencyService, Currency } from '../../services/currencyService';
import { toast } from 'sonner';
import { CreateTenantData, tenantService } from '@/services/tenantService-frontend';
import tenantTypeService, { TenantType } from '@/services/tenantTypeService';
import { useTranslation } from 'react-i18next';

export default function CreateTenantPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateTenantData>({
    name: '',
    slug: '',
    domain: '',
    subdomain: '',
    subscription_plan_id: null,
    tenant_type_id: null,
    logo_url: '',
    favicon_url: '',
    primary_color: '#0050AA',
    secondary_color: '#FFCC00',
    default_language_id: null,
    default_currency_id: null,
    contact_email: '',
    contact_phone: '',
    is_active: true,
    trial_ends_at: null,
    subscription_ends_at: null,
  });

  // Dropdown data
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [tenantTypes, setTenantTypes] = useState<TenantType[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  useEffect(() => {
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    try {
      const [plansData, typesData, langsData, currsData] = await Promise.all([
        subscriptionPlanService.getSubscriptionPlans(),
        tenantTypeService.getAllTenantTypes(),
        languageService.getLanguages(),
        currencyService.getCurrencies(),
      ]);
      setSubscriptionPlans(plansData.filter(p => p.is_active));
      setTenantTypes(typesData.filter(t => t.is_active));
      setLanguages(langsData.filter(l => l.is_active));
      setCurrencies(currsData.filter(c => c.is_active));
    } catch (error) {
      console.error('Failed to load dropdown data:', error);
      toast.error(t('tenants.create.loadFormFailed'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.slug.trim()) {
      toast.error(t('tenants.create.nameSlugRequired'));
      return;
    }

    try {
      setSaving(true);
      const result = await tenantService.createTenant(formData);
      toast.success(t('tenants.create.createSuccess'));
      navigate(`/tenants/${result.data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('tenants.create.createFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleNameChange = (name: string) => {
    setFormData({ 
      ...formData, 
      name,
      // Auto-generate slug from name if slug is empty
      slug: formData.slug ? formData.slug : name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/tenants')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('tenants.create.backToTenants')}
        </button>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
            <Store className="w-8 h-8 text-gray-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('tenants.create.title')}</h1>
            <p className="text-gray-600 mt-1">{t('tenants.create.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-8">
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('tenants.create.basicInfo')}</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.create.tenantName')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('tenants.create.placeholders.tenantName')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.create.slug')}
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('tenants.create.placeholders.slug')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.create.domain')}
                </label>
                <input
                  type="text"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('tenants.create.placeholders.domain')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.create.subdomain')}
                </label>
                <input
                  type="text"
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('tenants.create.placeholders.subdomain')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.create.tenantType')}
                </label>
                <select
                  value={formData.tenant_type_id || ''}
                  onChange={(e) => setFormData({ ...formData, tenant_type_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('tenants.create.selectType')}</option>
                  {tenantTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.translations?.[0]?.name || type.code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.create.subscriptionPlan')}
                </label>
                <select
                  value={formData.subscription_plan_id || ''}
                  onChange={(e) => setFormData({ ...formData, subscription_plan_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('tenants.create.noPlan')}</option>
                  {subscriptionPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - {plan.currency} {plan.price !== null ? plan.price : 'Contact'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t pt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('tenants.create.contactInfo')}</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.create.contactEmail')}
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('tenants.create.placeholders.contactEmail')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.create.contactPhone')}
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('tenants.create.placeholders.contactPhone')}
                />
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="border-t pt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('tenants.create.branding')}</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.create.logoUrl')}
                </label>
                <input
                  type="text"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('tenants.create.placeholders.logoUrl')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.create.faviconUrl')}
                </label>
                <input
                  type="text"
                  value={formData.favicon_url}
                  onChange={(e) => setFormData({ ...formData, favicon_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('tenants.create.placeholders.faviconUrl')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.create.primaryColor')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="h-10 w-20"
                  />
                  <input
                    type="text"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.create.secondaryColor')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="h-10 w-20"
                  />
                  <input
                    type="text"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Localization */}
          <div className="border-t pt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('tenants.create.localization')}</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.create.defaultLanguage')}
                </label>
                <select
                  value={formData.default_language_id || ''}
                  onChange={(e) => setFormData({ ...formData, default_language_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('tenants.create.selectLanguage')}</option>
                  {languages.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.native_name} ({lang.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.create.defaultCurrency')}
                </label>
                <select
                  value={formData.default_currency_id || ''}
                  onChange={(e) => setFormData({ ...formData, default_currency_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('tenants.create.selectCurrency')}</option>
                  {currencies.map((curr) => (
                    <option key={curr.id} value={curr.id}>
                      {curr.name} ({curr.code}) - {curr.symbol}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Trial & Subscription Dates */}
          <div className="border-t pt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('tenants.create.trialSubscription')}</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.create.trialEndsAt')}
                </label>
                <input
                  type="date"
                  value={formData.trial_ends_at || ''}
                  onChange={(e) => setFormData({ ...formData, trial_ends_at: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.create.subscriptionEndsAt')}
                </label>
                <input
                  type="date"
                  value={formData.subscription_ends_at || ''}
                  onChange={(e) => setFormData({ ...formData, subscription_ends_at: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Active Status */}
          <div className="border-t pt-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                {t('tenants.create.activeLabel')}
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/tenants')}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              disabled={saving}
            >
              {t('tenants.create.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? t('tenants.create.creating') : t('tenants.create.createTenant')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
