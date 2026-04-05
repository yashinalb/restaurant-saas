import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { tenantUserService } from '../../services/tenantUserService';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    password: '',
    confirmPassword: '',
  });
  const { t } = useTranslation();

  useEffect(() => {
    if (!token) {
      toast.error(t('accept.toast.invalidLink'));
      navigate('/login');
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (formData.password.length < 8) {
      toast.error(t('accept.toast.passwordMin'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error(t('accept.toast.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      await tenantUserService.acceptInvitation({
        token: token!,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
      });

      toast.success(t('accept.toast.success'));
      navigate('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('accept.toast.failed'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('accept.title')}</h1>
          <p className="text-gray-600">{t('accept.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('accept.fields.firstName')} 
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('accept.fields.lastName')}
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('accept.fields.password')} 
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder={t('accept.placeholders.password') || 'Enter your password'}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('accept.fields.confirmPassword')}
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder={t('accept.placeholders.confirmPassword') || 'Re-enter password'}
              required
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">{t('accept.requirements.title')}</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{t('accept.requirements.items.min')}</li>
                <li>{t('accept.requirements.items.strong')}</li>
              </ul>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('accept.actions.creating') : t('accept.actions.create')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            {t('accept.footer.alreadyHaveAccount')}{' '}
            <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              {t('accept.footer.signIn')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}