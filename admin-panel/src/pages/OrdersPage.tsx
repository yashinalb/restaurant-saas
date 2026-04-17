import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2, Eye } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import orderService, { Order, OrderInput, OrderItemInput, OrderStatus } from '../services/orderService';
import { storeService, Store } from '../services/storeService';
import tenantCustomerService, { TenantCustomer } from '../services/tenantCustomerService';
import tenantWaiterService, { TenantWaiter } from '../services/tenantWaiterService';
import tenantTableStructureService, { TenantTableStructure } from '../services/tenantTableStructureService';
import tenantMenuItemService, { TenantMenuItem } from '../services/tenantMenuItemService';
import tenantOrderSourceService, { TenantOrderSource } from '../services/tenantOrderSourceService';
import tenantOrderTypeService, { TenantOrderType } from '../services/tenantOrderTypeService';
import tenantOrderItemStatusService, { TenantOrderItemStatus } from '../services/tenantOrderItemStatusService';
import tenantPaymentStatusService, { TenantPaymentStatus } from '../services/tenantPaymentStatusService';

const ORDER_STATUSES: OrderStatus[] = ['open', 'closed', 'cancelled', 'void'];

const statusColor: Record<OrderStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  closed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  void: 'bg-red-100 text-red-800',
};

interface Currency { id: number; code: string; symbol: string; name: string }

const num = (v: any) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
};

export default function OrdersPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();

  const canCreate = hasPermission('orders.create');
  const canEdit = hasPermission('orders.edit');
  const canDelete = hasPermission('orders.void');

  const getTranslatedName = (translations: Array<{ language_code?: string; name: string }> | undefined, fallback = '-') => {
    if (!translations || translations.length === 0) return fallback;
    return translations.find(tr => tr.language_code === i18n.language)?.name
      || translations.find(tr => tr.language_code === 'en')?.name
      || translations[0].name
      || fallback;
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [customers, setCustomers] = useState<TenantCustomer[]>([]);
  const [waiters, setWaiters] = useState<TenantWaiter[]>([]);
  const [tables, setTables] = useState<TenantTableStructure[]>([]);
  const [menuItems, setMenuItems] = useState<TenantMenuItem[]>([]);
  const [sources, setSources] = useState<TenantOrderSource[]>([]);
  const [types, setTypes] = useState<TenantOrderType[]>([]);
  const [itemStatuses, setItemStatuses] = useState<TenantOrderItemStatus[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<TenantPaymentStatus[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  const [filterStoreId, setFilterStoreId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  const [formStoreId, setFormStoreId] = useState(0);
  const [formSourceId, setFormSourceId] = useState(0);
  const [formTypeId, setFormTypeId] = useState(0);
  const [formCurrencyId, setFormCurrencyId] = useState(0);
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formWaiterId, setFormWaiterId] = useState('');
  const [formTableId, setFormTableId] = useState('');
  const [formPaymentStatusId, setFormPaymentStatusId] = useState('');
  const [formOrderStatus, setFormOrderStatus] = useState<OrderStatus>('open');
  const [formTaxAmount, setFormTaxAmount] = useState(0);
  const [formServiceCharge, setFormServiceCharge] = useState(0);
  const [formDiscountAmount, setFormDiscountAmount] = useState(0);
  const [formGuestName, setFormGuestName] = useState('');
  const [formGuestPhone, setFormGuestPhone] = useState('');
  const [formDeliveryAddress, setFormDeliveryAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState<OrderItemInput[]>([]);

  if (!selectedTenant) {
    return <div className="p-6 text-center text-gray-500">{t('common.selectTenantFirst', 'Please select a tenant first')}</div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const filters: Record<string, any> = {};
      if (filterStoreId) filters.store_id = filterStoreId;
      if (filterStatus) filters.order_status = filterStatus;
      if (filterFromDate) filters.from_date = filterFromDate;
      if (filterToDate) filters.to_date = filterToDate;

      const [ordersData, storesData, customersData, waitersData, tablesData, menuData, sourcesData, typesData, iStatusData, pStatusData, currResp] = await Promise.all([
        orderService.getAll(filters),
        storeService.getAll().catch(() => []),
        tenantCustomerService.getAll().catch(() => []),
        tenantWaiterService.getAll().catch(() => []),
        tenantTableStructureService.getAll().catch(() => []),
        tenantMenuItemService.getAll().catch(() => []),
        tenantOrderSourceService.getAll().catch(() => []),
        tenantOrderTypeService.getAll().catch(() => []),
        tenantOrderItemStatusService.getAll().catch(() => []),
        tenantPaymentStatusService.getAll().catch(() => []),
        api.get('/api/tenant/currencies').catch(() => ({ data: { data: [] } })),
      ]);
      setOrders(ordersData);
      setStores(Array.isArray(storesData) ? storesData : []);
      setCustomers(Array.isArray(customersData) ? customersData : []);
      setWaiters(Array.isArray(waitersData) ? waitersData : []);
      setTables(Array.isArray(tablesData) ? tablesData : []);
      setMenuItems(Array.isArray(menuData) ? menuData : []);
      setSources(sourcesData);
      setTypes(typesData);
      setItemStatuses(iStatusData);
      setPaymentStatuses(pStatusData);
      setCurrencies((currResp as any).data?.data || []);
    } catch {
      toast.error(t('orders.fetchError', 'Failed to load orders'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedTenant?.id, filterStoreId, filterStatus, filterFromDate, filterToDate]);

  const tablesForStore = (storeId: number) => tables.filter(tb => tb.store_id === storeId);

  const defaultStatusId = () => itemStatuses[0]?.id ?? 0;

  const resetForm = () => {
    setFormStoreId(0); setFormSourceId(sources[0]?.id ?? 0); setFormTypeId(types[0]?.id ?? 0);
    setFormCurrencyId(currencies[0]?.id ?? 0);
    setFormCustomerId(''); setFormWaiterId(''); setFormTableId(''); setFormPaymentStatusId('');
    setFormOrderStatus('open');
    setFormTaxAmount(0); setFormServiceCharge(0); setFormDiscountAmount(0);
    setFormGuestName(''); setFormGuestPhone(''); setFormDeliveryAddress(''); setFormNotes('');
    setFormItems([]);
  };

  const handleCreate = () => {
    setEditingId(null);
    resetForm();
    setShowModal(true);
  };

  const handleEdit = async (id: number) => {
    try {
      const order = await orderService.getById(id);
      setEditingId(order.id);
      setFormStoreId(order.store_id);
      setFormSourceId(order.tenant_order_source_id);
      setFormTypeId(order.tenant_order_type_id);
      setFormCurrencyId(order.currency_id);
      setFormCustomerId(order.tenant_customer_id ? String(order.tenant_customer_id) : '');
      setFormWaiterId(order.tenant_waiter_id ? String(order.tenant_waiter_id) : '');
      setFormTableId(order.table_id ? String(order.table_id) : '');
      setFormPaymentStatusId(order.tenant_payment_status_id ? String(order.tenant_payment_status_id) : '');
      setFormOrderStatus(order.order_status);
      setFormTaxAmount(num(order.tax_amount));
      setFormServiceCharge(num(order.service_charge));
      setFormDiscountAmount(num(order.discount_amount));
      setFormGuestName(order.guest_name || '');
      setFormGuestPhone(order.guest_phone || '');
      setFormDeliveryAddress(order.delivery_address || '');
      setFormNotes(order.notes || '');
      setFormItems((order.items || []).map(it => ({
        tenant_menu_item_id: it.tenant_menu_item_id,
        tenant_order_item_status_id: it.tenant_order_item_status_id,
        quantity: it.quantity,
        unit_price: num(it.unit_price),
        weighted_portion: it.weighted_portion ? num(it.weighted_portion) : null,
        selected_addons: it.selected_addons,
        selected_ingredients: it.selected_ingredients,
        notes: it.notes,
      })));
      setShowModal(true);
    } catch {
      toast.error(t('orders.fetchError', 'Failed to load order'));
    }
  };

  const handleView = async (id: number) => {
    try {
      const order = await orderService.getById(id);
      setDetailOrder(order);
      setShowDetailModal(true);
    } catch {
      toast.error(t('orders.fetchError', 'Failed to load order'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('orders.confirmDelete', 'Delete this order?'))) return;
    try {
      await orderService.delete(id);
      toast.success(t('orders.deleted', 'Deleted'));
      fetchData();
    } catch {
      toast.error(t('orders.deleteError', 'Failed to delete'));
    }
  };

  const addLineItem = () => {
    const mi = menuItems[0];
    setFormItems(prev => [...prev, {
      tenant_menu_item_id: mi?.id ?? 0,
      tenant_order_item_status_id: defaultStatusId(),
      quantity: 1,
      unit_price: 0,
      weighted_portion: null,
      selected_addons: null,
      selected_ingredients: null,
      notes: null,
    }]);
  };

  const updateItem = (idx: number, patch: Partial<OrderItemInput>) => {
    setFormItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const removeItem = (idx: number) => {
    setFormItems(prev => prev.filter((_, i) => i !== idx));
  };

  const computedSubtotal = formItems.reduce((s, it) => s + num(it.quantity) * num(it.unit_price), 0);
  const computedTotal = computedSubtotal + num(formTaxAmount) + num(formServiceCharge) - num(formDiscountAmount);

  const handleSave = async () => {
    if (!formStoreId) { toast.error(t('orders.storeRequired', 'Store is required')); return; }
    if (!formSourceId) { toast.error(t('orders.sourceRequired', 'Order source is required')); return; }
    if (!formTypeId) { toast.error(t('orders.typeRequired', 'Order type is required')); return; }
    if (!formCurrencyId) { toast.error(t('orders.currencyRequired', 'Currency is required')); return; }

    try {
      setSaving(true);
      const payload: OrderInput = {
        store_id: formStoreId,
        tenant_order_source_id: formSourceId,
        tenant_order_type_id: formTypeId,
        currency_id: formCurrencyId,
        tenant_customer_id: formCustomerId ? Number(formCustomerId) : null,
        tenant_waiter_id: formWaiterId ? Number(formWaiterId) : null,
        table_id: formTableId ? Number(formTableId) : null,
        tenant_payment_status_id: formPaymentStatusId ? Number(formPaymentStatusId) : null,
        order_status: formOrderStatus,
        tax_amount: formTaxAmount,
        service_charge: formServiceCharge,
        discount_amount: formDiscountAmount,
        guest_name: formGuestName || null,
        guest_phone: formGuestPhone || null,
        delivery_address: formDeliveryAddress || null,
        notes: formNotes || null,
        items: formItems.filter(it => it.tenant_menu_item_id && it.tenant_order_item_status_id),
      };
      if (editingId) {
        await orderService.update(editingId, payload);
        toast.success(t('orders.updated', 'Updated'));
      } else {
        await orderService.create(payload);
        toast.success(t('orders.created', 'Created'));
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('orders.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const availableTables = tablesForStore(formStoreId);
  const activeMenuItems = menuItems.filter((mi: any) => mi.is_active !== false);
  const currencySymbol = currencies.find(c => c.id === formCurrencyId)?.symbol || '';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('orders.title', 'Orders')}</h1>
        {canCreate && (
          <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> {t('orders.add', 'New Order')}
          </button>
        )}
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filterStoreId} onChange={e => setFilterStoreId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">{t('orders.allStores', 'All Stores')}</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">{t('orders.allStatuses', 'All Statuses')}</option>
          {ORDER_STATUSES.map(s => <option key={s} value={s}>{t(`orders.status.${s}`, s)}</option>)}
        </select>
        <input type="date" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg" placeholder={t('orders.fromDate', 'From')} />
        <input type="date" value={filterToDate} onChange={e => setFilterToDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg" placeholder={t('orders.toDate', 'To')} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.orderNumber', 'Order #')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.createdAt', 'Date')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.store', 'Store')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.customer', 'Customer')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.table', 'Table')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.items', 'Items')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.total', 'Total')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.statusLabel', 'Status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{o.order_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(o.created_at).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{o.store_name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{o.customer_name || o.guest_name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{o.table_name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{o.item_count ?? 0}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{num(o.total).toFixed(2)} {o.currency_code || ''}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColor[o.order_status]}`}>
                      {t(`orders.status.${o.order_status}`, o.order_status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleView(o.id)} className="text-gray-600 hover:text-gray-900 mr-3"><Eye className="w-4 h-4" /></button>
                    {canEdit && <button onClick={() => handleEdit(o.id)} className="text-blue-600 hover:text-blue-800 mr-3"><Pencil className="w-4 h-4" /></button>}
                    {canDelete && <button onClick={() => handleDelete(o.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">{t('orders.empty', 'No orders found')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{editingId ? t('orders.edit', 'Edit Order') : t('orders.add', 'New Order')}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('orders.store', 'Store')} *</label>
                  <select value={formStoreId} onChange={e => { setFormStoreId(Number(e.target.value)); setFormTableId(''); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value={0}>{t('common.selectOne', 'Select...')}</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('orders.source', 'Source')} *</label>
                  <select value={formSourceId} onChange={e => setFormSourceId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value={0}>{t('common.selectOne', 'Select...')}</option>
                    {sources.map(s => <option key={s.id} value={s.id}>{getTranslatedName(s.translations, s.code)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('orders.type', 'Type')} *</label>
                  <select value={formTypeId} onChange={e => setFormTypeId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value={0}>{t('common.selectOne', 'Select...')}</option>
                    {types.map(s => <option key={s.id} value={s.id}>{getTranslatedName(s.translations, s.code)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('orders.currency', 'Currency')} *</label>
                  <select value={formCurrencyId} onChange={e => setFormCurrencyId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value={0}>{t('common.selectOne', 'Select...')}</option>
                    {currencies.map(c => <option key={c.id} value={c.id}>{c.code} {c.symbol}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('orders.customer', 'Customer')}</label>
                  <select value={formCustomerId} onChange={e => setFormCustomerId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">{t('orders.noCustomer', 'None')}</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('orders.waiter', 'Waiter')}</label>
                  <select value={formWaiterId} onChange={e => setFormWaiterId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">{t('common.none', 'None')}</option>
                    {waiters.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('orders.table', 'Table')}</label>
                  <select value={formTableId} onChange={e => setFormTableId(e.target.value)}
                    disabled={!formStoreId} className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100">
                    <option value="">{t('common.none', 'None')}</option>
                    {availableTables.map(tb => <option key={tb.id} value={tb.id}>{tb.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('orders.paymentStatus', 'Payment Status')}</label>
                  <select value={formPaymentStatusId} onChange={e => setFormPaymentStatusId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">{t('common.none', 'None')}</option>
                    {paymentStatuses.map(p => <option key={p.id} value={p.id}>{getTranslatedName(p.translations, p.code)}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('orders.statusLabel', 'Order Status')}</label>
                  <select value={formOrderStatus} onChange={e => setFormOrderStatus(e.target.value as OrderStatus)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    {ORDER_STATUSES.map(s => <option key={s} value={s}>{t(`orders.status.${s}`, s)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('orders.taxAmount', 'Tax')}</label>
                  <input type="number" step="0.01" value={formTaxAmount} onChange={e => setFormTaxAmount(num(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('orders.serviceCharge', 'Service')}</label>
                  <input type="number" step="0.01" value={formServiceCharge} onChange={e => setFormServiceCharge(num(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('orders.discountAmount', 'Discount')}</label>
                  <input type="number" step="0.01" value={formDiscountAmount} onChange={e => setFormDiscountAmount(num(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('orders.guestName', 'Guest Name')}</label>
                  <input type="text" value={formGuestName} onChange={e => setFormGuestName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('orders.guestPhone', 'Guest Phone')}</label>
                  <input type="text" value={formGuestPhone} onChange={e => setFormGuestPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('orders.deliveryAddress', 'Delivery Address')}</label>
                  <input type="text" value={formDeliveryAddress} onChange={e => setFormDeliveryAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('orders.notes', 'Notes')}</label>
                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">{t('orders.items', 'Items')}</label>
                  <button type="button" onClick={addLineItem} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> {t('orders.addItem', 'Add Item')}
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.menuItem', 'Menu Item')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.itemStatus', 'Status')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">{t('orders.qty', 'Qty')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">{t('orders.unitPrice', 'Unit Price')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">{t('orders.lineTotal', 'Total')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.itemNotes', 'Notes')}</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {formItems.map((it, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">
                            <select value={it.tenant_menu_item_id} onChange={e => updateItem(idx, { tenant_menu_item_id: Number(e.target.value) })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                              <option value={0}>{t('common.selectOne', 'Select...')}</option>
                              {activeMenuItems.map((mi: any) => <option key={mi.id} value={mi.id}>{getTranslatedName(mi.translations, mi.code || `#${mi.id}`)}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select value={it.tenant_order_item_status_id} onChange={e => updateItem(idx, { tenant_order_item_status_id: Number(e.target.value) })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                              <option value={0}>{t('common.selectOne', 'Select...')}</option>
                              {itemStatuses.map(s => <option key={s.id} value={s.id}>{getTranslatedName(s.translations, s.code)}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={1} value={it.quantity} onChange={e => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" step="0.01" value={it.unit_price} onChange={e => updateItem(idx, { unit_price: num(e.target.value) })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                          </td>
                          <td className="px-3 py-2 text-gray-700 font-medium">
                            {(num(it.quantity) * num(it.unit_price)).toFixed(2)}
                          </td>
                          <td className="px-3 py-2">
                            <input type="text" value={it.notes || ''} onChange={e => updateItem(idx, { notes: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                          </td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => removeItem(idx)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                      {formItems.length === 0 && (
                        <tr><td colSpan={7} className="px-3 py-4 text-center text-gray-500 text-sm">{t('orders.noItems', 'No items yet. Click "Add Item" to begin.')}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">{t('orders.subtotal', 'Subtotal')}</span><span className="font-medium">{computedSubtotal.toFixed(2)} {currencySymbol}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{t('orders.taxAmount', 'Tax')}</span><span>{num(formTaxAmount).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{t('orders.serviceCharge', 'Service')}</span><span>{num(formServiceCharge).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{t('orders.discountAmount', 'Discount')}</span><span>-{num(formDiscountAmount).toFixed(2)}</span></div>
                  <div className="flex justify-between pt-2 border-t text-base font-semibold"><span>{t('orders.total', 'Total')}</span><span>{computedTotal.toFixed(2)} {currencySymbol}</span></div>
                </div>
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

      {showDetailModal && detailOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{t('orders.detailTitle', 'Order')} {detailOrder.order_number}</h2>
              <button onClick={() => setShowDetailModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-4">
                <div><span className="text-gray-500">{t('orders.store', 'Store')}:</span> <span className="font-medium">{detailOrder.store_name || '-'}</span></div>
                <div><span className="text-gray-500">{t('orders.customer', 'Customer')}:</span> <span className="font-medium">{detailOrder.customer_name || detailOrder.guest_name || '-'}</span></div>
                <div><span className="text-gray-500">{t('orders.waiter', 'Waiter')}:</span> <span className="font-medium">{detailOrder.waiter_name || '-'}</span></div>
                <div><span className="text-gray-500">{t('orders.table', 'Table')}:</span> <span className="font-medium">{detailOrder.table_name || '-'}</span></div>
                <div><span className="text-gray-500">{t('orders.createdAt', 'Date')}:</span> <span className="font-medium">{new Date(detailOrder.created_at).toLocaleString()}</span></div>
                <div><span className="text-gray-500">{t('orders.statusLabel', 'Status')}:</span>
                  <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${statusColor[detailOrder.order_status]}`}>{t(`orders.status.${detailOrder.order_status}`, detailOrder.order_status)}</span>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.menuItem', 'Item')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.qty', 'Qty')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.unitPrice', 'Unit')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.lineTotal', 'Total')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.itemStatus', 'Status')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.itemNotes', 'Notes')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(detailOrder.items || []).map(it => (
                      <tr key={it.id}>
                        <td className="px-3 py-2">{it.menu_item_name || `#${it.tenant_menu_item_id}`}</td>
                        <td className="px-3 py-2">{it.quantity}</td>
                        <td className="px-3 py-2">{num(it.unit_price).toFixed(2)}</td>
                        <td className="px-3 py-2 font-medium">{num(it.total_price).toFixed(2)}</td>
                        <td className="px-3 py-2">{it.status_code || '-'}</td>
                        <td className="px-3 py-2 text-gray-500">{it.notes || '-'}</td>
                      </tr>
                    ))}
                    {(detailOrder.items || []).length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-500">{t('orders.noItems', 'No items')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-1">
                  <div className="flex justify-between"><span className="text-gray-500">{t('orders.subtotal', 'Subtotal')}</span><span className="font-medium">{num(detailOrder.subtotal).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{t('orders.taxAmount', 'Tax')}</span><span>{num(detailOrder.tax_amount).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{t('orders.serviceCharge', 'Service')}</span><span>{num(detailOrder.service_charge).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{t('orders.discountAmount', 'Discount')}</span><span>-{num(detailOrder.discount_amount).toFixed(2)}</span></div>
                  <div className="flex justify-between pt-2 border-t text-base font-semibold"><span>{t('orders.total', 'Total')}</span><span>{num(detailOrder.total).toFixed(2)} {detailOrder.currency_code || ''}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
