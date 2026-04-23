import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, X, Clock, Users, Phone, CheckCircle2 } from 'lucide-react';
import posReservationService, { PosTodayReservation } from '../../services/frontend-posReservationService';

interface Props {
  storeId: number;
  sessionId: number;
  onClose: () => void;
  onCheckedIn: (orderId: number) => void;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-gray-200 text-gray-800',
  confirmed: 'bg-amber-200 text-amber-900',
  checked_in: 'bg-green-200 text-green-900',
};

export default function PosReservationsDrawer({ storeId, sessionId, onClose, onCheckedIn }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PosTodayReservation[]>([]);
  const [checkingInId, setCheckingInId] = useState<number | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await posReservationService.today(storeId);
      setItems(data);
    } catch {
      toast.error(t('pos.reservations.fetchError', 'Failed to load reservations'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const handleCheckIn = async (r: PosTodayReservation) => {
    if (r.status === 'checked_in') return;
    try {
      setCheckingInId(r.id);
      const result = await posReservationService.checkIn(r.id, sessionId);
      toast.success(t('pos.reservations.checkedIn', 'Reservation checked in'));
      onCheckedIn(result.order_id);
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('pos.reservations.checkInError', 'Failed to check in'));
    } finally {
      setCheckingInId(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <aside className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('pos.reservations.title', "Today's Reservations")}</h2>
            <p className="text-xs text-gray-500">
              {loading ? t('common.loading', 'Loading…') : t('pos.reservations.count', '{{count}} reservation', { count: items.length })}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-amber-600" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">
              {t('pos.reservations.empty', 'No reservations for today')}
            </div>
          ) : (
            items.map(r => {
              const name = r.customer_name_ref || r.customer_name || t('pos.reservations.guest', 'Guest');
              const phone = r.customer_phone_ref || r.customer_phone;
              const timeStr = new Date(r.reserved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const isCheckedIn = r.status === 'checked_in';
              return (
                <div key={r.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-semibold text-gray-900">{name}</div>
                      {phone && (
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {phone}
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${STATUS_STYLES[r.status] || 'bg-gray-100 text-gray-700'}`}>
                      {t(`pos.reservations.status.${r.status}`, r.status)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-700 mb-2">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {timeStr}</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {r.guest_count}</span>
                    {r.primary_table_name && (
                      <span className="bg-gray-100 rounded px-2 py-0.5">{r.primary_table_name}</span>
                    )}
                  </div>

                  {r.notes && (
                    <div className="text-xs text-gray-600 italic mb-2">"{r.notes}"</div>
                  )}

                  <button
                    onClick={() => handleCheckIn(r)}
                    disabled={isCheckedIn || checkingInId === r.id}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition
                      ${isCheckedIn
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60'}`}>
                    {checkingInId === r.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    {isCheckedIn
                      ? t('pos.reservations.alreadyCheckedIn', 'Checked in')
                      : t('pos.reservations.checkIn', 'Check in & open order')}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}
