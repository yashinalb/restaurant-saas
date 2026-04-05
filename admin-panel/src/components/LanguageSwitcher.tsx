import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { authService } from '../services/authService';
import { languageService, Language } from '../services/languageService'; // ✅ Keep same import
import { getFlagForLanguage } from '../utils/flagMapping';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const { user, loadProfile } = useAuthStore();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLanguages();
  }, []);

  const loadLanguages = async () => {
    try {
      // ✅ Use getActiveLanguages (works for all authenticated users)
      const langs = await languageService.getActiveLanguages();
      setLanguages(langs);
    } catch (error) {
      console.error('Failed to load languages:', error);
      toast.error('Failed to load languages');
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = async (language: Language) => {
    try {
      setSaving(true);
      
      // Change UI language immediately
      i18n.changeLanguage(language.code);
      localStorage.setItem('adminLanguage', language.code);

      // Save preference to backend
      await authService.updateLanguagePreference(language.id);
      
      // Reload profile to update user data
      await loadProfile();
      
      toast.success(`Language changed to ${language.native_name}`);
    } catch (error) {
      console.error('Failed to save language preference:', error);
      toast.error('Language changed but preference not saved');
    } finally {
      setSaving(false);
    }
  };

  const currentLanguage = languages.find(l => l.code === i18n.language) || languages[0];
  const preferredLanguageId = user?.preferred_language_id;

  if (loading || !currentLanguage) {
    return (
      <div className="w-full px-3 py-2">
        <div className="flex items-center gap-2 text-gray-400">
          <Globe className="w-4 h-4 animate-pulse" />
          <span className="text-sm">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <button 
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
        disabled={saving}
      >
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4" />
          <span className="text-sm">
            {getFlagForLanguage(currentLanguage.code)} {currentLanguage.native_name}
          </span>
        </div>
      </button>

      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        {languages.map((lang) => {
          const isCurrentUI = i18n.language === lang.code;
          const isPreferred = preferredLanguageId === lang.id;

          return (
            <button
              key={lang.id}
              onClick={() => changeLanguage(lang)}
              disabled={saving}
              className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition first:rounded-t-lg last:rounded-b-lg disabled:opacity-50 ${
                isCurrentUI ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{getFlagForLanguage(lang.code)}</span>
                <div className="text-left">
                  <div className="font-medium">{lang.native_name}</div>
                  {isPreferred && (
                    <div className="text-xs text-green-600">{t('common.default')}</div>
                  )}
                </div>
              </div>
              {isCurrentUI && <Check className="w-4 h-4" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}