// src/pages/TenantDetailPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Store as StoreIcon,
  CreditCard,
  Globe,
  DollarSign,
  Settings,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  MapPin,
} from 'lucide-react';
import { tenantService, Tenant, UpdateTenantData } from '../../services/tenantService-frontend';
import { subscriptionPlanService, SubscriptionPlan } from '../../services/subscriptionPlanService-frontend';
import tenantTypeService, { TenantType } from '../../services/tenantTypeService';
import { languageService, Language } from '../../services/languageService';
import { currencyService, Currency } from '../../services/currencyService';
import ManageTenantLanguagesModal from '../../components/ManageTenantLanguagesModal';
import ManageTenantCurrenciesModal from '../../components/ManageTenantCurrenciesModal';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

type TabType = 'overview' | 'subscription' | 'languages' | 'currencies' | 'stores' | 'settings';

export default function TenantDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Form state
  const [editForm, setEditForm] = useState<UpdateTenantData>({});

  // Dropdown data
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [tenantTypes, setTenantTypes] = useState<TenantType[]>([]);
  const [_languages, setLanguages] = useState<Language[]>([]);
  const [_currencies, setCurrencies] = useState<Currency[]>([]);

  const [showLanguagesModal, setShowLanguagesModal] = useState(false);
  const [showCurrenciesModal, setShowCurrenciesModal] = useState(false);

  useEffect(() => {
    loadData();
    loadDropdownData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await tenantService.getTenantById(parseInt(id));
      setTenant(data);
      setEditForm({
        name: data.name,
        slug: data.slug,
        domain: data.domain || '',
        subdomain: data.subdomain || '',
        subscription_plan_id: data.subscription_plan_id,
        tenant_type_id: data.tenant_type_id,
        logo_url: data.logo_url || '',
        favicon_url: data.favicon_url || '',
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        default_language_id: data.default_language_id,
        default_currency_id: data.default_currency_id,
        contact_email: data.contact_email || '',
        contact_phone: data.contact_phone || '',
        is_active: data.is_active,
        trial_ends_at: data.trial_ends_at || null,
        subscription_ends_at: data.subscription_ends_at || null,
      });
    } catch (error: any) {
      toast.error(t('tenants.detail.loadFailed'));
      navigate('/tenants');
    } finally {
      setLoading(false);
    }
  };

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
    }
  };

  const handleSave = async () => {
    if (!tenant) return;

    try {
      setSaving(true);
      await tenantService.updateTenant(tenant.id, editForm);
      toast.success(t('tenants.detail.updateSuccess'));
      setEditMode(false);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('tenants.detail.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    if (tenant) {
      setEditForm({
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain || '',
        subdomain: tenant.subdomain || '',
        subscription_plan_id: tenant.subscription_plan_id,
        tenant_type_id: tenant.tenant_type_id,
        logo_url: tenant.logo_url || '',
        favicon_url: tenant.favicon_url || '',
        primary_color: tenant.primary_color,
        secondary_color: tenant.secondary_color,
        default_language_id: tenant.default_language_id,
        default_currency_id: tenant.default_currency_id,
        contact_email: tenant.contact_email || '',
        contact_phone: tenant.contact_phone || '',
        is_active: tenant.is_active,
        trial_ends_at: tenant.trial_ends_at || null,
        subscription_ends_at: tenant.subscription_ends_at || null,
      });
    }
  };

  const getSubscriptionStatus = () => {
    if (!tenant) return null;

    const now = new Date();

    if (tenant.trial_ends_at && new Date(tenant.trial_ends_at) > now) {
      return {
        label: t('tenants.status.trial'),
        color: 'bg-blue-100 text-blue-800',
        icon: <Clock className="w-4 h-4" />,
      };
    }

    if (tenant.subscription_ends_at && new Date(tenant.subscription_ends_at) < now) {
      return {
        label: t('tenants.status.expired'),
        color: 'bg-red-100 text-red-800',
        icon: <AlertTriangle className="w-4 h-4" />,
      };
    }

    if (!tenant.is_active) {
      return {
        label: t('tenants.status.inactive'),
        color: 'bg-gray-100 text-gray-800',
        icon: <XCircle className="w-4 h-4" />,
      };
    }

    return {
      label: t('tenants.status.active'),
      color: 'bg-green-100 text-green-800',
      icon: <CheckCircle className="w-4 h-4" />,
    };
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

 

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!tenant) {
    return null;
  }

  const status = getSubscriptionStatus();

  const tabs = [
    { id: 'overview', label: t('tenants.detail.tabs.overview'), icon: StoreIcon },
    { id: 'subscription', label: t('tenants.detail.tabs.subscription'), icon: CreditCard },
    { id: 'languages', label: t('tenants.detail.tabs.languages'), icon: Globe },
    { id: 'currencies', label: t('tenants.detail.tabs.currencies'), icon: DollarSign },
    { id: 'stores', label: t('tenants.detail.tabs.stores'), icon: MapPin },
    { id: 'settings', label: t('tenants.detail.tabs.settings'), icon: Settings },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/tenants')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('tenants.detail.backToTenants')}
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {tenant.logo_url ? (
              <img
                src={
                  tenant.logo_url.startsWith('/uploads')
                    ? `http://localhost:3006${tenant.logo_url}`
                    : tenant.logo_url
                }
                alt={tenant.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                <StoreIcon className="w-8 h-8 text-gray-500" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{tenant.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-gray-600">{tenant.slug}</span>
                {status && (
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${status.color}`}>
                    {status.icon}
                    {status.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {editMode ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={saving}
                >
                  {t('tenants.detail.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? t('tenants.detail.saving') : t('tenants.detail.saveChanges')}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                <Edit className="w-4 h-4" />
                {t('tenants.detail.editTenant')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition ${isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('tenants.detail.overview.title')}</h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.detail.overview.tenantName')}
                </label>
                {editMode ? (
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{tenant.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.detail.overview.slug')}
                </label>
                {editMode ? (
                  <input
                    type="text"
                    value={editForm.slug}
                    onChange={(e) => setEditForm({ ...editForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{tenant.slug}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.detail.overview.domain')}
                </label>
                {editMode ? (
                  <input
                    type="text"
                    value={editForm.domain}
                    onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('tenants.detail.overview.placeholders.domain')}
                  />
                ) : (
                  <p className="text-gray-900">{tenant.domain || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.detail.overview.subdomain')}
                </label>
                {editMode ? (
                  <input
                    type="text"
                    value={editForm.subdomain}
                    onChange={(e) => setEditForm({ ...editForm, subdomain: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('tenants.detail.overview.placeholders.subdomain')}
                  />
                ) : (
                  <p className="text-gray-900">{tenant.subdomain || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.detail.overview.tenantType')}
                </label>
                {editMode ? (
                  <select
                    value={editForm.tenant_type_id || ''}
                    onChange={(e) => setEditForm({ ...editForm, tenant_type_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('tenants.detail.overview.selectType')}</option>
                    {tenantTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.translations?.[0]?.name || type.code}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900">{tenant.tenant_type_name || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.detail.overview.contactEmail')}
                </label>
                {editMode ? (
                  <input
                    type="email"
                    value={editForm.contact_email}
                    onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{tenant.contact_email || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.detail.overview.contactPhone')}
                </label>
                {editMode ? (
                  <input
                    type="tel"
                    value={editForm.contact_phone}
                    onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{tenant.contact_phone || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.detail.overview.logoUrl')}
                </label>
                {editMode ? (
                  <input
                    type="text"
                    value={editForm.logo_url}
                    onChange={(e) => setEditForm({ ...editForm, logo_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{tenant.logo_url || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.detail.overview.primaryColor')}
                </label>
                {editMode ? (
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={editForm.primary_color}
                      onChange={(e) => setEditForm({ ...editForm, primary_color: e.target.value })}
                      className="h-10 w-20"
                    />
                    <input
                      type="text"
                      value={editForm.primary_color}
                      onChange={(e) => setEditForm({ ...editForm, primary_color: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: tenant.primary_color }}
                    ></div>
                    <p className="text-gray-900">{tenant.primary_color}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.detail.overview.secondaryColor')}
                </label>
                {editMode ? (
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={editForm.secondary_color}
                      onChange={(e) => setEditForm({ ...editForm, secondary_color: e.target.value })}
                      className="h-10 w-20"
                    />
                    <input
                      type="text"
                      value={editForm.secondary_color}
                      onChange={(e) => setEditForm({ ...editForm, secondary_color: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: tenant.secondary_color }}
                    ></div>
                    <p className="text-gray-900">{tenant.secondary_color}</p>
                  </div>
                )}
              </div>

              <div className="col-span-2">
                {editMode && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={editForm.is_active}
                      onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                      {t('tenants.detail.overview.active')}
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('tenants.detail.subscription.title')}</h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.detail.subscription.plan')}
                </label>
                {editMode ? (
                  <select
                    value={editForm.subscription_plan_id || ''}
                    onChange={(e) => setEditForm({ ...editForm, subscription_plan_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('tenants.detail.subscription.noplan')}</option>
                    {subscriptionPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - {plan.currency} {plan.price}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900">{tenant.subscription_plan_name || t('tenants.detail.subscription.noPlan')}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.detail.subscription.trialEndsAt')}
                </label>
                {editMode ? (
                  <input
                    type="date"
                    value={formatDate(editForm.trial_ends_at)}
                    onChange={(e) => setEditForm({ ...editForm, trial_ends_at: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{formatDate(tenant.trial_ends_at) || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenants.detail.subscription.subscriptionEndsAt')}
                </label>
                {editMode ? (
                  <input
                    type="date"
                    value={formatDate(editForm.subscription_ends_at)}
                    onChange={(e) => setEditForm({ ...editForm, subscription_ends_at: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{formatDate(tenant.subscription_ends_at) || '-'}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Languages Tab */}
        {activeTab === 'languages' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{t('tenants.detail.languages.title')}</h2>
              <button
                onClick={() => setShowLanguagesModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm"
              >
                {t('tenants.detail.languages.manage')}
              </button>
            </div>

            {tenant.languages && tenant.languages.length > 0 ? (
              <div className="space-y-2">
                {tenant.languages.map((lang: any) => (
                  <div
                    key={lang.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{lang.flag_emoji || '🏴'}</span>
                      <div>
                        <div className="font-medium text-gray-900">{lang.native_name}</div>
                        <div className="text-sm text-gray-500">
                          {lang.name} ({lang.code})
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {lang.is_default && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                          {t('tenants.detail.languages.default')}
                        </span>
                      )}
                      {lang.is_active ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          {t('tenants.detail.languages.active')}
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                          {t('tenants.detail.languages.inactive')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Globe className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-4">{t('tenants.detail.languages.noLanguages')}</p>
                <button
                  onClick={() => setShowLanguagesModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  {t('tenants.detail.languages.addLanguages')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Currencies Tab */}
        {activeTab === 'currencies' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{t('tenants.detail.currencies.title')}</h2>
              <button
                onClick={() => setShowCurrenciesModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm"
              >
                {t('tenants.detail.currencies.manage')}
              </button>
            </div>

            {tenant.currencies && tenant.currencies.length > 0 ? (
              <div className="space-y-2">
                {tenant.currencies.map((curr: any) => (
                  <div
                    key={curr.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                        {curr.symbol}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{curr.name}</div>
                        <div className="text-sm text-gray-500">
                          {curr.code} - {curr.symbol}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {curr.is_default && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                          {t('tenants.detail.currencies.default')}
                        </span>
                      )}
                      {curr.is_active ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          {t('tenants.detail.currencies.active')}
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                          {t('tenants.detail.currencies.inactive')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-4">{t('tenants.detail.currencies.noCurrencies')}</p>
                <button
                  onClick={() => setShowCurrenciesModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  {t('tenants.detail.currencies.addCurrencies')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stores Tab */}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('tenants.detail.settings.title')}</h2>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                {t('tenants.detail.settings.comingSoon')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showLanguagesModal && tenant && (
        <ManageTenantLanguagesModal
          tenantId={tenant.id}
          tenantName={tenant.name}
          onClose={() => setShowLanguagesModal(false)}
          onSuccess={() => {
            setShowLanguagesModal(false);
            loadData();
          }}
        />
      )}

      {showCurrenciesModal && tenant && (
        <ManageTenantCurrenciesModal
          tenantId={tenant.id}
          tenantName={tenant.name}
          onClose={() => setShowCurrenciesModal(false)}
          onSuccess={() => {
            setShowCurrenciesModal(false);
            loadData();
          }}
        />
      )}

 
    </div>
  );
}