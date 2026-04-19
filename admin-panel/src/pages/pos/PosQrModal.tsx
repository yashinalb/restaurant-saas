import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, X, QrCode, RefreshCw, Copy, Check } from 'lucide-react';
import posQrService, { QrGenerateResult } from '../../services/frontend-posQrService';

interface Props {
  orderId: number;
  onClose: () => void;
}

export default function PosQrModal({ orderId, onClose }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<QrGenerateResult | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async (ttl?: number) => {
    try {
      setLoading(true);
      const fresh = await posQrService.generate(orderId, ttl);
      setData(fresh);
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('pos.qr.error', 'Failed to generate QR code'));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [orderId]);

  const handleCopy = async () => {
    if (!data?.url) return;
    try {
      await navigator.clipboard.writeText(data.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t('pos.qr.copyFailed', 'Copy failed'));
    }
  };

  const qrSrc = data?.url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.url)}`
    : null;

  const expiresMinutes = data?.expires_at
    ? Math.max(0, Math.round((new Date(data.expires_at).getTime() - Date.now()) / 60000))
    : 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-gray-900">{t('pos.qr.title', 'Customer QR')}</h2>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => load()} title={t('pos.qr.refresh', 'Refresh')}
              className="p-1 text-gray-500 hover:text-gray-800 rounded hover:bg-gray-100">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
          </div>
        </div>

        {loading || !data || !qrSrc ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          </div>
        ) : (
          <div className="p-6 flex flex-col items-center gap-3">
            <p className="text-sm text-gray-500 text-center">
              {t('pos.qr.hint', 'Ask the guest to scan this code to view their bill.')}
            </p>
            <img src={qrSrc} alt="QR" className="w-64 h-64" />
            <div className="text-xs text-gray-600 break-all text-center bg-gray-50 rounded p-2 w-full">
              {data.url}
            </div>
            <div className="flex items-center justify-between w-full text-xs text-gray-500">
              <span>{t('pos.qr.expiresIn', 'Expires in {{n}} min', { n: expiresMinutes })}</span>
              <button onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100">
                {copied ? <><Check className="w-3 h-3 text-emerald-600" /> {t('pos.qr.copied', 'Copied')}</> : <><Copy className="w-3 h-3" /> {t('pos.qr.copy', 'Copy link')}</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
