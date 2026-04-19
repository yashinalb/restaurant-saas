import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Eye, X, Filter, RefreshCw, Shield } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import auditLogService, { AuditLogEntry } from '../services/frontend-auditLogService';
import { storeService } from '../services/storeService';
import type { Store } from '../services/storeService';

const ACTION_COLORS: Record<string, string> = {
  void_order: 'bg-red-100 text-red-800',
  void_item: 'bg-red-100 text-red-800',
  refund: 'bg-red-100 text-red-800',
  ikram: 'bg-pink-100 text-pink-800',
  discount_apply: 'bg-amber-100 text-amber-800',
  discount_clear: 'bg-amber-100 text-amber-800',
  reprint_receipt: 'bg-slate-100 text-slate-700',
  reprint_kitchen_ticket: 'bg-slate-100 text-slate-700',
  drawer_open: 'bg-emerald-100 text-emerald-800',
  shift_open: 'bg-emerald-100 text-emerald-800',
  shift_close: 'bg-emerald-100 text-emerald-800',
  payment: 'bg-blue-100 text-blue-800',
};

const fullName = (first: string | null | undefined, last: string | null | undefined, email: string | null | undefined) =>
  [first, last].filter(Boolean).join(' ') || email || '—';

export default function AuditLogPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();
  const canView = hasPermission('audit_logs.view');

  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterStore, setFilterStore] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterTargetType, setFilterTargetType] = useState('');
  const [filterTargetId, setFilterTargetId] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  const [detail, setDetail] = useState<AuditLogEntry | null>(null);

  if (!selectedTenant) {
    return <div className="p-6 text-center text-gray-500">{t('common.selectTenantFirst', 'Please select a tenant first')}</div>;
  }

  if (!canView) {
    return <div className="p-6 text-center text-gray-500">{t('auditLog.noAccess', 'You do not have permission to view the audit log.')}</div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const filters: Record<string, any> = {};
      if (filterStore) filters.store_id = filterStore;
      if (filterAction) filters.action = filterAction;
      if (filterTargetType) filters.target_type = filterTargetType;
      if (filterTargetId) filters.target_id = filterTargetId;
      if (filterFromDate) filters.from_date = filterFromDate;
      if (filterToDate) filters.to_date = filterToDate;
      const [data, storeData, actionList] = await Promise.all([
        auditLogService.getAll(filters),
        storeService.getAll().catch(() => []),
        auditLogService.getActions().catch(() => []),
      ]);
      setItems(data);
      setStores(storeData);
      setActions(actionList);
    } catch {
      toast.error(t('auditLog.fetchError', 'Failed to load audit log'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedTenant?.id, filterStore, filterAction, filterTargetType, filterTargetId, filterFromDate, filterToDate]);

  const badgeClass = (action: string) => ACTION_COLORS[action] || 'bg-gray-100 text-gray-700';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-slate-600" />
          <h1 className="text-2xl font-bold text-gray-900">{t('auditLog.title', 'Audit Log')}</h1>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
          <RefreshCw className="w-4 h-4" /> {t('common.refresh', 'Refresh')}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-3 mb-4 flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        <select value={filterStore} onChange={e => setFilterStore(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded text-sm">
          <option value="">{t('auditLog.allStores', 'All Stores')}</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded text-sm">
          <option value="">{t('auditLog.allActions', 'All Actions')}</option>
          {actions.map(a => <option key={a} value={a}>{t(`auditLog.actions.${a}`, a)}</option>)}
        </select>
        <input type="text" value={filterTargetType} onChange={e => setFilterTargetType(e.target.value)}
          placeholder={t('auditLog.targetType', 'Target type')}
          className="px-3 py-2 border border-gray-300 rounded text-sm w-32" />
        <input type="number" value={filterTargetId} onChange={e => setFilterTargetId(e.target.value)}
          placeholder={t('auditLog.targetId', 'Target ID')}
          className="px-3 py-2 border border-gray-300 rounded text-sm w-28" />
        <input type="date" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded text-sm" />
        <input type="date" value={filterToDate} onChange={e => setFilterToDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded text-sm" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('auditLog.time', 'Time')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('auditLog.action', 'Action')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('auditLog.target', 'Target')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('auditLog.reason', 'Reason')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('auditLog.actor', 'Actor')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('auditLog.store', 'Store')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{new Date(entry.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClass(entry.action)}`}>{t(`auditLog.actions.${entry.action}`, entry.action)}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {entry.target_type && entry.target_id ? `${entry.target_type} #${entry.target_id}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-xs" title={entry.reason || ''}>{entry.reason || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {fullName(entry.admin_user_first_name, entry.admin_user_last_name, entry.admin_user_email)}
                    {entry.waiter_name && <span className="text-xs text-gray-400 ml-2">· {entry.waiter_name}</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{entry.store_name || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDetail(entry)} className="text-blue-600 hover:text-blue-800"><Eye className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">{t('auditLog.empty', 'No audit log entries match these filters')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
              <h2 className="font-bold text-gray-900">{t('auditLog.entryTitle', 'Audit entry')} #{detail.id}</h2>
              <button onClick={() => setDetail(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-500">{t('auditLog.time', 'Time')}:</span> {new Date(detail.created_at).toLocaleString()}</div>
                <div><span className="text-gray-500">{t('auditLog.action', 'Action')}:</span> <span className={`px-2 py-0.5 rounded text-xs font-semibold ${badgeClass(detail.action)}`}>{t(`auditLog.actions.${detail.action}`, detail.action)}</span></div>
                <div><span className="text-gray-500">{t('auditLog.target', 'Target')}:</span> {detail.target_type ? `${detail.target_type} #${detail.target_id}` : '—'}</div>
                <div><span className="text-gray-500">{t('auditLog.store', 'Store')}:</span> {detail.store_name || '—'}</div>
                <div><span className="text-gray-500">{t('auditLog.actor', 'Actor')}:</span> {fullName(detail.admin_user_first_name, detail.admin_user_last_name, detail.admin_user_email)}</div>
                <div><span className="text-gray-500">{t('auditLog.waiter', 'Waiter')}:</span> {detail.waiter_name || '—'}</div>
                <div className="col-span-2"><span className="text-gray-500">{t('auditLog.reason', 'Reason')}:</span> {detail.reason || '—'}</div>
                {detail.ip_address && <div className="col-span-2"><span className="text-gray-500">{t('auditLog.ip', 'IP')}:</span> {detail.ip_address}</div>}
              </div>
              {detail.before_json && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('auditLog.before', 'Before')}</div>
                  <pre className="bg-gray-50 text-xs p-2 rounded overflow-x-auto">{JSON.stringify(detail.before_json, null, 2)}</pre>
                </div>
              )}
              {detail.after_json && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('auditLog.after', 'After')}</div>
                  <pre className="bg-gray-50 text-xs p-2 rounded overflow-x-auto">{JSON.stringify(detail.after_json, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
