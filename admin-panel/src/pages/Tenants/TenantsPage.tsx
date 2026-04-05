import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  Plus,
  Edit,
  Trash2,
  Search,
  Eye,
  Globe,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tenant, tenantService } from '@/services/tenantService-frontend';
import { useTranslation } from 'react-i18next';

export default function TenantsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await tenantService.getTenants();
      setTenants(data);
    } catch (error: any) {
      toast.error(t('tenants.list.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    if (!confirm(t('tenants.list.confirmDelete', { name: tenant.name }))) {
      return;
    }

    try {
      await tenantService.deleteTenant(tenant.id);
      toast.success(t('tenants.list.deleteSuccess'));
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('tenants.list.deleteFailed'));
    }
  };

  const handleViewTenant = (tenantId: number) => {
    navigate(`/tenants/${tenantId}`);
  };

  const getSubscriptionStatus = (tenant: Tenant) => {
    const now = new Date();

    if (tenant.trial_ends_at && new Date(tenant.trial_ends_at) > now) {
      return {
        label: t('tenants.status.trial'),
        color: 'bg-blue-100 text-blue-800',
        icon: <Clock className="w-3 h-3" />,
      };
    }

    if (tenant.subscription_ends_at && new Date(tenant.subscription_ends_at) < now) {
      return {
        label: t('tenants.status.expired'),
        color: 'bg-red-100 text-red-800',
        icon: <AlertTriangle className="w-3 h-3" />,
      };
    }

    if (!tenant.is_active) {
      return {
        label: t('tenants.status.inactive'),
        color: 'bg-gray-100 text-gray-800',
        icon: <XCircle className="w-3 h-3" />,
      };
    }

    return {
      label: t('tenants.status.active'),
      color: 'bg-green-100 text-green-800',
      icon: <CheckCircle className="w-3 h-3" />,
    };
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const filteredTenants = tenants.filter((tenant) => {
    const query = searchQuery.toLowerCase();
    return (
      tenant.name.toLowerCase().includes(query) ||
      tenant.slug.toLowerCase().includes(query) ||
      tenant.domain?.toLowerCase().includes(query) ||
      tenant.subdomain?.toLowerCase().includes(query) ||
      tenant.tenant_type_name?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('tenants.list.title')}</h1>
          <p className="text-gray-600 mt-2">{t('tenants.list.subtitle')}</p>
        </div>
        <button
          onClick={() => navigate('/tenants/new')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          {t('tenants.list.addTenant')}
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={t('tenants.list.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('tenants.list.stats.total')}</p>
              <p className="text-2xl font-bold text-gray-900">{tenants.length}</p>
            </div>
            <Store className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('tenants.list.stats.active')}</p>
              <p className="text-2xl font-bold text-green-600">
                {tenants.filter((tn) => tn.is_active).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('tenants.list.stats.onTrial')}</p>
              <p className="text-2xl font-bold text-blue-600">
                {
                  tenants.filter(
                    (tn) =>
                      tn.trial_ends_at && new Date(tn.trial_ends_at) > new Date()
                  ).length
                }
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('tenants.list.stats.inactive')}</p>
              <p className="text-2xl font-bold text-gray-600">
                {tenants.filter((tn) => !tn.is_active).length}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">{t('tenants.list.loadingTenants')}</p>
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {searchQuery ? t('tenants.list.noTenantsSearch') : t('tenants.list.noTenants')}
          </p>
          {!searchQuery && (
            <button
              onClick={() => navigate('/tenants/new')}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              {t('tenants.list.addFirst')}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('tenants.list.tableHeaders.tenant')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('tenants.list.tableHeaders.type')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('tenants.list.tableHeaders.subscription')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('tenants.list.tableHeaders.languages')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('tenants.list.tableHeaders.currencies')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('tenants.list.tableHeaders.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('tenants.list.tableHeaders.created')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('tenants.list.tableHeaders.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTenants.map((tenant) => {
                const status = getSubscriptionStatus(tenant);
                return (
                  <tr
                    key={tenant.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleViewTenant(tenant.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {tenant.logo_url ? (
                          <img
                            src={
                              tenant.logo_url.startsWith('/uploads')
                                ? `http://localhost:3006${tenant.logo_url}`
                                : tenant.logo_url
                            }
                            alt={tenant.name}
                            className="w-10 h-10 rounded-full object-cover mr-3"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                            <Store className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {tenant.name}
                          </div>
                          <div className="text-sm text-gray-500">{tenant.slug}</div>
                          {tenant.domain && (
                            <div className="text-xs text-gray-400">{tenant.domain}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {tenant.tenant_type_name || '-'}
                      </div>
                      {tenant.tenant_type_code && (
                        <div className="text-xs text-gray-500">
                          {tenant.tenant_type_code}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {tenant.subscription_plan_name || t('tenants.list.noPlan')}
                      </div>
                      {tenant.subscription_plan_price && (
                        <div className="text-xs text-gray-500">
                          {tenant.subscription_plan_currency}{' '}
                          {tenant.subscription_plan_price}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {tenant.languages_count || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {tenant.currencies_count || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${status.color}`}
                      >
                        {status.icon}
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {formatDate(tenant.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleViewTenant(tenant.id)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title={t('tenants.list.viewDetails')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/tenants/${tenant.id}/edit`)}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                          title={t('tenants.list.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTenant(tenant)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title={t('tenants.list.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
