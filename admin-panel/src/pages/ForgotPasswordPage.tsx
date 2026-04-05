import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../services/authService';
import { useTranslation } from 'react-i18next';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error(t('forgotPassword.toast.emailRequired'));
      return;
    }

    try {
      setLoading(true);
      await authService.forgotPassword(email);
      setSubmitted(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('forgotPassword.toast.sendFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('forgotPassword.submitted.title')}</h1>
            <p className="text-gray-600 mb-6">
              {t('forgotPassword.submitted.message', { email })}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {t('forgotPassword.submitted.checkSpam')}
            </p>
            <div className="space-y-3">
              <Link
                to="/login"
                className="block w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                {t('forgotPassword.submitted.backToLogin')}
              </Link>
              <button
                onClick={() => setSubmitted(false)}
                className="block w-full px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition"
              >
                {t('forgotPassword.submitted.tryAnother')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('forgotPassword.backToLogin')}
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{t('forgotPassword.title')}</h1>
            <p className="text-gray-600 mt-2">
              {t('forgotPassword.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('forgotPassword.emailLabel')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('forgotPassword.emailPlaceholder')}
                  required
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('forgotPassword.sending') : t('forgotPassword.sendResetLink')}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>{t('forgotPassword.demoAccounts.title')}</p>
          <p className="mt-1">{t('forgotPassword.demoAccounts.superAdmin')}</p>
          <p>{t('forgotPassword.demoAccounts.tenantOwner')}</p>
        </div>
      </div>
    </div>
  );
}
