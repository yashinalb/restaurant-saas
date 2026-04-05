import { useEffect, useState } from 'react';
import { CreditCard, Plus, Edit, Trash2, X, Building2, Users, Check } from 'lucide-react';
import ManagePlanTenantTypesModal from '../components/ManagePlanTenantTypesModal';
import { toast } from 'sonner';
import { CreateSubscriptionPlanData, SubscriptionPlan, subscriptionPlanService } from '@/services/subscriptionPlanService-frontend';
import { useTranslation } from 'react-i18next';

export default function SubscriptionPlansPage() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const [showManageTenantTypesModal, setShowManageTenantTypesModal] = useState(false);
  const [selectedPlanForTypes, setSelectedPlanForTypes] = useState<SubscriptionPlan | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState<CreateSubscriptionPlanData>({
    name: '',
    slug: '',
    description: '',
    price: 0,
    currency: 'EUR',
    billing_period: 'monthly',
    max_products: null,
    max_stores: 1,
    max_campaigns: null,
    features: [],
    is_active: true,
    sort_order: 0,
  });

  const [editForm, setEditForm] = useState<Partial<SubscriptionPlan>>({});

  // Feature input states
  const [createFeatureInput, setCreateFeatureInput] = useState('');
  const [editFeatureInput, setEditFeatureInput] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await subscriptionPlanService.getSubscriptionPlans();
      setPlans(data);
    } catch (error: any) {
      toast.error(t('subscriptionPlans.toast.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.name.trim() || !createForm.slug.trim() || !createForm.billing_period) {
      toast.error(t('subscriptionPlans.toast.requiredFields'));
      return;
    }

    try {
      // Use 0 for "Contact Us" pricing to satisfy type requirements
      const formData = {
        ...createForm,
        price: createForm.price === undefined || createForm.price === null ? 0 : createForm.price
      };
      await subscriptionPlanService.createSubscriptionPlan(formData);
      toast.success(t('subscriptionPlans.toast.createSuccess'));
      setShowCreateModal(false);
      resetCreateForm();
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('subscriptionPlans.toast.createFailed'));
    }
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    try {
      // Convert 0 to undefined for "Contact Us" pricing to satisfy type requirements
      const formData = {
        ...editForm,
        price: editForm.price === 0 ? undefined : editForm.price
      };
      await subscriptionPlanService.updateSubscriptionPlan(selectedPlan.id, formData);
      toast.success(t('subscriptionPlans.toast.updateSuccess'));
      setShowEditModal(false);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('subscriptionPlans.toast.updateFailed'));
    }
  };

  const handleDeletePlan = async (plan: SubscriptionPlan) => {
    if (!confirm(t('subscriptionPlans.confirmDelete', { name: plan.name }))) return;

    try {
      await subscriptionPlanService.deleteSubscriptionPlan(plan.id);
      toast.success(t('subscriptionPlans.toast.deleteSuccess'));
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('subscriptionPlans.toast.deleteFailed'));
    }
  };

  const openEditModal = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setEditForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      price: plan.price,
      currency: plan.currency,
      billing_period: plan.billing_period,
      max_products: plan.max_products,
      max_stores: plan.max_stores,
      max_campaigns: plan.max_campaigns,
      features: plan.features || [],
      is_active: plan.is_active,
      sort_order: plan.sort_order,
    });
    setShowEditModal(true);
  };

  const openManageTenantTypesModal = (plan: SubscriptionPlan) => {
    setSelectedPlanForTypes(plan);
    setShowManageTenantTypesModal(true);
  };

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      slug: '',
      description: '',
      price: 0,
      currency: 'EUR',
      billing_period: 'monthly',
      max_products: null,
      max_stores: 1,
      max_campaigns: null,
      features: [],
      is_active: true,
      sort_order: 0,
    });
    setCreateFeatureInput('');
  };

  const addCreateFeature = () => {
    if (!createFeatureInput.trim()) return;
    setCreateForm(prev => ({
      ...prev,
      features: [...(prev.features || []), createFeatureInput.trim()],
    }));
    setCreateFeatureInput('');
  };

  const removeCreateFeature = (index: number) => {
    setCreateForm(prev => ({
      ...prev,
      features: prev.features?.filter((_: string, i: number) => i !== index),
    }));
  };

  const addEditFeature = () => {
    if (!editFeatureInput.trim()) return;
    setEditForm(prev => ({
      ...prev,
      features: [...(prev.features || []), editFeatureInput.trim()],
    }));
    setEditFeatureInput('');
  };

  const removeEditFeature = (index: number) => {
    setEditForm(prev => ({
      ...prev,
      features: prev.features?.filter((_: string, i: number) => i !== index),
    }));
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('subscriptionPlans.title')}</h1>
          <p className="text-gray-600 mt-2">{t('subscriptionPlans.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          {t('subscriptionPlans.addPlan')}
        </button>
      </div>

      {/* Plans Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">{t('subscriptionPlans.loading')}</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">{t('subscriptionPlans.noPlans')}</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            {t('subscriptionPlans.addFirst')}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('subscriptionPlans.tableHeaders.plan')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('subscriptionPlans.tableHeaders.price')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('subscriptionPlans.tableHeaders.limits')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('subscriptionPlans.tableHeaders.tenantTypes')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('subscriptionPlans.tableHeaders.activeTenants')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('subscriptionPlans.tableHeaders.status')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('subscriptionPlans.tableHeaders.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{plan.name}</div>
                      <div className="text-sm text-gray-500">{plan.slug}</div>
                      {plan.description && (
                        <div className="text-xs text-gray-400 mt-1 max-w-xs truncate">
                          {plan.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {plan.price !== null && plan.price !== undefined && !Number.isNaN(Number(plan.price))
                        ? `${plan.currency} ${Number(plan.price).toFixed(2)}`
                        : t('subscriptionPlans.contactUs')}
                    </div>

                    <div className="text-xs text-gray-500">
                      {plan.price !== null && plan.price !== undefined
                        ? t('subscriptionPlans.per', { period: plan.billing_period })
                        : t('subscriptionPlans.customPricing')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-xs text-gray-600">
                      <div>{t('subscriptionPlans.limits.products')}: {plan.max_products === null ? '∞' : plan.max_products}</div>
                      <div>{t('subscriptionPlans.limits.stores')}: {plan.max_stores}</div>
                      <div>{t('subscriptionPlans.limits.campaigns')}: {plan.max_campaigns === null ? '∞' : plan.max_campaigns}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => openManageTenantTypesModal(plan)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition"
                      title={t('subscriptionPlans.manageTenantTypes')}
                    >
                      <Building2 className="w-4 h-4" />
                      {t('subscriptionPlans.types', { count: plan.tenant_types_count || 0 })}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{plan.active_tenants_count || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${plan.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                        }`}
                    >
                      {plan.is_active ? t('subscriptionPlans.status.active') : t('subscriptionPlans.status.inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(plan)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title={t('subscriptionPlans.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title={t('subscriptionPlans.delete')}
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
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">{t('subscriptionPlans.createModal.title')}</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('subscriptionPlans.createModal.planName')}
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('subscriptionPlans.createModal.placeholders.name')}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('subscriptionPlans.createModal.slug')}
                  </label>
                  <input
                    type="text"
                    value={createForm.slug}
                    onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('subscriptionPlans.createModal.placeholders.slug')}
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('subscriptionPlans.createModal.description')}
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('subscriptionPlans.createModal.placeholders.description')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('subscriptionPlans.createModal.price')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={createForm.price || ''}
                    onChange={(e) => setCreateForm({ ...createForm, price: e.target.value ? parseFloat(e.target.value) : 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('subscriptionPlans.createModal.placeholders.price')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('subscriptionPlans.createModal.priceHint')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('subscriptionPlans.createModal.currency')}
                  </label>
                  <select
                    value={createForm.currency}
                    onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="TRY">TRY (₺)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('subscriptionPlans.createModal.billingPeriod')}
                  </label>
                  <select
                    value={createForm.billing_period}
                    onChange={(e) => setCreateForm({ ...createForm, billing_period: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="monthly">{t('subscriptionPlans.createModal.billingPeriods.monthly')}</option>
                    <option value="yearly">{t('subscriptionPlans.createModal.billingPeriods.yearly')}</option>
                    <option value="quarterly">{t('subscriptionPlans.createModal.billingPeriods.quarterly')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('subscriptionPlans.createModal.maxProducts')}
                  </label>
                  <input
                    type="number"
                    value={createForm.max_products || ''}
                    onChange={(e) => setCreateForm({ ...createForm, max_products: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('subscriptionPlans.createModal.placeholders.unlimited')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('subscriptionPlans.createModal.maxStores')}
                  </label>
                  <input
                    type="number"
                    value={createForm.max_stores}
                    onChange={(e) => setCreateForm({ ...createForm, max_stores: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('subscriptionPlans.createModal.maxCampaigns')}
                  </label>
                  <input
                    type="number"
                    value={createForm.max_campaigns || ''}
                    onChange={(e) => setCreateForm({ ...createForm, max_campaigns: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('subscriptionPlans.createModal.placeholders.unlimited')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('subscriptionPlans.createModal.sortOrder')}
                  </label>
                  <input
                    type="number"
                    value={createForm.sort_order}
                    onChange={(e) => setCreateForm({ ...createForm, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Features Section */}
              <div className="border-t border-gray-200 pt-6 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('subscriptionPlans.createModal.features')}</h3>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={createFeatureInput}
                    onChange={(e) => setCreateFeatureInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCreateFeature())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('subscriptionPlans.createModal.addFeature')}
                  />
                  <button
                    type="button"
                    onClick={addCreateFeature}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
                  >
                    {t('subscriptionPlans.createModal.add')}
                  </button>
                </div>
                {createForm.features && createForm.features.length > 0 && (
                  <div className="space-y-2">
                    {createForm.features.map((feature: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="flex-1 text-sm">{feature}</span>
                        <button
                          type="button"
                          onClick={() => removeCreateFeature(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mb-6">
                <input
                  type="checkbox"
                  id="create_is_active"
                  checked={createForm.is_active}
                  onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="create_is_active" className="text-sm font-medium text-gray-700">
                  {t('subscriptionPlans.createModal.active')}
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('subscriptionPlans.createModal.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  {t('subscriptionPlans.createModal.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal - Similar structure to Create Modal */}
      {showEditModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">{t('subscriptionPlans.editModal.title')}</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePlan} className="p-6">
              {/* Same form fields as create, but using editForm */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('subscriptionPlans.createModal.planName')}
                  </label>
                  <input
                    type="text"
                    value={editForm.name ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('subscriptionPlans.createModal.slug')}
                  </label>
                  <input
                    type="text"
                    value={editForm.slug ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('subscriptionPlans.createModal.description')}
                  </label>
                  <textarea
                    value={editForm.description ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('subscriptionPlans.createModal.price')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.price ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value ? parseFloat(e.target.value) : 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('subscriptionPlans.createModal.placeholders.price')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('subscriptionPlans.createModal.priceHint')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('subscriptionPlans.createModal.currency')}
                  </label>
                  <select
                    value={editForm.currency ?? 'TRY'}
                    onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="TRY">TRY (₺)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('subscriptionPlans.createModal.billingPeriod')}
                  </label>
                  <select
                    value={editForm.billing_period ?? 'monthly'}
                    onChange={(e) => setEditForm({ ...editForm, billing_period: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="monthly">{t('subscriptionPlans.createModal.billingPeriods.monthly')}</option>
                    <option value="yearly">{t('subscriptionPlans.createModal.billingPeriods.yearly')}</option>
                    <option value="quarterly">{t('subscriptionPlans.createModal.billingPeriods.quarterly')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('subscriptionPlans.createModal.maxProducts')}
                  </label>
                  <input
                    type="number"
                    value={editForm.max_products ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, max_products: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('subscriptionPlans.createModal.placeholders.unlimited')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('subscriptionPlans.createModal.maxStores')}
                  </label>
                  <input
                    type="number"
                    value={editForm.max_stores ?? 1}
                    onChange={(e) => setEditForm({ ...editForm, max_stores: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('subscriptionPlans.createModal.maxCampaigns')}
                  </label>
                  <input
                    type="number"
                    value={editForm.max_campaigns ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, max_campaigns: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('subscriptionPlans.createModal.placeholders.unlimited')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('subscriptionPlans.createModal.sortOrder')}
                  </label>
                  <input
                    type="number"
                    value={editForm.sort_order ?? 0}
                    onChange={(e) => setEditForm({ ...editForm, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Features Section */}
              <div className="border-t border-gray-200 pt-6 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('subscriptionPlans.createModal.features')}</h3>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={editFeatureInput}
                    onChange={(e) => setEditFeatureInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEditFeature())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('subscriptionPlans.createModal.addFeature')}
                  />
                  <button
                    type="button"
                    onClick={addEditFeature}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
                  >
                    {t('subscriptionPlans.createModal.add')}
                  </button>
                </div>
                {editForm.features && editForm.features.length > 0 && (
                  <div className="space-y-2">
                    {(editForm.features as string[]).map((feature: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="flex-1 text-sm">{feature}</span>
                        <button
                          type="button"
                          onClick={() => removeEditFeature(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mb-6">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="edit_is_active" className="text-sm font-medium text-gray-700">
                  {t('subscriptionPlans.createModal.active')}
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('subscriptionPlans.createModal.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  {t('subscriptionPlans.editModal.update')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tenant Types Modal */}
      {showManageTenantTypesModal && selectedPlanForTypes && (
        <ManagePlanTenantTypesModal
          plan={selectedPlanForTypes}
          onClose={() => {
            setShowManageTenantTypesModal(false);
            setSelectedPlanForTypes(null);
          }}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
