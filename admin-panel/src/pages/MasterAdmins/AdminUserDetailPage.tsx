import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Shield, Crown, Plus, X, Trash2 } from 'lucide-react';
import { AdminUser, TenantAccess, adminUserService } from '@/services/frontend-adminUserService';
import { Role, rolePermissionService } from '@/services/frontend-rolePermissionService';
import { tenantService, Tenant } from '@/services/tenantService-frontend';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function AdminUserDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Grant Access Modal
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState(0);
  const [selectedRoleId, setSelectedRoleId] = useState(0);

  useEffect(() => {
    if (id) {
      loadUser();
    }
  }, [id]);

  const loadUser = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await adminUserService.getAdminUserById(parseInt(id));
      setUser(data);
    } catch (error: any) {
      toast.error(t('adminUsers.detail.loadFailed'));
      navigate('/admin-users');
    } finally {
      setLoading(false);
    }
  };

  const openGrantModal = async () => {
    try {
      const [tenantsData, rolesData] = await Promise.all([
        tenantService.getTenants(),
        rolePermissionService.getRoles(),
      ]);
      setTenants(tenantsData);
      setRoles(rolesData.filter(r => r.is_active));
      setShowGrantModal(true);
    } catch (error: any) {
      toast.error(t('adminUsers.detail.loadDataFailed'));
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTenantId || !selectedRoleId) {
      toast.error(t('adminUsers.detail.selectBothRequired'));
      return;
    }

    try {
      await adminUserService.grantTenantAccess(parseInt(id!), {
        tenant_id: selectedTenantId,
        role_id: selectedRoleId,
      });
      toast.success(t('adminUsers.detail.grantSuccess'));
      setShowGrantModal(false);
      loadUser();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('adminUsers.detail.grantFailed'));
    }
  };

  const handleRevokeAccess = async (access: TenantAccess) => {
    if (!confirm(t('adminUsers.detail.confirmRevoke', { tenantName: access.tenant_name }))) return;

    try {
      await adminUserService.revokeTenantAccess(parseInt(id!), access.tenant_id);
      toast.success(t('adminUsers.detail.revokeSuccess'));
      loadUser();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('adminUsers.detail.revokeFailed'));
    }
  };

  if (loading || !user) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const displayName = user.first_name
    ? `${user.first_name} ${user.last_name || ''}`
    : user.email;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/admin-users')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('adminUsers.detail.backToUsers')}
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              {displayName}
              {user.is_super_admin && (
                <Crown className="w-6 h-6 text-yellow-500" />
              )}
            </h1>
            <p className="text-gray-600 mt-2">{user.email}</p>
          </div>

          <button
            onClick={() => navigate(`/admin-users/${user.id}/edit`)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Edit className="w-4 h-4" />
            {t('adminUsers.detail.editUser')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('adminUsers.detail.userInformation')}</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('adminUsers.detail.status')}</label>
              <span
                className={`inline-block px-2 py-1 text-xs rounded-full ${
                  user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {user.is_active ? t('adminUsers.detail.active') : t('adminUsers.detail.inactive')}
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('adminUsers.detail.roleType')}</label>
              {user.is_super_admin ? (
                <span className="flex items-center gap-1 text-sm">
                  <Shield className="w-4 h-4 text-yellow-500" />
                  <span className="text-yellow-700 font-medium">{t('adminUsers.detail.superAdmin')}</span>
                </span>
              ) : (
                <span className="text-sm text-gray-900">{t('adminUsers.detail.admin')}</span>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('adminUsers.detail.lastLogin')}</label>
              <span className="text-sm text-gray-900">
                {user.last_login_at
                  ? new Date(user.last_login_at).toLocaleString()
                  : t('adminUsers.detail.never')}
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('adminUsers.detail.created')}</label>
              <span className="text-sm text-gray-900">
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Tenant Access */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">{t('adminUsers.detail.tenantAccess')}</h3>
            {!user.is_super_admin && (
              <button
                onClick={openGrantModal}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm transition"
              >
                <Plus className="w-4 h-4" />
                {t('adminUsers.detail.grantAccess')}
              </button>
            )}
          </div>

          {user.is_super_admin ? (
            <div className="text-center py-8 text-gray-600">
              <Shield className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
              <p>{t('adminUsers.detail.superAdminAccess')}</p>
            </div>
          ) : user.tenant_access && user.tenant_access.length > 0 ? (
            <div className="space-y-2">
              {user.tenant_access.map((access) => (
                <div
                  key={access.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {access.tenant_name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {t('adminUsers.detail.role')}: {access.role_display_name}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeAccess(access)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title={t('adminUsers.detail.revokeAccess')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              <p>{t('adminUsers.detail.noAccess')}</p>
              <button
                onClick={openGrantModal}
                className="mt-4 text-blue-600 hover:text-blue-700"
              >
                {t('adminUsers.detail.grantAccessLink')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grant Access Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t('adminUsers.detail.grantAccessModal.title')}</h2>
              <button
                onClick={() => setShowGrantModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGrantAccess} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('adminUsers.detail.grantAccessModal.tenant')}
                  </label>
                  <select
                    required
                    value={selectedTenantId}
                    onChange={(e) => setSelectedTenantId(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('adminUsers.detail.grantAccessModal.selectTenant')}</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('adminUsers.detail.grantAccessModal.role')}
                  </label>
                  <select
                    required
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('adminUsers.detail.grantAccessModal.selectRole')}</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.display_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('adminUsers.detail.grantAccessModal.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  {t('adminUsers.detail.grantAccessModal.grant')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
