import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Delete, Loader2, UtensilsCrossed } from 'lucide-react';
import { storeService } from '../../services/storeService';
import type { Store } from '../../services/storeService';
import { usePosSessionStore } from '../../store/posSessionStore';

export default function PosLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, login, loading } = usePosSessionStore();

  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<number>(0);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) {
      navigate('/pos/floor', { replace: true });
      return;
    }
    storeService.getAll({ is_active: true })
      .then((data) => {
        setStores(data);
        if (data.length === 1) setStoreId(data[0].id);
      })
      .catch(() => toast.error(t('pos.fetchStoresError', 'Failed to load stores')));
  }, [session?.id]);

  const pushDigit = (d: string) => {
    setError('');
    if (pin.length >= 6) return;
    setPin(pin + d);
  };

  const backspace = () => {
    setError('');
    setPin(pin.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (!storeId) { setError(t('pos.selectStoreFirst', 'Select a store first')); return; }
    if (pin.length < 4) { setError(t('pos.pinMinLength', 'PIN must be at least 4 digits')); return; }
    try {
      await login(pin, storeId);
      toast.success(t('pos.welcome', 'Welcome'));
      navigate('/pos/floor', { replace: true });
    } catch (err: any) {
      setPin('');
      setError(err.response?.data?.error || t('pos.loginFailed', 'Invalid PIN'));
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-3">
            <UtensilsCrossed className="w-7 h-7 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('pos.signInTitle', 'Waiter Sign In')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('pos.signInSubtitle', 'Enter your PIN to start a shift')}</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('pos.store', 'Store')}</label>
          <select value={storeId} onChange={(e) => { setStoreId(Number(e.target.value)); setError(''); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
            <option value={0}>{t('pos.selectStore', 'Select a store')}</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('pos.pin', 'PIN')}</label>
          <div className="flex gap-2 justify-center">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`w-10 h-12 rounded-lg border-2 flex items-center justify-center text-xl font-bold ${
                i < pin.length ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-300'
              }`}>
                {i < pin.length ? '•' : ''}
              </div>
            ))}
          </div>
        </div>

        {error && <div className="text-sm text-red-600 text-center mb-3">{error}</div>}

        <div className="grid grid-cols-3 gap-2 mb-3">
          {digits.map((d) => (
            <button key={d} onClick={() => pushDigit(d)}
              className="h-14 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-xl font-semibold text-gray-800 transition">
              {d}
            </button>
          ))}
          <button onClick={backspace}
            className="h-14 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center text-gray-700 transition">
            <Delete className="w-5 h-5" />
          </button>
          <button onClick={() => pushDigit('0')}
            className="h-14 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-xl font-semibold text-gray-800 transition">
            0
          </button>
          <button onClick={() => { setPin(''); setError(''); }}
            className="h-14 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-sm text-gray-700 transition">
            {t('common.clear', 'Clear')}
          </button>
        </div>

        <button onClick={handleSubmit} disabled={loading || !storeId || pin.length < 4}
          className="w-full h-12 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold flex items-center justify-center">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('pos.signIn', 'Sign In')}
        </button>
      </div>
    </div>
  );
}
