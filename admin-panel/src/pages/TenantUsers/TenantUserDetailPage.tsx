import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tenantUserService, TenantUser, Role } from '../../services/tenantUserService';
import { languageService, Language } from '../../services/languageService';
import { usePermissions } from '../../hooks/usePermissions';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Shield, Calendar, Save, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function TenantUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<TenantUser | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();

  const canEdit = hasPermission('tenant_users.edit');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    preferred_language_id: null as number | null,
    role_id: '',
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userData, rolesData, languagesData] = await Promise.all([
        tenantUserService.getTenantUserById(parseInt(id!)),
        tenantUserService.getAvailableRoles(),
        languageService.getActiveLanguages(),
      ]);

      setUser(userData);
      setRoles(rolesData);
      setLanguages(languagesData);

      setFormData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        preferred_language_id: userData.preferred_language_id,
        role_id: userData.role_id.toString(),
        is_active: userData.is_active,
      });
    } catch (error) {
      console.error('Failed to load user:', error);
      toast.error(t('teamMembers.toast.loadFailed'));
      navigate('/tenant/users');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Update user details
      await tenantUserService.updateTenantUser(user.id, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        preferred_language_id: formData.preferred_language_id,
        is_active: formData.is_active,
      });

      // Update role if changed
      if (formData.role_id !== user.role_id.toString()) {
        await tenantUserService.updateUserRole(user.id, parseInt(formData.role_id));
      }

      toast.success(t('teamMembers.toast.updateSuccess'));
      setEditing(false);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('teamMembers.toast.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!user) return;
    setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      preferred_language_id: user.preferred_language_id,
      role_id: user.role_id.toString(),
      is_active: user.is_active,
    });
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">{t('teamMembers.detail.loading')}</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="p-8">
      <button
        onClick={() => navigate('/tenant/users')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('teamMembers.detail.backToUsers')}
      </button>

      <div className="max-w-3xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : user.email}
            </h1>
            <p className="text-gray-600 mt-1">{user.email}</p>
          </div>

          {canEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
            >
              {t('teamMembers.detail.editUser')}
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('teamMembers.detail.sections.basicInfo')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('teamMembers.detail.fields.firstName')}
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{user.first_name || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('teamMembers.detail.fields.lastName')}
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{user.last_name || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  {t('teamMembers.detail.fields.email')}
                </label>
                <p className="text-gray-900">{user.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('teamMembers.detail.fields.preferredLanguage')}
                </label>
                {editing ? (
                  <select
                    value={formData.preferred_language_id || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preferred_language_id: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('teamMembers.detail.fields.default')}</option>
                    {languages.map((lang) => (
                      <option key={lang.id} value={lang.id}>
                        {lang.native_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900">
                    {languages.find((l) => l.id === user.preferred_language_id)
                      ?.native_name || t('teamMembers.detail.fields.default')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Role & Status */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold mb-4">{t('teamMembers.detail.sections.roleAccess')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Shield className="w-4 h-4 inline mr-2" />
                  {t('teamMembers.detail.fields.role')}
                </label>
                {editing ? (
                  <select
                    value={formData.role_id}
                    onChange={(e) =>
                      setFormData({ ...formData, role_id: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.display_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900">{user.role_display_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('teamMembers.detail.fields.status')}
                </label>
                {editing ? (
                  <select
                    value={formData.is_active ? '1' : '0'}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.value === '1' })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="1">{t('teamMembers.status.active')}</option>
                    <option value="0">{t('teamMembers.status.inactive')}</option>
                  </select>
                ) : (
                  <div>
                    {user.is_active ? (
                      <span className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-800">
                        {t('teamMembers.status.active')}
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-sm rounded-full bg-red-100 text-red-800">
                        {t('teamMembers.status.inactive')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Activity */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold mb-4">{t('teamMembers.detail.sections.activity')}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-gray-600 mb-1">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  {t('teamMembers.detail.activity.lastLogin')}
                </label>
                <p className="text-gray-900">
                  {user.last_login_at
                    ? new Date(user.last_login_at).toLocaleString()
                    :  t('teamMembers.lastLogin.never')}
                </p>
              </div>
              <div>
                <label className="block text-gray-600 mb-1">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  {t('teamMembers.detail.activity.joined')}
                </label>
                <p className="text-gray-900">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {editing && (
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? t('teamMembers.actions.saving') : t('teamMembers.actions.saveChanges')}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                {t('teamMembers.actions.cancel')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}