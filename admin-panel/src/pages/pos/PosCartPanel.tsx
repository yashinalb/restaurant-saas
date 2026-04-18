import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Minus, Plus, Trash2, Gift, Percent, Printer, Split, RotateCcw, Ban, MoveRight, FilePlus } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import orderService, { Order, OrderItem, OrderItemInput } from '../../services/orderService';
import PosMoveItemsModal from './PosMoveItemsModal';

interface Props {
  order: Order;
  onChanged: () => void;
  onNewOrder: () => void;
}

const num = (v: any) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
};

function orderItemsToInput(items: OrderItem[]): OrderItemInput[] {
  return items.map(it => ({
    tenant_menu_item_id: it.tenant_menu_item_id,
    tenant_order_item_status_id: it.tenant_order_item_status_id,
    quantity: it.quantity,
    unit_price: num(it.unit_price),
    weighted_portion: it.weighted_portion != null ? num(it.weighted_portion) : null,
    selected_addons: it.selected_addons ?? null,
    selected_ingredients: it.selected_ingredients ?? null,
    notes: it.notes ?? null,
  }));
}

export default function PosCartPanel({ order, onChanged, onNewOrder }: Props) {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const canDiscount = hasPermission('pos.discount');
  const canIkram = hasPermission('pos.ikram');
  const canRefund = hasPermission('pos.refund');
  const canSplit = hasPermission('pos.split_bill');
  const canVoid = hasPermission('pos.void');
  const canTakeOrder = hasPermission('pos.take_order');

  const [saving, setSaving] = useState(false);
  const [moveModalItems, setMoveModalItems] = useState<OrderItem[] | null>(null);
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountValue, setDiscountValue] = useState('');
  const [discountMode, setDiscountMode] = useState<'amount' | 'percent'>('amount');

  const items = order.items || [];
  const currencySymbol = order.currency_symbol || '';

  const subtotal = useMemo(() =>
    items.reduce((s, it) => s + num(it.total_price), 0), [items]);
  const taxAmount = num(order.tax_amount);
  const serviceCharge = num(order.service_charge);
  const discountAmount = num(order.discount_amount);
  const total = num(order.total);

  const saveItems = async (nextItems: OrderItemInput[]) => {
    try {
      setSaving(true);
      await orderService.update(order.id, { items: nextItems });
      onChanged();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('pos.cart.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const handleQtyChange = async (index: number, delta: number) => {
    if (!canTakeOrder) return;
    const next = orderItemsToInput(items);
    const newQty = (next[index].quantity || 1) + delta;
    if (newQty <= 0) {
      next.splice(index, 1);
    } else {
      next[index].quantity = newQty;
    }
    await saveItems(next);
  };

  const handleDeleteLine = async (index: number) => {
    if (!canTakeOrder) return;
    if (!confirm(t('pos.cart.confirmDeleteLine', 'Remove this item?'))) return;
    const next = orderItemsToInput(items);
    next.splice(index, 1);
    await saveItems(next);
  };

  const handleIkram = async (index: number) => {
    if (!canIkram) {
      toast.error(t('pos.cart.noIkramPermission', 'You do not have permission to comp items'));
      return;
    }
    const item = items[index];
    const isCompled = num(item.unit_price) === 0;
    const confirmMsg = isCompled
      ? t('pos.cart.confirmRevertIkram', 'Remove ikram (comp) from this item?')
      : t('pos.cart.confirmIkram', 'Mark this item as ikram (on the house)?');
    if (!confirm(confirmMsg)) return;
    const next = orderItemsToInput(items);
    if (isCompled) {
      // Can't know original price — prompt user
      const newPrice = prompt(t('pos.cart.promptOriginalPrice', 'Enter the original unit price:'));
      if (!newPrice) return;
      next[index].unit_price = num(newPrice);
    } else {
      next[index].unit_price = 0;
    }
    await saveItems(next);
  };

  const handleApplyDiscount = async () => {
    if (!canDiscount) return;
    const v = num(discountValue);
    if (v < 0) { toast.error(t('pos.cart.discountInvalid', 'Invalid discount')); return; }
    const amount = discountMode === 'percent'
      ? Math.round(subtotal * v) / 100
      : v;
    try {
      setSaving(true);
      await orderService.update(order.id, { discount_amount: amount });
      toast.success(t('pos.cart.discountApplied', 'Discount applied'));
      setShowDiscount(false);
      setDiscountValue('');
      onChanged();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('pos.cart.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const handleClearDiscount = async () => {
    if (!canDiscount) return;
    try {
      setSaving(true);
      await orderService.update(order.id, { discount_amount: 0 });
      toast.success(t('pos.cart.discountCleared', 'Discount cleared'));
      onChanged();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('pos.cart.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const handleVoidOrder = async () => {
    if (!canVoid) {
      toast.error(t('pos.cart.noVoidPermission', 'You do not have permission to void orders'));
      return;
    }
    if (!confirm(t('pos.cart.confirmVoid', 'Cancel this entire order?'))) return;
    try {
      setSaving(true);
      await orderService.update(order.id, { order_status: 'cancelled' });
      toast.success(t('pos.cart.voided', 'Order cancelled'));
      onChanged();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('pos.cart.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const notImplemented = (label: string) => () =>
    toast.message(t('pos.cart.notImplemented', '{{action}} will be wired up in a later step', { action: label }));

  const isLocked = order.order_status !== 'open';

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-slate-50">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-gray-900">{order.order_number}</div>
            <div className="text-xs text-gray-500">
              {order.table_name ? `${t('pos.cart.table', 'Table')}: ${order.table_name}` : t('pos.cart.walkIn', 'Walk-in')}
              {order.waiter_name && ` · ${order.waiter_name}`}
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            order.order_status === 'open' ? 'bg-green-100 text-green-800' :
            order.order_status === 'closed' ? 'bg-blue-100 text-blue-800' :
            order.order_status === 'cancelled' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {t(`pos.cart.status.${order.order_status}`, order.order_status)}
          </span>
        </div>
      </div>

      {/* Line items */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {t('pos.cart.empty', 'Tap items from the menu to add them')}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item, idx) => {
              const unitPrice = num(item.unit_price);
              const lineTotal = num(item.total_price);
              const isComp = unitPrice === 0;
              const addons = Array.isArray(item.selected_addons) ? item.selected_addons : [];
              const removed = Array.isArray(item.selected_ingredients)
                ? item.selected_ingredients.filter((i: any) => i?.removed)
                : [];
              return (
                <div key={item.id} className={`p-3 ${isComp ? 'bg-pink-50' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900 truncate">
                          {item.menu_item_name || `Item #${item.tenant_menu_item_id}`}
                        </span>
                        {isComp && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-600 text-white font-semibold">
                            {t('pos.cart.ikram', 'İkram')}
                          </span>
                        )}
                      </div>
                      {addons.length > 0 && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          + {addons.map((a: any) => a?.name || a?.code || '').filter(Boolean).join(', ')}
                        </div>
                      )}
                      {removed.length > 0 && (
                        <div className="text-xs text-gray-500 mt-0.5 line-through">
                          − {removed.map((i: any) => i?.name || i?.code || '').filter(Boolean).join(', ')}
                        </div>
                      )}
                      {item.notes && (
                        <div className="text-xs italic text-amber-700 mt-0.5">{item.notes}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{currencySymbol}{lineTotal.toFixed(2)}</div>
                      <div className="text-[10px] text-gray-400">{item.quantity} × {currencySymbol}{unitPrice.toFixed(2)}</div>
                    </div>
                  </div>

                  {!isLocked && canTakeOrder && (
                    <div className="flex items-center gap-1 mt-2">
                      <button onClick={() => handleQtyChange(idx, -1)} disabled={saving}
                        className="w-7 h-7 rounded border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="min-w-[2rem] text-center text-sm font-semibold">{item.quantity}</span>
                      <button onClick={() => handleQtyChange(idx, 1)} disabled={saving}
                        className="w-7 h-7 rounded border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center">
                        <Plus className="w-3 h-3" />
                      </button>
                      <div className="flex-1" />
                      {canIkram && (
                        <button onClick={() => handleIkram(idx)} disabled={saving}
                          title={t('pos.cart.ikram', 'İkram')}
                          className={`w-7 h-7 rounded flex items-center justify-center ${isComp ? 'bg-pink-600 text-white' : 'text-pink-600 hover:bg-pink-50'}`}>
                          <Gift className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => setMoveModalItems([item])}
                        title={t('pos.cart.move', 'Taşı (Move)')}
                        className="w-7 h-7 rounded text-blue-600 hover:bg-blue-50 flex items-center justify-center">
                        <MoveRight className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteLine(idx)} disabled={saving}
                        title={t('pos.cart.remove', 'Remove')}
                        className="w-7 h-7 rounded text-red-600 hover:bg-red-50 flex items-center justify-center">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="border-t bg-slate-50 px-4 py-3 text-sm space-y-1">
        <div className="flex justify-between text-gray-600">
          <span>{t('pos.cart.subtotal', 'Subtotal')}</span>
          <span>{currencySymbol}{subtotal.toFixed(2)}</span>
        </div>
        {taxAmount > 0 && (
          <div className="flex justify-between text-gray-600">
            <span>{t('pos.cart.tax', 'Tax')}</span>
            <span>{currencySymbol}{taxAmount.toFixed(2)}</span>
          </div>
        )}
        {serviceCharge > 0 && (
          <div className="flex justify-between text-gray-600">
            <span>{t('pos.cart.serviceCharge', 'Service')}</span>
            <span>{currencySymbol}{serviceCharge.toFixed(2)}</span>
          </div>
        )}
        {discountAmount > 0 && (
          <div className="flex justify-between text-red-600">
            <span className="flex items-center gap-1">
              {t('pos.cart.discount', 'Discount')}
              <button onClick={handleClearDiscount} disabled={saving || !canDiscount}
                className="text-red-400 hover:text-red-700"><Trash2 className="w-3 h-3" /></button>
            </span>
            <span>−{currencySymbol}{discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t">
          <span>{t('pos.cart.total', 'Total')}</span>
          <span>{currencySymbol}{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="border-t bg-white p-2 grid grid-cols-4 gap-1.5">
        <button onClick={onNewOrder}
          className="flex flex-col items-center justify-center gap-0.5 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold">
          <FilePlus className="w-4 h-4" />
          {t('pos.cart.new', 'Yeni')}
        </button>
        <button onClick={() => setShowDiscount(true)} disabled={isLocked || !canDiscount}
          className="flex flex-col items-center justify-center gap-0.5 py-2 rounded bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold disabled:opacity-40">
          <Percent className="w-4 h-4" />
          {t('pos.cart.iskonto', 'İskonto')}
        </button>
        <button onClick={notImplemented(t('pos.cart.split', 'Böl'))} disabled={isLocked || !canSplit}
          className="flex flex-col items-center justify-center gap-0.5 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold disabled:opacity-40">
          <Split className="w-4 h-4" />
          {t('pos.cart.bol', 'Böl')}
        </button>
        <button onClick={notImplemented(t('pos.cart.refund', 'İade'))} disabled={!canRefund}
          className="flex flex-col items-center justify-center gap-0.5 py-2 rounded bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-semibold disabled:opacity-40">
          <RotateCcw className="w-4 h-4" />
          {t('pos.cart.iade', 'İade')}
        </button>
        <button onClick={notImplemented(t('pos.cart.print', 'Yazdır'))}
          className="flex flex-col items-center justify-center gap-0.5 py-2 rounded bg-slate-600 hover:bg-slate-700 text-white text-[11px] font-semibold">
          <Printer className="w-4 h-4" />
          {t('pos.cart.yazdir', 'Yazdır')}
        </button>
        <button onClick={handleVoidOrder} disabled={isLocked || !canVoid}
          className="flex flex-col items-center justify-center gap-0.5 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold disabled:opacity-40">
          <Ban className="w-4 h-4" />
          {t('pos.cart.iptal', 'İptal')}
        </button>
      </div>

      {/* Discount modal */}
      {showDiscount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{t('pos.cart.applyDiscount', 'Apply Discount')}</h3>
              <button onClick={() => setShowDiscount(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <button onClick={() => setDiscountMode('amount')}
                  className={`flex-1 py-2 rounded ${discountMode === 'amount' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  {currencySymbol} {t('pos.cart.amount', 'Amount')}
                </button>
                <button onClick={() => setDiscountMode('percent')}
                  className={`flex-1 py-2 rounded ${discountMode === 'percent' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  % {t('pos.cart.percent', 'Percent')}
                </button>
              </div>
              <input type="number" step="0.01" value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                placeholder={discountMode === 'percent' ? '10' : '5.00'} autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg text-center font-semibold focus:ring-2 focus:ring-amber-500" />
              {discountMode === 'percent' && discountValue && (
                <div className="text-sm text-gray-500 text-center">
                  ≈ {currencySymbol}{((num(discountValue) * subtotal) / 100).toFixed(2)}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowDiscount(false)}
                className="px-3 py-2 text-gray-700 border border-gray-300 rounded">{t('common.cancel', 'Cancel')}</button>
              <button onClick={handleApplyDiscount} disabled={saving || !discountValue}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('pos.cart.apply', 'Apply')}
              </button>
            </div>
          </div>
        </div>
      )}

      {moveModalItems && (
        <PosMoveItemsModal
          sourceOrderId={order.id}
          storeId={order.store_id}
          currencySymbol={currencySymbol}
          items={moveModalItems}
          onClose={() => setMoveModalItems(null)}
          onMoved={onChanged}
        />
      )}
    </div>
  );
}
