import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Trash2, X, Loader2, Eye, Sparkles, BarChart3 } from 'lucide-react';
import api from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import dailyReportSnapshotService, { DailyReportSnapshot } from '../services/frontend-dailyReportSnapshotService';
import { storeService } from '../services/storeService';
import type { Store } from '../services/storeService';

interface Currency { id: number; code: string; symbol: string; name: string; }

const num = (v: any) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
};

export default function DailyReportSnapshotsPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();
  const canCreate = hasPermission('daily_reports.create');
  const canDelete = hasPermission('daily_reports.delete');

  const [items, setItems] = useState<DailyReportSnapshot[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [filterStore, setFilterStore] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genStoreId, setGenStoreId] = useState(0);
  const [genReportDate, setGenReportDate] = useState('');
  const [genCurrencyId, setGenCurrencyId] = useState(0);

  const [showDetail, setShowDetail] = useState(false);
  const [detail, setDetail] = useState<DailyReportSnapshot | null>(null);

  if (!selectedTenant) {
    return <div className="p-6 text-center text-gray-500">{t('common.selectTenantFirst', 'Please select a tenant first')}</div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const filters: Record<string, any> = {};
      if (filterStore) filters.store_id = filterStore;
      if (filterCurrency) filters.currency_id = filterCurrency;
      if (filterFromDate) filters.from_date = filterFromDate;
      if (filterToDate) filters.to_date = filterToDate;

      const [snapData, storeData, currencyResp] = await Promise.all([
        dailyReportSnapshotService.getAll(filters),
        storeService.getAll().catch(() => []),
        api.get('/api/tenant/currencies').catch(() => ({ data: { data: [] } })),
      ]);
      setItems(snapData);
      setStores(storeData);
      setCurrencies(currencyResp.data?.data || []);
    } catch {
      toast.error(t('dailyReports.fetchError', 'Failed to load daily reports'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedTenant?.id, filterStore, filterCurrency, filterFromDate, filterToDate]);

  const openGenerateModal = () => {
    setGenStoreId(stores[0]?.id ?? 0);
    setGenReportDate(new Date().toISOString().slice(0, 10));
    setGenCurrencyId(currencies[0]?.id ?? 0);
    setShowGenerateModal(true);
  };

  const handleGenerate = async () => {
    if (!genStoreId || !genReportDate || !genCurrencyId) {
      toast.error(t('dailyReports.fieldsRequired', 'Store, date, and currency are required'));
      return;
    }
    try {
      setSaving(true);
      await dailyReportSnapshotService.generate({
        store_id: genStoreId,
        report_date: genReportDate,
        currency_id: genCurrencyId,
      });
      toast.success(t('dailyReports.generated', 'Snapshot generated'));
      setShowGenerateModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('dailyReports.generateError', 'Failed to generate'));
    } finally {
      setSaving(false);
    }
  };

  const handleView = async (id: number) => {
    try {
      const full = await dailyReportSnapshotService.getById(id);
      setDetail(full);
      setShowDetail(true);
    } catch {
      toast.error(t('dailyReports.fetchError', 'Failed to load snapshot'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('dailyReports.confirmDelete', 'Delete this snapshot?'))) return;
    try {
      await dailyReportSnapshotService.delete(id);
      toast.success(t('dailyReports.deleted', 'Snapshot deleted'));
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('dailyReports.deleteError', 'Failed to delete'));
    }
  };

  const netProfit = (item: DailyReportSnapshot) => {
    return num(item.total_revenue) - num(item.total_expenses) - num(item.total_refunds);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('dailyReports.title', 'Daily Report Snapshots')}</h1>
        {canCreate && (
          <button onClick={openGenerateModal} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            <Sparkles className="w-4 h-4" /> {t('dailyReports.generate', 'Generate Snapshot')}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={filterStore} onChange={e => setFilterStore(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">{t('dailyReports.allStores', 'All Stores')}</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterCurrency} onChange={e => setFilterCurrency(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">{t('dailyReports.allCurrencies', 'All Currencies')}</option>
          {currencies.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
        </select>
        <input type="date" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
        <input type="date" value={filterToDate} onChange={e => setFilterToDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('dailyReports.date', 'Date')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('dailyReports.store', 'Store')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('dailyReports.currency', 'Currency')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('dailyReports.orders', 'Orders')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('dailyReports.revenue', 'Revenue')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('dailyReports.tax', 'Tax')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('dailyReports.expenses', 'Expenses')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('dailyReports.netProfit', 'Net')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{new Date(item.report_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.store_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.currency_code}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-700">{item.total_orders}</td>
                  <td className="px-6 py-4 text-sm text-right text-green-700 font-medium">{item.currency_symbol || ''}{num(item.total_revenue).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">{item.currency_symbol || ''}{num(item.total_tax).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right text-red-600">{item.currency_symbol || ''}{num(item.total_expenses).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold">
                    <span className={netProfit(item) >= 0 ? 'text-green-700' : 'text-red-700'}>
                      {item.currency_symbol || ''}{netProfit(item).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button onClick={() => handleView(item.id)} className="text-gray-600 hover:text-gray-800 mr-3"><Eye className="w-4 h-4" /></button>
                    {canDelete && <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">{t('dailyReports.empty', 'No snapshots found')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Generate modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{t('dailyReports.generate', 'Generate Snapshot')}</h2>
              <button onClick={() => setShowGenerateModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">{t('dailyReports.generateHelp', 'Aggregates transactions, orders, and expenses for the selected store, date, and currency. Overwrites any existing snapshot for that key.')}</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('dailyReports.store', 'Store')} *</label>
                <select value={genStoreId} onChange={e => setGenStoreId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value={0}>{t('dailyReports.selectStore', 'Select a store')}</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('dailyReports.date', 'Report Date')} *</label>
                <input type="date" value={genReportDate} onChange={e => setGenReportDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('dailyReports.currency', 'Currency')} *</label>
                <select value={genCurrencyId} onChange={e => setGenCurrencyId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value={0}>{t('dailyReports.selectCurrency', 'Select a currency')}</option>
                  {currencies.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowGenerateModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">{t('common.cancel', 'Cancel')}</button>
              <button onClick={handleGenerate} disabled={saving} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('dailyReports.generate', 'Generate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {showDetail && detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold">{new Date(detail.report_date).toLocaleDateString()} · {detail.store_name}</h2>
              </div>
              <button onClick={() => setShowDetail(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-blue-50 rounded p-3">
                  <div className="text-xs text-gray-600">{t('dailyReports.orders', 'Orders')}</div>
                  <div className="text-xl font-bold text-blue-900">{detail.total_orders}</div>
                </div>
                <div className="bg-green-50 rounded p-3">
                  <div className="text-xs text-gray-600">{t('dailyReports.revenue', 'Revenue')}</div>
                  <div className="text-xl font-bold text-green-900">{detail.currency_symbol}{num(detail.total_revenue).toFixed(2)}</div>
                </div>
                <div className="bg-red-50 rounded p-3">
                  <div className="text-xs text-gray-600">{t('dailyReports.expenses', 'Expenses')}</div>
                  <div className="text-xl font-bold text-red-900">{detail.currency_symbol}{num(detail.total_expenses).toFixed(2)}</div>
                </div>
                <div className={`${netProfit(detail) >= 0 ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'} rounded p-3`}>
                  <div className="text-xs text-gray-600">{t('dailyReports.netProfit', 'Net Profit')}</div>
                  <div className="text-xl font-bold">{detail.currency_symbol}{netProfit(detail).toFixed(2)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="border rounded p-3">
                  <div className="text-xs text-gray-500">{t('dailyReports.tax', 'Tax')}</div>
                  <div className="font-semibold">{detail.currency_symbol}{num(detail.total_tax).toFixed(2)}</div>
                </div>
                <div className="border rounded p-3">
                  <div className="text-xs text-gray-500">{t('dailyReports.tips', 'Tips')}</div>
                  <div className="font-semibold">{detail.currency_symbol}{num(detail.total_tips).toFixed(2)}</div>
                </div>
                <div className="border rounded p-3">
                  <div className="text-xs text-gray-500">{t('dailyReports.discounts', 'Discounts')}</div>
                  <div className="font-semibold">{detail.currency_symbol}{num(detail.total_discounts).toFixed(2)}</div>
                </div>
                <div className="border rounded p-3">
                  <div className="text-xs text-gray-500">{t('dailyReports.refunds', 'Refunds')}</div>
                  <div className="font-semibold">{detail.currency_symbol}{num(detail.total_refunds).toFixed(2)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">{t('dailyReports.ordersByType', 'Orders by Type')}</h3>
                  {detail.order_count_by_type && Object.keys(detail.order_count_by_type).length > 0 ? (
                    <div className="space-y-1">
                      {Object.entries(detail.order_count_by_type).map(([type, count]) => (
                        <div key={type} className="flex justify-between bg-gray-50 rounded px-3 py-2 text-sm">
                          <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  ) : <div className="text-gray-500 italic text-sm">{t('dailyReports.noData', 'No data')}</div>}
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{t('dailyReports.paymentBreakdown', 'Payment Breakdown')}</h3>
                  {detail.payment_breakdown && Object.keys(detail.payment_breakdown).length > 0 ? (
                    <div className="space-y-1">
                      {Object.entries(detail.payment_breakdown).map(([type, amount]) => (
                        <div key={type} className="flex justify-between bg-gray-50 rounded px-3 py-2 text-sm">
                          <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                          <span className="font-medium">{detail.currency_symbol}{num(amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : <div className="text-gray-500 italic text-sm">{t('dailyReports.noData', 'No data')}</div>}
                </div>
              </div>

              <div className="text-xs text-gray-400 pt-2 border-t">
                {t('dailyReports.generatedAt', 'Generated at')}: {new Date(detail.generated_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
