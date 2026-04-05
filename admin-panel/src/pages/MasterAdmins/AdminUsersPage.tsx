import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Edit, Trash2, Shield, UserPlus, Crown } from 'lucide-react';
import { AdminUser, adminUserService } from '@/services/frontend-adminUserService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminUserService.getAdminUsers();
      setUsers(data);
    } catch (error: any) {
      toast.error(t('adminUsers.list.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    const displayName = user.first_name
      ? `${user.first_name} ${user.last_name || ''}`
      : user.email;

    if (!confirm(t('adminUsers.list.confirmDelete', { name: displayName }))) return;

    try {
      await adminUserService.deleteAdminUser(user.id);
      toast.success(t('adminUsers.list.deleteSuccess'));
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('adminUsers.list.deleteFailed'));
    }
  };

  const getDisplayName = (user: AdminUser) => {
    if (user.first_name) {
      return `${user.first_name} ${user.last_name || ''}`.trim();
    }
    return user.email;
  };

  const getInitials = (user: AdminUser) => {
    if (user.first_name) {
      return `${user.first_name[0]}${user.last_name?.[0] || ''}`.toUpperCase();
    }
    return user.email[0].toUpperCase();
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('adminUsers.list.title')}</h1>
          <p className="text-gray-600 mt-2">
            {t('adminUsers.list.subtitle')}
          </p>
        </div>
        <button
          onClick={() => navigate('/admin-users/new')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          {t('adminUsers.list.addUser')}
        </button>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">{t('adminUsers.list.loadingUsers')}</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">{t('adminUsers.list.noUsers')}</p>
          <button
            onClick={() => navigate('/admin-users/new')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            {t('adminUsers.list.createFirst')}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('adminUsers.list.tableHeaders.user')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('adminUsers.list.tableHeaders.email')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('adminUsers.list.tableHeaders.roleType')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('adminUsers.list.tableHeaders.tenantAccess')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('adminUsers.list.tableHeaders.lastLogin')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('adminUsers.list.tableHeaders.status')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('adminUsers.list.tableHeaders.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={getDisplayName(user)}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {getInitials(user)}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {getDisplayName(user)}
                          {user.is_super_admin && (
                            <span title="Super Admin">
                              <Crown className="w-4 h-4 text-yellow-500" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{user.email}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.is_super_admin ? (
                      <span className="flex items-center gap-1 text-sm">
                        <Shield className="w-4 h-4 text-yellow-500" />
                        <span className="text-yellow-700 font-medium">{t('adminUsers.list.superAdmin')}</span>
                      </span>
                    ) : (
                      <span className="text-sm text-gray-600">{t('adminUsers.list.admin')}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => navigate(`/admin-users/${user.id}`)}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{user.tenant_count || 0} {t('adminUsers.list.tenants')}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {user.last_login_at
                        ? new Date(user.last_login_at).toLocaleDateString()
                        : t('adminUsers.list.never')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        user.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user.is_active ? t('adminUsers.list.active') : t('adminUsers.list.inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/admin-users/${user.id}/edit`)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title={t('adminUsers.list.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title={t('adminUsers.list.delete')}
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
    </div>
  );
}
