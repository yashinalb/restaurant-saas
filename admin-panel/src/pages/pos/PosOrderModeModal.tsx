import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Utensils, ShoppingBag, Bike, MonitorSmartphone, Loader2 } from 'lucide-react';
import type { PosOrderMode } from '../../services/frontend-posOrderService';

interface Props {
  onCancel: () => void;
  onConfirm: (payload: {
    order_type_code: PosOrderMode;
    guest_name: string | null;
    guest_phone: string | null;
    delivery_address: string | null;
    notes: string | null;
  }) => void;
  saving?: boolean;
}

const MODES: Array<{
  code: PosOrderMode;
  label: string;
  hint: string;
  icon: any;
  accent: string;
}> = [
  { code: 'takeaway', label: 'Takeaway', hint: 'Guest walks in or calls for pickup', icon: ShoppingBag, accent: 'border-amber-500 bg-amber-50' },
  { code: 'delivery', label: 'Delivery', hint: 'Driver delivers to a customer address', icon: Bike, accent: 'border-blue-500 bg-blue-50' },
  { code: 'dine_in', label: 'Dine-in', hint: 'Tap a table on the floor plan instead', icon: Utensils, accent: 'border-emerald-500 bg-emerald-50' },
  { code: 'kiosk', label: 'Kiosk', hint: 'Self-service terminal order', icon: MonitorSmartphone, accent: 'border-purple-500 bg-purple-50' },
];

export default function PosOrderModeModal({ onCancel, onConfirm, saving }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<PosOrderMode>('takeaway');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const requiresAddress = mode === 'delivery';
  const requiresGuest = mode === 'delivery';

  const handleConfirm = () => {
    if (mode === 'dine_in') {
      setError(t('pos.mode.pickTable', 'Dine-in orders start by tapping a table on the floor plan.'));
      return;
    }
    if (requiresAddress && !address.trim()) {
      setError(t('pos.mode.addressRequired', 'Delivery address is required'));
      return;
    }
    if (requiresGuest && !guestName.trim() && !guestPhone.trim()) {
      setError(t('pos.mode.guestRequired', 'Enter guest name or phone for delivery'));
      return;
    }
    onConfirm({
      order_type_code: mode,
      guest_name: guestName.trim() || null,
      guest_phone: guestPhone.trim() || null,
      delivery_address: address.trim() || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50">
          <h2 className="text-lg font-bold text-gray-900">{t('pos.mode.title', 'New Order')}</h2>
          <button onClick={onCancel}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('pos.mode.pickMode', 'Pick a mode')}</label>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map(m => {
                const Icon = m.icon;
                const selected = mode === m.code;
                return (
                  <button key={m.code} onClick={() => { setMode(m.code); setError(''); }}
                    className={`p-3 text-left rounded-lg border-2 transition ${selected ? m.accent : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-gray-700" />
                      <span className="font-semibold text-sm">
                        {t(`pos.mode.${m.code}`, m.label)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{t(`pos.mode.hint.${m.code}`, m.hint)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {mode !== 'dine_in' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('pos.mode.guestName', 'Guest name')}{requiresGuest && ' *'}
                  </label>
                  <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('pos.mode.guestPhone', 'Phone')}
                  </label>
                  <input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
                </div>
              </div>

              {mode === 'delivery' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('pos.mode.address', 'Delivery address')} *
                  </label>
                  <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('pos.mode.notes', 'Notes')}</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder={t('pos.mode.notesPlaceholder', 'Special instructions, delivery window, etc.')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
              </div>
            </div>
          )}

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-slate-50">
          <button onClick={onCancel}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-100">
            {t('common.cancel', 'Cancel')}
          </button>
          <button onClick={handleConfirm} disabled={!!saving || mode === 'dine_in'}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('pos.mode.start', 'Start Order')}
          </button>
        </div>
      </div>
    </div>
  );
}
