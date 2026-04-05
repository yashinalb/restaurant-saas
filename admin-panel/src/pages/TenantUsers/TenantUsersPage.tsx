import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tenantUserService, TenantUser, UserInvitation } from '../../services/tenantUserService';
import { usePermissions } from '../../hooks/usePermissions';
import { toast } from 'sonner';
import { Users, UserPlus, Mail, Trash2, Shield, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function TenantUsersPage() {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasPermission } = usePermissions();

  const canInvite = hasPermission('tenant_users.invite');
  const canDelete = hasPermission('tenant_users.delete');
  const { t } = useTranslation();
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, invitationsData] = await Promise.all([
        tenantUserService.getTenantUsers(),
        tenantUserService.getPendingInvitations(),
      ]);
      setUsers(usersData);
      setInvitations(invitationsData);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error(t('teamMembers.toast.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    if (!confirm(t('teamMembers.confirm.cancelInvitation'))) return;

    try {
      await tenantUserService.cancelInvitation(invitationId);
      toast.success(t('teamMembers.toast.cancelSuccess'));
      loadData();
    } catch (error) {
      toast.error(t('teamMembers.toast.cancelFailed'));
    }
  };

  

  const handleRemoveUser = async (userId: number, userName: string) => {
    if (!confirm(t('teamMembers.confirm.removeUser', { userName }))) return;

    try {
      await tenantUserService.removeUser(userId);
      toast.success(t('teamMembers.toast.removeSuccess'));
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('teamMembers.toast.removeFailed'));
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">{t('teamMembers.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('teamMembers.title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('teamMembers.subtitle')}
          </p>
        </div>
        {canInvite && (
          <Link
            to="/tenant/users/invite"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <UserPlus className="w-5 h-5" />
            {t('teamMembers.inviteUser')}
          </Link>
        )}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-yellow-900 flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5" />
            {t('teamMembers.pendingInvitations')} ({invitations.length})
          </h3>
          <div className="space-y-2">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="bg-white p-3 rounded border border-yellow-200 flex justify-between items-center"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-gray-900">{invitation.email}</p>
                    <p className="text-sm text-gray-600">
                      {t('teamMembers.role')}: {invitation.role_display_name} • {t('teamMembers.invitedBy')}{' '}
                      {invitation.invited_by_first_name || invitation.invited_by_email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t('teamMembers.expires')}: {new Date(invitation.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {canInvite && (
                  <button
                    onClick={() => handleCancelInvitation(invitation.id)}
                    className="text-red-600 hover:text-red-700 p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Users */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t('teamMembers.activeUsers')} ({users.length})
          </h3>
        </div>

        {users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>{t('teamMembers.empty.noUsersYet')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('teamMembers.table.user')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('teamMembers.table.role')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('teamMembers.table.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('teamMembers.table.lastLogin')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('teamMembers.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                          {user.first_name?.[0] || user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.first_name && user.last_name
                              ? `${user.first_name} ${user.last_name}`
                              : user.email}
                          </p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {user.role_display_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.is_active ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          {t('teamMembers.status.active')}
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                          {t('teamMembers.status.inactive')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.last_login_at
                        ? new Date(user.last_login_at).toLocaleDateString()
                        : t('teamMembers.lastLogin.never')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/tenant/users/${user.id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          {t('teamMembers.actions.view')}
                        </Link>
                        {canDelete && (
                          <button
                            onClick={() =>
                              handleRemoveUser(
                                user.id,
                                user.first_name || user.email
                              )
                            }
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            {t('teamMembers.actions.remove')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}