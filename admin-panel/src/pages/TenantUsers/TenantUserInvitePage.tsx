import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenantUserService, Role } from '../../services/tenantUserService';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function TenantUserInvitePage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role_id: '',
    first_name: '',
    last_name: '',
  });
  const { t } = useTranslation();

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const rolesData = await tenantUserService.getAvailableRoles();
      setRoles(rolesData);
      if (rolesData.length > 0) {
        setFormData((prev) => ({ ...prev, role_id: rolesData[0].id.toString() }));
      }
    } catch (error) {
      toast.error(t('invite.toast.loadRolesFailed'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await tenantUserService.inviteUser({
        email: formData.email,
        role_id: parseInt(formData.role_id),
        first_name: formData.first_name || undefined,
        last_name: formData.last_name || undefined,
      });

      toast.success(t('invite.toast.success'));
      navigate('/tenant/users');
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('invite.toast.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <button
        onClick={() => navigate('/tenant/users')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('invite.backToUsers')}
      </button>

      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('invite.title')}</h1>
        <p className="text-gray-600 mb-8">
          {t('invite.subtitle')}
        </p>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              {t('invite.fields.email')}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('invite.placeholders.email')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Shield className="w-4 h-4 inline mr-2" />
              {t('invite.fields.role')}
            </label>
            <select
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.display_name}
                </option>
              ))}
            </select>
            {roles.length > 0 && formData.role_id && (
              <p className="mt-2 text-sm text-gray-600">
                {roles.find((r) => r.id === parseInt(formData.role_id))?.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('invite.fields.firstNameOptional')}
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('invite.placeholders.firstName')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('invite.fields.lastNameOptional')}
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('invite.placeholders.lastName')}
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              {t('invite.note')}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50"
            >
              {loading ? t('invite.actions.sending') : t('invite.actions.send')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/tenant/users')}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              {t('invite.actions.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}