import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, X, MoveRight, Users } from 'lucide-react';
import { OrderItem } from '../../services/orderService';
import posMoveItemsService, { PosActiveOrder } from '../../services/frontend-posMoveItemsService';

interface Props {
  sourceOrderId: number;
  storeId: number;
  currencySymbol?: string;
  items: OrderItem[];
  onClose: () => void;
  onMoved: () => void;
}

const num = (v: any) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
};

export default function PosMoveItemsModal({ sourceOrderId, storeId, currencySymbol, items, onClose, onMoved }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeOrders, setActiveOrders] = useState<PosActiveOrder[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set(items.map(i => i.id)));
  const [targetOrderId, setTargetOrderId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await posMoveItemsService.listActiveOrders({ store_id: storeId, exclude_order_id: sourceOrderId });
        setActiveOrders(data);
      } catch {
        toast.error(t('pos.move.fetchError', 'Failed to load active orders'));
      } finally {
        setLoading(false);
      }
    })();
  }, [sourceOrderId, storeId]);

  const toggleItem = (id: number) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleMove = async () => {
    if (!targetOrderId) { toast.error(t('pos.move.selectTarget', 'Select a target order')); return; }
    if (selectedItemIds.size === 0) { toast.error(t('pos.move.selectItems', 'Select at least one item')); return; }
    try {
      setSaving(true);
      const result = await posMoveItemsService.move(sourceOrderId, targetOrderId, Array.from(selectedItemIds));
      toast.success(t('pos.move.moved', 'Moved {{count}} item(s)', { count: result.moved_count }));
      onMoved();
      onClose();
      // Navigate to the target order so the waiter can see the moved items
      navigate(`/pos/orders/${targetOrderId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('pos.move.moveError', 'Failed to move items'));
    } finally {
      setSaving(false);
    }
  };

  const selectedSubtotal = items
    .filter(i => selectedItemIds.has(i.id))
    .reduce((s, i) => s + num(i.total_price), 0);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50">
          <div className="flex items-center gap-2">
            <MoveRight className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">{t('pos.move.title', 'Move Items to Another Order')}</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-2 divide-x">
          {/* LEFT: items from source order */}
          <div className="flex flex-col overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b">
              <h3 className="text-sm font-semibold text-gray-700 uppercase">{t('pos.move.itemsToMove', 'Items to move')}</h3>
              <p className="text-xs text-gray-500">{t('pos.move.itemsHelp', 'Tap items to include / exclude')}</p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y">
              {items.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  {t('pos.move.noItems', 'No items to move')}
                </div>
              ) : items.map(item => {
                const selected = selectedItemIds.has(item.id);
                return (
                  <button key={item.id} onClick={() => toggleItem(item.id)}
                    className={`w-full text-left p-3 transition ${selected ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                        selected ? 'bg-amber-500 border-amber-500' : 'border-gray-300'
                      }`}>
                        {selected && <span className="text-white text-xs">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900 truncate">
                          {(item as any).menu_item_name || `Item #${item.tenant_menu_item_id}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.quantity} × {currencySymbol ?? ''}{num(item.unit_price).toFixed(2)}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-700">
                        {currencySymbol ?? ''}{num(item.total_price).toFixed(2)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-4 py-3 bg-slate-50 border-t text-sm flex justify-between">
              <span className="text-gray-600">{selectedItemIds.size} {t('pos.move.selected', 'selected')}</span>
              <span className="font-semibold">{currencySymbol ?? ''}{selectedSubtotal.toFixed(2)}</span>
            </div>
          </div>

          {/* RIGHT: target orders list */}
          <div className="flex flex-col overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b">
              <h3 className="text-sm font-semibold text-gray-700 uppercase">{t('pos.move.targetOrder', 'Move to')}</h3>
              <p className="text-xs text-gray-500">{t('pos.move.targetHelp', 'Select an active order at another table')}</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-amber-600" /></div>
              ) : activeOrders.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  {t('pos.move.noTargets', 'No other active orders. Start a new order first.')}
                </div>
              ) : (
                <div className="divide-y">
                  {activeOrders.map(o => {
                    const selected = targetOrderId === o.id;
                    return (
                      <button key={o.id} onClick={() => setTargetOrderId(o.id)}
                        className={`w-full text-left p-3 transition ${
                          selected ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
                        }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900">{o.order_number}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {o.table_name || t('pos.move.walkIn', 'Walk-in')}
                              · {o.item_count} {t('pos.move.itemsSuffix', 'items')}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-gray-700">
                            {currencySymbol ?? ''}{num(o.total).toFixed(2)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-slate-50">
          <button onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100">
            {t('common.cancel', 'Cancel')}
          </button>
          <button onClick={handleMove} disabled={saving || !targetOrderId || selectedItemIds.size === 0}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>
              <MoveRight className="w-4 h-4" />
              {t('pos.move.confirm', 'Move')}
            </>}
          </button>
        </div>
      </div>
    </div>
  );
}
