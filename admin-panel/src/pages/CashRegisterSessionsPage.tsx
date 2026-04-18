import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Trash2, X, Loader2, Eye, DoorClosed, Wallet } from 'lucide-react';
import api from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import cashRegisterSessionService, { CashRegisterSession } from '../services/frontend-cashRegisterSessionService';
import { storeService } from '../services/storeService';
import type { Store } from '../services/storeService';

interface Currency { id: number; code: string; symbol: string; name: string; }

const num = (v: any) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
};

const fullName = (first: string | null | undefined, last: string | null | undefined, email: string | undefined) =>
  [first, last].filter(Boolean).join(' ') || email || '-';

export default function CashRegisterSessionsPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();
  const canCreate = hasPermission('cash_sessions.create');
  const canEdit = hasPermission('cash_sessions.edit');
  const canDelete = hasPermission('cash_sessions.delete');

  const [items, setItems] = useState<CashRegisterSession[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [filterStore, setFilterStore] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('');

  // Open modal
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openStoreId, setOpenStoreId] = useState(0);
  const [openAmount, setOpenAmount] = useState('');
  const [openCurrencyId, setOpenCurrencyId] = useState(0);
  const [openNotes, setOpenNotes] = useState('');

  // Close modal
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingSession, setClosingSession] = useState<CashRegisterSession | null>(null);
  const [closeClosingAmount, setCloseClosingAmount] = useState('');
  const [closeExpectedAmount, setCloseExpectedAmount] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  // Detail modal
  const [showDetail, setShowDetail] = useState(false);
  const [detail, setDetail] = useState<CashRegisterSession | null>(null);

  if (!selectedTenant) {
    return <div className="p-6 text-center text-gray-500">{t('common.selectTenantFirst', 'Please select a tenant first')}</div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const filters: Record<string, any> = {};
      if (filterStore) filters.store_id = filterStore;
      if (filterCurrency) filters.currency_id = filterCurrency;
      if (filterStatus) filters.status = filterStatus;

      const [sessData, storeData, currencyResp] = await Promise.all([
        cashRegisterSessionService.getAll(filters),
        storeService.getAll().catch(() => []),
        api.get('/api/tenant/currencies').catch(() => ({ data: { data: [] } })),
      ]);
      setItems(sessData);
      setStores(storeData);
      setCurrencies(currencyResp.data?.data || []);
    } catch {
      toast.error(t('cashSessions.fetchError', 'Failed to load sessions'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedTenant?.id, filterStore, filterCurrency, filterStatus]);

  const openOpenModal = () => {
    setOpenStoreId(stores[0]?.id ?? 0);
    setOpenAmount('');
    setOpenCurrencyId(currencies[0]?.id ?? 0);
    setOpenNotes('');
    setShowOpenModal(true);
  };

  const handleOpen = async () => {
    if (!openStoreId || !openCurrencyId) { toast.error(t('cashSessions.fieldsRequired', 'Store and currency are required')); return; }
    if (!openAmount || num(openAmount) < 0) { toast.error(t('cashSessions.openingAmountRequired', 'Opening amount is required')); return; }
    try {
      setSaving(true);
      await cashRegisterSessionService.open({
        store_id: openStoreId,
        opening_amount: num(openAmount),
        currency_id: openCurrencyId,
        notes: openNotes.trim() || null,
      });
      toast.success(t('cashSessions.opened', 'Session opened'));
      setShowOpenModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('cashSessions.openError', 'Failed to open session'));
    } finally {
      setSaving(false);
    }
  };

  const openCloseModal = (sess: CashRegisterSession) => {
    setClosingSession(sess);
    setCloseClosingAmount('');
    setCloseExpectedAmount(String(num(sess.opening_amount)));
    setCloseNotes('');
    setShowCloseModal(true);
  };

  const handleClose = async () => {
    if (!closingSession) return;
    if (!closeClosingAmount || num(closeClosingAmount) < 0) { toast.error(t('cashSessions.closingAmountRequired', 'Closing amount is required')); return; }
    try {
      setSaving(true);
      await cashRegisterSessionService.close(closingSession.id, {
        closing_amount: num(closeClosingAmount),
        expected_amount: closeExpectedAmount ? num(closeExpectedAmount) : null,
        notes: closeNotes.trim() || null,
      });
      toast.success(t('cashSessions.closed', 'Session closed'));
      setShowCloseModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('cashSessions.closeError', 'Failed to close session'));
    } finally {
      setSaving(false);
    }
  };

  const handleView = async (id: number) => {
    try {
      const full = await cashRegisterSessionService.getById(id);
      setDetail(full);
      setShowDetail(true);
    } catch {
      toast.error(t('cashSessions.fetchError', 'Failed to load session'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('cashSessions.confirmDelete', 'Delete this session?'))) return;
    try {
      await cashRegisterSessionService.delete(id);
      toast.success(t('cashSessions.deleted', 'Session deleted'));
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('cashSessions.deleteError', 'Failed to delete'));
    }
  };

  const isOpen = (s: CashRegisterSession) => !s.closed_at;

  const diffColor = (diff: number) => {
    if (diff === 0) return 'text-gray-700';
    if (diff > 0) return 'text-green-700';
    return 'text-red-700';
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('cashSessions.title', 'Cash Register Sessions')}</h1>
        {canCreate && (
          <button onClick={openOpenModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> {t('cashSessions.open', 'Open Session')}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={filterStore} onChange={e => setFilterStore(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">{t('cashSessions.allStores', 'All Stores')}</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterCurrency} onChange={e => setFilterCurrency(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">{t('cashSessions.allCurrencies', 'All Currencies')}</option>
          {currencies.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">{t('cashSessions.allStatuses', 'All')}</option>
          <option value="open">{t('cashSessions.statusOpen', 'Open')}</option>
          <option value="closed">{t('cashSessions.statusClosed', 'Closed')}</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('cashSessions.openedAt', 'Opened')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('cashSessions.store', 'Store')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('cashSessions.openedBy', 'Opened By')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('cashSessions.opening', 'Opening')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('cashSessions.closing', 'Closing')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('cashSessions.expected', 'Expected')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('cashSessions.difference', 'Diff')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('cashSessions.status', 'Status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(item.opened_at).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.store_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{fullName(item.opened_by_first_name, item.opened_by_last_name, item.opened_by_email)}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-700">{item.currency_symbol || ''}{num(item.opening_amount).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-700">{item.closing_amount != null ? `${item.currency_symbol || ''}${num(item.closing_amount).toFixed(2)}` : '-'}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">{item.expected_amount != null ? `${item.currency_symbol || ''}${num(item.expected_amount).toFixed(2)}` : '-'}</td>
                  <td className={`px-6 py-4 text-sm text-right font-semibold ${item.difference != null ? diffColor(num(item.difference)) : 'text-gray-500'}`}>
                    {item.difference != null ? `${item.currency_symbol || ''}${num(item.difference).toFixed(2)}` : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${isOpen(item) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                      {isOpen(item) ? t('cashSessions.statusOpen', 'Open') : t('cashSessions.statusClosed', 'Closed')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button onClick={() => handleView(item.id)} className="text-gray-600 hover:text-gray-800 mr-3"><Eye className="w-4 h-4" /></button>
                    {canEdit && isOpen(item) && (
                      <button onClick={() => openCloseModal(item)} title={t('cashSessions.closeSession', 'Close Session')}
                        className="text-amber-600 hover:text-amber-800 mr-3"><DoorClosed className="w-4 h-4" /></button>
                    )}
                    {canDelete && <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">{t('cashSessions.empty', 'No sessions found')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Open session modal */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-2"><Wallet className="w-5 h-5 text-blue-600" /><h2 className="text-lg font-semibold">{t('cashSessions.open', 'Open Session')}</h2></div>
              <button onClick={() => setShowOpenModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('cashSessions.store', 'Store')} *</label>
                <select value={openStoreId} onChange={e => setOpenStoreId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value={0}>{t('cashSessions.selectStore', 'Select a store')}</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('cashSessions.openingAmount', 'Opening Amount')} *</label>
                  <input type="number" step="0.01" value={openAmount} onChange={e => setOpenAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('cashSessions.currency', 'Currency')} *</label>
                  <select value={openCurrencyId} onChange={e => setOpenCurrencyId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value={0}>{t('cashSessions.selectCurrency', 'Select a currency')}</option>
                    {currencies.map(c => <option key={c.id} value={c.id}>{c.code} ({c.symbol})</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('cashSessions.notes', 'Notes')}</label>
                <textarea value={openNotes} onChange={e => setOpenNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowOpenModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">{t('common.cancel', 'Cancel')}</button>
              <button onClick={handleOpen} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('cashSessions.open', 'Open Session')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close session modal */}
      {showCloseModal && closingSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-2"><DoorClosed className="w-5 h-5 text-amber-600" /><h2 className="text-lg font-semibold">{t('cashSessions.closeSession', 'Close Session')}</h2></div>
              <button onClick={() => setShowCloseModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-blue-50 rounded text-sm">
                <div><span className="text-gray-600">{t('cashSessions.store', 'Store')}:</span> <strong>{closingSession.store_name}</strong></div>
                <div><span className="text-gray-600">{t('cashSessions.openedAt', 'Opened')}:</span> {new Date(closingSession.opened_at).toLocaleString()}</div>
                <div><span className="text-gray-600">{t('cashSessions.openingAmount', 'Opening Amount')}:</span> <strong>{closingSession.currency_symbol}{num(closingSession.opening_amount).toFixed(2)}</strong></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('cashSessions.closingAmount', 'Closing Amount')} *</label>
                <input type="number" step="0.01" value={closeClosingAmount} onChange={e => setCloseClosingAmount(e.target.value)}
                  placeholder={t('cashSessions.countedInDrawer', 'Counted in drawer')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('cashSessions.expectedAmount', 'Expected Amount')}</label>
                <input type="number" step="0.01" value={closeExpectedAmount} onChange={e => setCloseExpectedAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-gray-500 mt-1">{t('cashSessions.expectedHelp', 'Opening + cash payments during the shift. Leave blank to default to opening amount.')}</p>
              </div>
              {closeClosingAmount && closeExpectedAmount && (
                <div className={`p-3 rounded text-sm font-semibold ${diffColor(num(closeClosingAmount) - num(closeExpectedAmount))} bg-gray-50`}>
                  {t('cashSessions.difference', 'Difference')}: {closingSession.currency_symbol}{(num(closeClosingAmount) - num(closeExpectedAmount)).toFixed(2)}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('cashSessions.notes', 'Notes')}</label>
                <textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowCloseModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">{t('common.cancel', 'Cancel')}</button>
              <button onClick={handleClose} disabled={saving} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('cashSessions.closeSession', 'Close Session')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {showDetail && detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{t('cashSessions.detailTitle', 'Session Detail')}</h2>
              <button onClick={() => setShowDetail(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-gray-500">{t('cashSessions.store', 'Store')}:</span> <strong>{detail.store_name}</strong></div>
                <div><span className="text-gray-500">{t('cashSessions.currency', 'Currency')}:</span> {detail.currency_code}</div>
                <div><span className="text-gray-500">{t('cashSessions.openedAt', 'Opened')}:</span> {new Date(detail.opened_at).toLocaleString()}</div>
                <div><span className="text-gray-500">{t('cashSessions.openedBy', 'Opened By')}:</span> {fullName(detail.opened_by_first_name, detail.opened_by_last_name, detail.opened_by_email)}</div>
                {detail.closed_at && (
                  <>
                    <div><span className="text-gray-500">{t('cashSessions.closedAt', 'Closed')}:</span> {new Date(detail.closed_at).toLocaleString()}</div>
                    <div><span className="text-gray-500">{t('cashSessions.closedBy', 'Closed By')}:</span> {fullName(detail.closed_by_first_name, detail.closed_by_last_name, detail.closed_by_email)}</div>
                  </>
                )}
              </div>
              <div className="grid grid-cols-4 gap-3 py-3 border-t border-b">
                <div><span className="text-xs text-gray-500">{t('cashSessions.opening', 'Opening')}</span><div className="font-semibold">{detail.currency_symbol}{num(detail.opening_amount).toFixed(2)}</div></div>
                <div><span className="text-xs text-gray-500">{t('cashSessions.closing', 'Closing')}</span><div className="font-semibold">{detail.closing_amount != null ? `${detail.currency_symbol}${num(detail.closing_amount).toFixed(2)}` : '-'}</div></div>
                <div><span className="text-xs text-gray-500">{t('cashSessions.expected', 'Expected')}</span><div className="font-semibold">{detail.expected_amount != null ? `${detail.currency_symbol}${num(detail.expected_amount).toFixed(2)}` : '-'}</div></div>
                <div><span className="text-xs text-gray-500">{t('cashSessions.difference', 'Difference')}</span>
                  <div className={`font-bold ${detail.difference != null ? diffColor(num(detail.difference)) : 'text-gray-500'}`}>
                    {detail.difference != null ? `${detail.currency_symbol}${num(detail.difference).toFixed(2)}` : '-'}
                  </div>
                </div>
              </div>
              {detail.notes && <div><span className="text-gray-500">{t('cashSessions.notes', 'Notes')}:</span> {detail.notes}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
