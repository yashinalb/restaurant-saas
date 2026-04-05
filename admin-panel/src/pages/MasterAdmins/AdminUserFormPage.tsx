import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Shield, Eye, EyeOff } from 'lucide-react';
import {
  CreateAdminUserData,
  UpdateAdminUserData,
  adminUserService,
} from '@/services/frontend-adminUserService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function AdminUserFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    avatar_url: '',
    is_super_admin: false,
    is_active: true,
  });

  useEffect(() => {
    if (isEdit && id) {
      loadUser();
    }
  }, [id]);

  const loadUser = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const user = await adminUserService.getAdminUserById(parseInt(id));
      setFormData({
        email: user.email,
        password: '', // Don't populate password on edit
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        avatar_url: user.avatar_url || '',
        is_super_admin: user.is_super_admin,
        is_active: user.is_active,
      });
    } catch (error: any) {
      toast.error(t('adminUsers.form.loadFailed'));
      navigate('/admin-users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.email) {
      toast.error(t('adminUsers.form.emailRequired'));
      return;
    }

    if (!isEdit && !formData.password) {
      toast.error(t('adminUsers.form.passwordRequiredNew'));
      return;
    }

    if (formData.password && formData.password.length < 8) {
      toast.error(t('adminUsers.form.passwordMinLength'));
      return;
    }

    try {
      setSaving(true);

      if (isEdit && id) {
        const updateData: UpdateAdminUserData = {
          email: formData.email,
          first_name: formData.first_name || undefined,
          last_name: formData.last_name || undefined,
          avatar_url: formData.avatar_url || undefined,
          is_super_admin: formData.is_super_admin,
          is_active: formData.is_active,
        };

        // Only include password if it was changed
        if (formData.password) {
          updateData.password = formData.password;
        }

        await adminUserService.updateAdminUser(parseInt(id), updateData);
        toast.success(t('adminUsers.form.updateSuccess'));
      } else {
        const createData: CreateAdminUserData = {
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name || undefined,
          last_name: formData.last_name || undefined,
          avatar_url: formData.avatar_url || undefined,
          is_super_admin: formData.is_super_admin,
          is_active: formData.is_active,
        };

        await adminUserService.createAdminUser(createData);
        toast.success(t('adminUsers.form.createSuccess'));
      }

      navigate('/admin-users');
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('adminUsers.form.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/admin-users')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('adminUsers.form.backToUsers')}
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          {isEdit ? t('adminUsers.form.editTitle') : t('adminUsers.form.createTitle')}
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('adminUsers.form.email')}
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('adminUsers.form.placeholders.email')}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isEdit ? t('adminUsers.form.password') : t('adminUsers.form.passwordRequired')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!isEdit}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  placeholder={isEdit ? t('adminUsers.form.placeholders.passwordKeepCurrent') : t('adminUsers.form.placeholders.passwordMinChars')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {isEdit && (
                <p className="text-xs text-gray-500 mt-1">
                  {t('adminUsers.form.passwordHint')}
                </p>
              )}
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('adminUsers.form.firstName')}
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('adminUsers.form.placeholders.firstName')}
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('adminUsers.form.lastName')}
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('adminUsers.form.placeholders.lastName')}
              />
            </div>

            {/* Avatar URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('adminUsers.form.avatarUrl')}
              </label>
              <input
                type="url"
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('adminUsers.form.placeholders.avatarUrl')}
              />
            </div>

            {/* Super Admin */}
            <div className="border-t border-gray-200 pt-6">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.is_super_admin}
                  onChange={(e) =>
                    setFormData({ ...formData, is_super_admin: e.target.checked })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-700">{t('adminUsers.form.superAdmin')}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('adminUsers.form.superAdminDesc')}
                  </p>
                </div>
              </label>
            </div>

            {/* Active */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">{t('adminUsers.form.active')}</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                {t('adminUsers.form.inactiveDesc')}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={() => navigate('/admin-users')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {t('adminUsers.form.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? t('adminUsers.form.saving') : isEdit ? t('adminUsers.form.updateUser') : t('adminUsers.form.createUser')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
