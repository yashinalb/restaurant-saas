import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePosSessionStore } from '../../store/posSessionStore';

/**
 * Placeholder home for the POS terminal. When later sub-tasks (44.2+) are built
 * — floor plan, order taking, cart, payment — they replace this landing.
 */
export default function PosHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session } = usePosSessionStore();

  useEffect(() => {
    if (!session) navigate('/pos/login', { replace: true });
  }, [session?.id]);

  if (!session) return null;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('pos.welcomeName', 'Welcome, {{name}}', { name: session.waiter_name })}
        </h1>
        <p className="text-gray-500 mb-6">{t('pos.homeSubtitle', 'You are signed in at {{store}}.', { store: session.store_name })}</p>
        <div className="p-4 bg-amber-50 text-amber-900 rounded text-sm">
          {t('pos.comingSoon', 'Floor plan, order taking, and payment flows will be wired up in the next POS sub-tasks.')}
        </div>
      </div>
    </div>
  );
}
