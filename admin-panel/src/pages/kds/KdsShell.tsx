import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Wifi, WifiOff, LogOut } from 'lucide-react';
import { kdsRuntime, KdsDeviceContext } from '../../services/frontend-kdsDeviceService';
import { realtimeClient } from '../../services/realtimeClient';

/**
 * KDS Shell (45.1).
 * - If no device_token stored → show the pairing form.
 * - Else → validate via /kds/me, show the status bar + placeholder display area.
 */
export default function KdsShell() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<KdsDeviceContext | null>(null);

  // Pairing form state
  const [code, setCode] = useState('');
  const [pairing, setPairing] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);

  // Network indicator state
  const [online, setOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [wsConnected, setWsConnected] = useState(false);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    const token = kdsRuntime.getToken();
    if (!token) { setContext(null); setLoading(false); return; }
    try {
      const ctx = await kdsRuntime.me(token);
      setContext(ctx);
    } catch {
      kdsRuntime.clearToken();
      setContext(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  // Online/offline events for the status bar
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Realtime connection is reserved for 45.2+; for now we just open it so
  // the status bar has a truthful indicator that the device can reach the server.
  useEffect(() => {
    if (!context) return;
    const token = kdsRuntime.getToken();
    if (!token) return;

    realtimeClient.connectAsKdsDevice(token);
    const off = realtimeClient.on((ev) => {
      if (ev.event === 'connected') setWsConnected(true);
    });
    const pollInterval = setInterval(() => {
      setWsConnected(realtimeClient.isConnected());
    }, 2000);
    return () => {
      off();
      clearInterval(pollInterval);
      realtimeClient.disconnect();
    };
  }, [context]);

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    setPairError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setPairError(t('kds.pair.invalidFormat', 'Pairing code must be 6 digits'));
      return;
    }
    try {
      setPairing(true);
      const { device_token, context: ctx } = await kdsRuntime.pair(code.trim());
      kdsRuntime.setToken(device_token);
      setContext(ctx);
    } catch (error: any) {
      setPairError(error.response?.data?.error || t('kds.pair.error', 'Pairing failed'));
    } finally {
      setPairing(false);
    }
  };

  const handleUnpair = async () => {
    if (!confirm(t('kds.unpair.confirm', 'Un-pair this device? You will need a new code to pair again.'))) return;
    const token = kdsRuntime.getToken();
    try {
      if (token) await kdsRuntime.unpair(token);
    } catch {
      // Even if server call fails, clear local token so the device returns to pairing.
    }
    kdsRuntime.clearToken();
    realtimeClient.disconnect();
    setContext(null);
    toast.success(t('kds.unpair.done', 'Device un-paired'));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!context) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <form onSubmit={handlePair} className="bg-slate-800 text-white rounded-xl shadow-2xl p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-2">{t('kds.pair.title', 'Pair this display')}</h1>
          <p className="text-sm text-slate-300 mb-6">
            {t('kds.pair.help', 'Enter the 6-digit pairing code generated from the admin panel.')}
          </p>
          <input
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoFocus
            maxLength={6}
            placeholder="000000"
            className="w-full bg-slate-900 border-2 border-slate-600 focus:border-amber-500 rounded-lg py-4 px-4 text-center text-4xl font-mono tracking-[0.5em] mb-3 outline-none"
          />
          {pairError && <p className="text-red-400 text-sm mb-3">{pairError}</p>}
          <button
            type="submit"
            disabled={pairing || code.length !== 6}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2">
            {pairing && <Loader2 className="w-5 h-5 animate-spin" />}
            {t('kds.pair.submit', 'Pair device')}
          </button>
        </form>
      </div>
    );
  }

  const connected = online && wsConnected;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Status bar */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-xl font-bold">
            {context.destination_name || context.destination_code || t('kds.unknownDestination', 'Destination')}
          </div>
          <div className="text-xs text-slate-400">
            {context.store_name}{context.name ? ` · ${context.name}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded
            ${connected ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
            {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {connected
              ? t('kds.network.online', 'Online')
              : online ? t('kds.network.reconnecting', 'Reconnecting…') : t('kds.network.offline', 'Offline')}
          </div>
          <button onClick={handleUnpair}
            className="flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded">
            <LogOut className="w-4 h-4" /> {t('kds.unpair.button', 'Un-pair')}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center text-slate-500 text-sm">
        {t('kds.shell.waitingForTickets', 'Waiting for kitchen tickets…')}
      </main>
    </div>
  );
}
