import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Trash2, X, Loader2, ChefHat, CheckCircle2, Flame, Ban, RefreshCw } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import kdsOrderService, { KdsOrder, KdsStatus } from '../services/frontend-kdsOrderService';
import tenantOrderDestinationService, { TenantOrderDestination } from '../services/tenantOrderDestinationService';
import orderService, { Order } from '../services/orderService';
import { storeService } from '../services/storeService';
import type { Store } from '../services/storeService';

export default function KdsOrdersPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();
  const canCreate = hasPermission('kds_orders.create');
  const canEdit = hasPermission('kds_orders.edit');
  const canDelete = hasPermission('kds_orders.delete');

  const getTranslatedName = (translations: Array<{ language_code?: string; name: string }> | undefined, fallback = '-') => {
    if (!translations || translations.length === 0) return fallback;
    return translations.find(tr => tr.language_code === i18n.language)?.name
      || translations.find(tr => tr.language_code === 'en')?.name
      || translations[0].name
      || fallback;
  };

  const [items, setItems] = useState<KdsOrder[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [destinations, setDestinations] = useState<TenantOrderDestination[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [filterStore, setFilterStore] = useState('');
  const [filterDestination, setFilterDestination] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [showCompleted, setShowCompleted] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [formStoreId, setFormStoreId] = useState(0);
  const [formOrderId, setFormOrderId] = useState(0);
  const [formOrderItemId, setFormOrderItemId] = useState(0);
  const [formDestinationId, setFormDestinationId] = useState(0);
  const [formPriority, setFormPriority] = useState(0);
  const [formEstimatedPrepTime, setFormEstimatedPrepTime] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [selectedOrderItems, setSelectedOrderItems] = useState<Array<{ id: number; name?: string; quantity?: number }>>([]);

  if (!selectedTenant) {
    return <div className="p-6 text-center text-gray-500">{t('common.selectTenantFirst', 'Please select a tenant first')}</div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const filters: Record<string, any> = {};
      if (filterStore) filters.store_id = filterStore;
      if (filterDestination) filters.tenant_order_destination_id = filterDestination;
      if (!showCompleted) filters.active_only = true;

      const [kdsData, storeData, destData, orderData] = await Promise.all([
        kdsOrderService.getAll(filters),
        storeService.getAll().catch(() => []),
        tenantOrderDestinationService.getAll().catch(() => []),
        orderService.getAll({ limit: 100 }).catch(() => []),
      ]);
      setItems(kdsData);
      setStores(storeData);
      setDestinations(destData);
      setOrders(orderData);
    } catch {
      toast.error(t('kdsOrders.fetchError', 'Failed to load KDS orders'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedTenant?.id, filterStore, filterDestination, showCompleted]);

  const grouped = useMemo(() => {
    const result: Record<KdsStatus, KdsOrder[]> = {
      pending: [], preparing: [], ready: [], served: [], cancelled: [],
    };
    for (const item of items) result[item.status]?.push(item);
    return result;
  }, [items]);

  const handleStatusChange = async (item: KdsOrder, next: KdsStatus) => {
    try {
      await kdsOrderService.updateStatus(item.id, next);
      toast.success(t('kdsOrders.statusUpdated', 'Status updated'));
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('kdsOrders.statusError', 'Failed to update status'));
    }
  };

  const handleTogglePriority = async (item: KdsOrder) => {
    try {
      await kdsOrderService.update(item.id, { priority: item.priority ? 0 : 1 });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('kdsOrders.saveError', 'Failed to update'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('kdsOrders.confirmDelete', 'Remove this ticket?'))) return;
    try {
      await kdsOrderService.delete(id);
      toast.success(t('kdsOrders.deleted', 'Ticket removed'));
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('kdsOrders.deleteError', 'Failed to delete'));
    }
  };

  const handleOrderChange = async (orderId: number) => {
    setFormOrderId(orderId);
    setFormOrderItemId(0);
    if (!orderId) { setSelectedOrderItems([]); return; }
    try {
      const full = await orderService.getById(orderId);
      const fullAny = full as any;
      const items = (fullAny.items || fullAny.order_items || []).map((it: any) => ({
        id: it.id,
        name: it.menu_item_name || it.tenant_menu_item_name || `Item #${it.id}`,
        quantity: it.quantity,
      }));
      setSelectedOrderItems(items);
      if (items.length > 0) setFormOrderItemId(items[0].id);
      // Auto-set store from order
      if (fullAny.store_id) setFormStoreId(fullAny.store_id);
    } catch {
      setSelectedOrderItems([]);
    }
  };

  const handleCreate = () => {
    setFormStoreId(stores[0]?.id ?? 0);
    setFormOrderId(0);
    setFormOrderItemId(0);
    setFormDestinationId(destinations[0]?.id ?? 0);
    setFormPriority(0);
    setFormEstimatedPrepTime('');
    setFormNotes('');
    setSelectedOrderItems([]);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formStoreId) { toast.error(t('kdsOrders.storeRequired', 'Store is required')); return; }
    if (!formOrderId) { toast.error(t('kdsOrders.orderRequired', 'Order is required')); return; }
    if (!formOrderItemId) { toast.error(t('kdsOrders.orderItemRequired', 'Order item is required')); return; }
    if (!formDestinationId) { toast.error(t('kdsOrders.destinationRequired', 'Destination is required')); return; }
    try {
      setSaving(true);
      await kdsOrderService.create({
        store_id: formStoreId,
        order_id: formOrderId,
        order_item_id: formOrderItemId,
        tenant_order_destination_id: formDestinationId,
        priority: formPriority,
        estimated_prep_time: formEstimatedPrepTime ? parseInt(formEstimatedPrepTime) : null,
        notes: formNotes.trim() || null,
      });
      toast.success(t('kdsOrders.created', 'Ticket created'));
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('kdsOrders.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const elapsedSince = (dateStr: string | null) => {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return t('kdsOrders.justNow', 'just now');
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const statusColumnHeader = (status: KdsStatus, label: string, icon: any, color: string) => {
    const Icon = icon;
    const count = grouped[status].length;
    return (
      <div className={`flex items-center justify-between p-3 rounded-t-lg ${color}`}>
        <div className="flex items-center gap-2"><Icon className="w-4 h-4" /><span className="font-semibold text-sm">{label}</span></div>
        <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-medium">{count}</span>
      </div>
    );
  };

  const renderCard = (item: KdsOrder) => (
    <div key={item.id} className={`bg-white rounded-lg shadow p-3 space-y-2 border-l-4 ${item.priority ? 'border-red-500' : 'border-transparent'}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-sm">{item.order_number || `#${item.order_id}`}</div>
          <div className="text-xs text-gray-500">{item.store_name}</div>
        </div>
        <div className="flex items-center gap-1">
          {canEdit && (
            <button onClick={() => handleTogglePriority(item)}
              title={item.priority ? t('kdsOrders.unmarkRush', 'Unmark rush') : t('kdsOrders.markRush', 'Mark as rush')}
              className={item.priority ? 'text-red-500' : 'text-gray-300 hover:text-red-500'}>
              <Flame className={`w-4 h-4 ${item.priority ? 'fill-current' : ''}`} />
            </button>
          )}
          {canDelete && (
            <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
          )}
        </div>
      </div>
      <div className="text-sm text-gray-800">
        <span className="font-medium">{item.item_quantity || 1}x</span> {item.menu_item_name || `Item #${item.order_item_id}`}
      </div>
      {item.item_notes && <div className="text-xs text-gray-500 italic">{item.item_notes}</div>}
      {item.notes && <div className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">{item.notes}</div>}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{elapsedSince(item.created_at)}</span>
        {item.estimated_prep_time && <span>{item.estimated_prep_time}m est.</span>}
      </div>
      {canEdit && (
        <div className="flex gap-1 pt-2 border-t">
          {item.status === 'pending' && (
            <button onClick={() => handleStatusChange(item, 'preparing')} className="flex-1 text-xs bg-blue-600 text-white rounded py-1 hover:bg-blue-700">
              {t('kdsOrders.actionStart', 'Start')}
            </button>
          )}
          {item.status === 'preparing' && (
            <button onClick={() => handleStatusChange(item, 'ready')} className="flex-1 text-xs bg-green-600 text-white rounded py-1 hover:bg-green-700">
              {t('kdsOrders.actionReady', 'Mark Ready')}
            </button>
          )}
          {item.status === 'ready' && (
            <button onClick={() => handleStatusChange(item, 'served')} className="flex-1 text-xs bg-gray-600 text-white rounded py-1 hover:bg-gray-700">
              {t('kdsOrders.actionServed', 'Served')}
            </button>
          )}
          {(item.status === 'pending' || item.status === 'preparing') && (
            <button onClick={() => handleStatusChange(item, 'cancelled')} className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">
              <Ban className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('kdsOrders.title', 'Kitchen Display')}</h1>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} title={t('common.refresh', 'Refresh')}
            className="p-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button onClick={() => setViewMode('board')} className={`px-3 py-2 text-sm ${viewMode === 'board' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}>
              {t('kdsOrders.viewBoard', 'Board')}
            </button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}>
              {t('kdsOrders.viewList', 'List')}
            </button>
          </div>
          {canCreate && (
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> {t('kdsOrders.add', 'Add Ticket')}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <select value={filterStore} onChange={e => setFilterStore(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">{t('kdsOrders.allStores', 'All Stores')}</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterDestination} onChange={e => setFilterDestination(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">{t('kdsOrders.allDestinations', 'All Destinations')}</option>
          {destinations.map(d => <option key={d.id} value={d.id}>{getTranslatedName(d.translations, d.code)}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} className="rounded" />
          <span>{t('kdsOrders.showCompleted', 'Show completed & cancelled')}</span>
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : viewMode === 'board' ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-gray-50 min-h-[400px]">
            {statusColumnHeader('pending', t('kdsOrders.statusPending', 'Pending'), ChefHat, 'bg-amber-500 text-white')}
            <div className="p-3 space-y-2">
              {grouped.pending.map(renderCard)}
              {grouped.pending.length === 0 && <div className="text-center text-gray-400 text-sm py-6">{t('kdsOrders.empty', 'No tickets')}</div>}
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 min-h-[400px]">
            {statusColumnHeader('preparing', t('kdsOrders.statusPreparing', 'Preparing'), ChefHat, 'bg-blue-500 text-white')}
            <div className="p-3 space-y-2">
              {grouped.preparing.map(renderCard)}
              {grouped.preparing.length === 0 && <div className="text-center text-gray-400 text-sm py-6">{t('kdsOrders.empty', 'No tickets')}</div>}
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 min-h-[400px]">
            {statusColumnHeader('ready', t('kdsOrders.statusReady', 'Ready'), CheckCircle2, 'bg-green-500 text-white')}
            <div className="p-3 space-y-2">
              {grouped.ready.map(renderCard)}
              {grouped.ready.length === 0 && <div className="text-center text-gray-400 text-sm py-6">{t('kdsOrders.empty', 'No tickets')}</div>}
            </div>
          </div>
          {showCompleted && (
            <>
              <div className="rounded-lg bg-gray-50 min-h-[200px] col-span-3 mt-4">
                {statusColumnHeader('served', t('kdsOrders.statusServed', 'Served'), CheckCircle2, 'bg-gray-500 text-white')}
                <div className="p-3 grid grid-cols-3 gap-2">
                  {grouped.served.map(renderCard)}
                  {grouped.served.length === 0 && <div className="col-span-3 text-center text-gray-400 text-sm py-6">{t('kdsOrders.empty', 'No tickets')}</div>}
                </div>
              </div>
              {grouped.cancelled.length > 0 && (
                <div className="rounded-lg bg-gray-50 min-h-[100px] col-span-3">
                  {statusColumnHeader('cancelled', t('kdsOrders.statusCancelled', 'Cancelled'), Ban, 'bg-red-500 text-white')}
                  <div className="p-3 grid grid-cols-3 gap-2">
                    {grouped.cancelled.map(renderCard)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('kdsOrders.order', 'Order')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('kdsOrders.item', 'Item')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('kdsOrders.store', 'Store')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('kdsOrders.status', 'Status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('kdsOrders.priority', 'Priority')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('kdsOrders.createdAt', 'Created')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.order_number || `#${item.order_id}`}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.item_quantity || 1}x {item.menu_item_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.store_name}</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 text-xs rounded-full bg-gray-100">{item.status}</span></td>
                  <td className="px-6 py-4 text-sm">{item.priority ? <span className="text-red-600 font-semibold">Rush</span> : '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{elapsedSince(item.created_at)}</td>
                  <td className="px-6 py-4 text-right">
                    {canDelete && <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">{t('kdsOrders.empty', 'No tickets')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{t('kdsOrders.add', 'Add Ticket')}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('kdsOrders.order', 'Order')} *</label>
                <select value={formOrderId} onChange={e => handleOrderChange(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value={0}>{t('kdsOrders.selectOrder', 'Select an order')}</option>
                  {orders.map(o => <option key={o.id} value={o.id}>{o.order_number || `Order #${o.id}`}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('kdsOrders.item', 'Order Item')} *</label>
                <select value={formOrderItemId} onChange={e => setFormOrderItemId(Number(e.target.value))}
                  disabled={selectedOrderItems.length === 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                  <option value={0}>{t('kdsOrders.selectItem', 'Select an item')}</option>
                  {selectedOrderItems.map(it => <option key={it.id} value={it.id}>{it.quantity || 1}x {it.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('kdsOrders.store', 'Store')} *</label>
                  <select value={formStoreId} onChange={e => setFormStoreId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value={0}>{t('kdsOrders.selectStore', 'Select a store')}</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('kdsOrders.destination', 'Destination')} *</label>
                  <select value={formDestinationId} onChange={e => setFormDestinationId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value={0}>{t('kdsOrders.selectDestination', 'Select destination')}</option>
                    {destinations.map(d => <option key={d.id} value={d.id}>{getTranslatedName(d.translations, d.code)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('kdsOrders.estimatedPrepTime', 'Est. Prep Time (min)')}</label>
                  <input type="number" value={formEstimatedPrepTime} onChange={e => setFormEstimatedPrepTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!formPriority} onChange={e => setFormPriority(e.target.checked ? 1 : 0)} className="rounded" />
                    <span className="text-sm text-gray-700">{t('kdsOrders.rush', 'Rush order')}</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('kdsOrders.notes', 'Notes')}</label>
                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">{t('common.cancel', 'Cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
