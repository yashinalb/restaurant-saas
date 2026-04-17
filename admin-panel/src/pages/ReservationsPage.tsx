import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import reservationService, { Reservation, ReservationInput } from '../services/reservationService';
import { storeService, Store } from '../services/storeService';
import tenantTableStructureService, { TenantTableStructure } from '../services/tenantTableStructureService';
import tenantCustomerService, { TenantCustomer } from '../services/tenantCustomerService';

type ResStatus = Reservation['status'];
type ResSource = Reservation['source'];

const STATUSES: ResStatus[] = ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'];
const SOURCES: ResSource[] = ['phone', 'online', 'walk_in', 'third_party'];

const statusColor: Record<ResStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  checked_in: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-red-100 text-red-800',
};

export default function ReservationsPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();

  const canCreate = hasPermission('reservations.create');
  const canEdit = hasPermission('reservations.edit');
  const canDelete = hasPermission('reservations.cancel');

  const [items, setItems] = useState<Reservation[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [tables, setTables] = useState<TenantTableStructure[]>([]);
  const [customers, setCustomers] = useState<TenantCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterStoreId, setFilterStoreId] = useState<string>('');

  const [formStoreId, setFormStoreId] = useState<number>(0);
  const [formPrimaryTableId, setFormPrimaryTableId] = useState<number>(0);
  const [formCustomerId, setFormCustomerId] = useState<string>('');
  const [formGuestCount, setFormGuestCount] = useState<number>(2);
  const [formReservedAt, setFormReservedAt] = useState<string>('');
  const [formDuration, setFormDuration] = useState<number>(120);
  const [formStatus, setFormStatus] = useState<ResStatus>('pending');
  const [formSource, setFormSource] = useState<ResSource>('phone');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formCustomerPhone, setFormCustomerPhone] = useState('');
  const [formCustomerEmail, setFormCustomerEmail] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formExtraTableIds, setFormExtraTableIds] = useState<Set<number>>(new Set());

  if (!selectedTenant) {
    return <div className="p-6 text-center text-gray-500">{t('common.selectTenantFirst', 'Please select a tenant first')}</div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const filters: Record<string, any> = {};
      if (filterStatus) filters.status = filterStatus;
      if (filterStoreId) filters.store_id = filterStoreId;
      const [resData, storesData, tablesData, customersData] = await Promise.all([
        reservationService.getAll(filters),
        storeService.getAll().catch(() => []),
        tenantTableStructureService.getAll().catch(() => []),
        tenantCustomerService.getAll().catch(() => []),
      ]);
      setItems(resData);
      setStores(Array.isArray(storesData) ? storesData : []);
      setTables(Array.isArray(tablesData) ? tablesData : []);
      setCustomers(Array.isArray(customersData) ? customersData : []);
    } catch (error) {
      toast.error(t('reservations.fetchError', 'Failed to load reservations'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedTenant?.id, filterStatus, filterStoreId]);

  const tablesForStore = (storeId: number) => tables.filter(tbl => tbl.store_id === storeId);

  const resetForm = () => {
    setFormStoreId(0); setFormPrimaryTableId(0); setFormCustomerId('');
    setFormGuestCount(2); setFormReservedAt(''); setFormDuration(120);
    setFormStatus('pending'); setFormSource('phone');
    setFormCustomerName(''); setFormCustomerPhone(''); setFormCustomerEmail('');
    setFormNotes(''); setFormExtraTableIds(new Set());
  };

  const handleCreate = () => {
    setEditingId(null);
    resetForm();
    setShowModal(true);
  };

  const formatForInput = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleEdit = (item: Reservation) => {
    setEditingId(item.id);
    setFormStoreId(item.store_id);
    setFormPrimaryTableId(item.primary_table_id);
    setFormCustomerId(item.tenant_customer_id ? String(item.tenant_customer_id) : '');
    setFormGuestCount(item.guest_count);
    setFormReservedAt(formatForInput(item.reserved_at));
    setFormDuration(item.duration_minutes);
    setFormStatus(item.status);
    setFormSource(item.source);
    setFormCustomerName(item.customer_name || '');
    setFormCustomerPhone(item.customer_phone || '');
    setFormCustomerEmail(item.customer_email || '');
    setFormNotes(item.notes || '');
    const extras = new Set<number>();
    item.tables.forEach(t2 => {
      if (t2.tenant_table_structure_id !== item.primary_table_id) extras.add(t2.tenant_table_structure_id);
    });
    setFormExtraTableIds(extras);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('reservations.confirmDelete', 'Are you sure?'))) return;
    try {
      await reservationService.delete(id);
      toast.success(t('reservations.deleted', 'Deleted'));
      fetchData();
    } catch {
      toast.error(t('reservations.deleteError', 'Failed to delete'));
    }
  };

  const handleSave = async () => {
    if (!formStoreId) { toast.error(t('reservations.storeRequired', 'Store is required')); return; }
    if (!formPrimaryTableId) { toast.error(t('reservations.tableRequired', 'Primary table is required')); return; }
    if (!formReservedAt) { toast.error(t('reservations.dateRequired', 'Reserved date is required')); return; }
    if (!formGuestCount || formGuestCount < 1) { toast.error(t('reservations.guestCountRequired', 'Guest count required')); return; }

    try {
      setSaving(true);
      const payload: ReservationInput = {
        store_id: formStoreId,
        primary_table_id: formPrimaryTableId,
        tenant_customer_id: formCustomerId ? Number(formCustomerId) : null,
        guest_count: formGuestCount,
        reserved_at: formReservedAt.replace('T', ' ') + ':00',
        duration_minutes: formDuration,
        status: formStatus,
        source: formSource,
        customer_name: formCustomerName || null,
        customer_phone: formCustomerPhone || null,
        customer_email: formCustomerEmail || null,
        notes: formNotes || null,
        table_ids: Array.from(formExtraTableIds),
      };
      if (editingId) {
        await reservationService.update(editingId, payload);
        toast.success(t('reservations.updated', 'Updated'));
      } else {
        await reservationService.create(payload);
        toast.success(t('reservations.created', 'Created'));
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('reservations.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const toggleExtraTable = (id: number) => {
    const next = new Set(formExtraTableIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setFormExtraTableIds(next);
  };

  const availableTables = tablesForStore(formStoreId);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('reservations.title', 'Reservations')}</h1>
        {canCreate && (
          <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> {t('reservations.add', 'Add Reservation')}
          </button>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <select value={filterStoreId} onChange={e => setFilterStoreId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">{t('reservations.allStores', 'All Stores')}</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">{t('reservations.allStatuses', 'All Statuses')}</option>
          {STATUSES.map(s => <option key={s} value={s}>{t(`reservations.status.${s}`, s)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reservations.reservedAt', 'Date/Time')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reservations.customer', 'Customer')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reservations.store', 'Store')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reservations.table', 'Table')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reservations.guests', 'Guests')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reservations.sourceLabel', 'Source')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reservations.statusLabel', 'Status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => {
                const customerDisplay = item.customer_name_ref || item.customer_name || '-';
                const tableNames = item.tables && item.tables.length > 0
                  ? item.tables.map(t2 => t2.table_name).filter(Boolean).join(', ')
                  : item.primary_table_name || '-';
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{new Date(item.reserved_at).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{customerDisplay}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.store_name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{tableNames}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.guest_count}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{t(`reservations.source.${item.source}`, item.source)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusColor[item.status]}`}>
                        {t(`reservations.status.${item.status}`, item.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canEdit && <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 mr-3"><Pencil className="w-4 h-4" /></button>}
                      {canDelete && <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">{t('reservations.empty', 'No reservations found')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">
                {editingId ? t('reservations.edit', 'Edit Reservation') : t('reservations.add', 'Add Reservation')}
              </h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('reservations.store', 'Store')} *</label>
                  <select value={formStoreId} onChange={e => { setFormStoreId(Number(e.target.value)); setFormPrimaryTableId(0); setFormExtraTableIds(new Set()); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value={0}>{t('common.selectOne', 'Select...')}</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('reservations.primaryTable', 'Primary Table')} *</label>
                  <select value={formPrimaryTableId} onChange={e => setFormPrimaryTableId(Number(e.target.value))}
                    disabled={!formStoreId} className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100">
                    <option value={0}>{t('common.selectOne', 'Select...')}</option>
                    {availableTables.map(tbl => <option key={tbl.id} value={tbl.id}>{tbl.name} ({tbl.capacity})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('reservations.reservedAt', 'Date/Time')} *</label>
                  <input type="datetime-local" value={formReservedAt} onChange={e => setFormReservedAt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('reservations.duration', 'Duration (min)')}</label>
                  <input type="number" min={1} value={formDuration} onChange={e => setFormDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('reservations.guests', 'Guests')} *</label>
                  <input type="number" min={1} value={formGuestCount} onChange={e => setFormGuestCount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('reservations.statusLabel', 'Status')}</label>
                  <select value={formStatus} onChange={e => setFormStatus(e.target.value as ResStatus)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    {STATUSES.map(s => <option key={s} value={s}>{t(`reservations.status.${s}`, s)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('reservations.sourceLabel', 'Source')}</label>
                  <select value={formSource} onChange={e => setFormSource(e.target.value as ResSource)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    {SOURCES.map(s => <option key={s} value={s}>{t(`reservations.source.${s}`, s)}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('reservations.existingCustomer', 'Existing Customer (optional)')}</label>
                <select value={formCustomerId} onChange={e => setFormCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="">{t('reservations.noCustomer', 'None (use name/phone below)')}</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('reservations.customerName', 'Guest Name')}</label>
                  <input type="text" value={formCustomerName} onChange={e => setFormCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('reservations.customerPhone', 'Phone')}</label>
                  <input type="text" value={formCustomerPhone} onChange={e => setFormCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('reservations.customerEmail', 'Email')}</label>
                  <input type="email" value={formCustomerEmail} onChange={e => setFormCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>

              {formStoreId > 0 && availableTables.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('reservations.additionalTables', 'Additional Tables (for merging)')}</label>
                  <div className="grid grid-cols-3 gap-2 p-3 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                    {availableTables.filter(tbl => tbl.id !== formPrimaryTableId).map(tbl => (
                      <label key={tbl.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={formExtraTableIds.has(tbl.id)}
                          onChange={() => toggleExtraTable(tbl.id)} className="rounded" />
                        <span>{tbl.name}</span>
                      </label>
                    ))}
                    {availableTables.filter(tbl => tbl.id !== formPrimaryTableId).length === 0 && (
                      <span className="text-xs text-gray-500 col-span-3">{t('reservations.noOtherTables', 'No other tables in this store')}</span>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('reservations.notes', 'Notes')}</label>
                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
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
