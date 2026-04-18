import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import qrInvoiceTokenService, { QrInvoiceToken } from '../services/frontend-qrInvoiceTokenService';
import orderService, { Order } from '../services/orderService';
import tenantTableStructureService, { TenantTableStructure } from '../services/tenantTableStructureService';

export default function QrInvoiceTokensPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();
  const canCreate = hasPermission('qr_invoice_tokens.create');
  const canEdit = hasPermission('qr_invoice_tokens.edit');
  const canDelete = hasPermission('qr_invoice_tokens.delete');

  const [items, setItems] = useState<QrInvoiceToken[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<TenantTableStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');

  // Form
  const [formOrderId, setFormOrderId] = useState(0);
  const [formTableId, setFormTableId] = useState(0);
  const [formStatus, setFormStatus] = useState<'active' | 'expired' | 'used'>('active');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formMetadata, setFormMetadata] = useState('');

  if (!selectedTenant) {
    return <div className="p-6 text-center text-gray-500">{t('common.selectTenantFirst', 'Please select a tenant first')}</div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const filters: Record<string, any> = {};
      if (filterStatus) filters.status = filterStatus;

      const [tokenData, orderData, tableData] = await Promise.all([
        qrInvoiceTokenService.getAll(filters),
        orderService.getAll({ limit: 500 }).catch(() => []),
        tenantTableStructureService.getAll().catch(() => []),
      ]);
      setItems(tokenData);
      setOrders(orderData);
      setTables(tableData);
    } catch {
      toast.error(t('qrInvoiceTokens.fetchError', 'Failed to load QR invoice tokens'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedTenant?.id, filterStatus]);

  const resetForm = () => {
    setFormOrderId(0);
    setFormTableId(0);
    setFormStatus('active');
    setFormExpiresAt('');
    setFormMetadata('');
  };

  const handleCreate = () => {
    setEditingId(null);
    resetForm();
    // Default expires_at to 1 hour from now
    const d = new Date();
    d.setHours(d.getHours() + 1);
    setFormExpiresAt(d.toISOString().slice(0, 16));
    setShowModal(true);
  };

  const handleEdit = (item: QrInvoiceToken) => {
    setEditingId(item.id);
    setFormOrderId(item.order_id);
    setFormTableId(item.table_id);
    setFormStatus(item.status);
    setFormExpiresAt(item.expires_at ? item.expires_at.slice(0, 16) : '');
    setFormMetadata(item.metadata ? JSON.stringify(item.metadata, null, 2) : '');
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('qrInvoiceTokens.confirmDelete', 'Are you sure you want to delete this QR token?'))) return;
    try {
      await qrInvoiceTokenService.delete(id);
      toast.success(t('qrInvoiceTokens.deleted', 'QR token deleted'));
      fetchData();
    } catch {
      toast.error(t('qrInvoiceTokens.deleteError', 'Failed to delete'));
    }
  };

  const handleSave = async () => {
    if (!formOrderId) { toast.error(t('qrInvoiceTokens.orderRequired', 'Order is required')); return; }
    if (!formTableId) { toast.error(t('qrInvoiceTokens.tableRequired', 'Table is required')); return; }
    if (!formExpiresAt) { toast.error(t('qrInvoiceTokens.expiresAtRequired', 'Expiry date is required')); return; }

    let metadata: any = null;
    if (formMetadata.trim()) {
      try {
        metadata = JSON.parse(formMetadata);
      } catch {
        toast.error(t('qrInvoiceTokens.invalidJson', 'Metadata must be valid JSON'));
        return;
      }
    }

    try {
      setSaving(true);
      const payload = {
        order_id: formOrderId,
        table_id: formTableId,
        status: formStatus,
        expires_at: formExpiresAt,
        metadata,
      };
      if (editingId) {
        await qrInvoiceTokenService.update(editingId, payload);
        toast.success(t('qrInvoiceTokens.updated', 'QR token updated'));
      } else {
        await qrInvoiceTokenService.create(payload);
        toast.success(t('qrInvoiceTokens.created', 'QR token created'));
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('qrInvoiceTokens.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'used': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('qrInvoiceTokens.title', 'QR Invoice Tokens')}</h1>
        <div className="flex items-center gap-3">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
            <option value="">{t('qrInvoiceTokens.allStatuses', 'All Statuses')}</option>
            <option value="active">{t('qrInvoiceTokens.statusActive', 'Active')}</option>
            <option value="expired">{t('qrInvoiceTokens.statusExpired', 'Expired')}</option>
            <option value="used">{t('qrInvoiceTokens.statusUsed', 'Used')}</option>
          </select>
          {canCreate && (
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> {t('qrInvoiceTokens.add', 'Add QR Token')}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('qrInvoiceTokens.token', 'Token')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('qrInvoiceTokens.order', 'Order')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('qrInvoiceTokens.table', 'Table')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('qrInvoiceTokens.statusLabel', 'Status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('qrInvoiceTokens.expiresAt', 'Expires At')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('qrInvoiceTokens.lastAccessed', 'Last Accessed')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{item.token.slice(0, 12)}...</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.order_number || `#${item.order_id}`}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.table_name || `#${item.table_id}`}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColor(item.status)}`}>
                      {t(`qrInvoiceTokens.status${item.status.charAt(0).toUpperCase() + item.status.slice(1)}`, item.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.expires_at ? new Date(item.expires_at).toLocaleString() : '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.last_accessed_at ? new Date(item.last_accessed_at).toLocaleString() : '-'}</td>
                  <td className="px-6 py-4 text-right">
                    {canEdit && <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 mr-3"><Pencil className="w-4 h-4" /></button>}
                    {canDelete && <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">{t('qrInvoiceTokens.empty', 'No QR invoice tokens found')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">
                {editingId ? t('qrInvoiceTokens.edit', 'Edit QR Token') : t('qrInvoiceTokens.add', 'Add QR Token')}
              </h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('qrInvoiceTokens.order', 'Order')} *</label>
                <select value={formOrderId} onChange={e => setFormOrderId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value={0}>{t('qrInvoiceTokens.selectOrder', 'Select an order')}</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>{o.order_number || `Order #${o.id}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('qrInvoiceTokens.table', 'Table')} *</label>
                <select value={formTableId} onChange={e => setFormTableId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value={0}>{t('qrInvoiceTokens.selectTable', 'Select a table')}</option>
                  {tables.map(tb => (
                    <option key={tb.id} value={tb.id}>{tb.name || `Table #${tb.id}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('qrInvoiceTokens.statusLabel', 'Status')}</label>
                <select value={formStatus} onChange={e => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="active">{t('qrInvoiceTokens.statusActive', 'Active')}</option>
                  <option value="expired">{t('qrInvoiceTokens.statusExpired', 'Expired')}</option>
                  <option value="used">{t('qrInvoiceTokens.statusUsed', 'Used')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('qrInvoiceTokens.expiresAt', 'Expires At')} *</label>
                <input type="datetime-local" value={formExpiresAt} onChange={e => setFormExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('qrInvoiceTokens.metadata', 'Metadata (JSON)')}</label>
                <textarea value={formMetadata} onChange={e => setFormMetadata(e.target.value)} rows={4}
                  placeholder='{"key": "value"}'
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm" />
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
