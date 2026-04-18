import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Plus, Link2, Unlink, RefreshCw, Users, Clock, X } from 'lucide-react';
import { usePosSessionStore } from '../../store/posSessionStore';
import { usePermissions } from '../../hooks/usePermissions';
import posFloorService, { PosFloorTable, PosSeatingArea, TableDisplayStatus } from '../../services/frontend-posFloorService';

const STATUS_COLORS: Record<TableDisplayStatus, string> = {
  available: 'bg-green-100 border-green-400 hover:bg-green-200',
  occupied: 'bg-red-100 border-red-400 hover:bg-red-200',
  reserved: 'bg-amber-100 border-amber-400 hover:bg-amber-200',
  blocked: 'bg-gray-200 border-gray-400 opacity-60 cursor-not-allowed',
  merged: 'bg-purple-100 border-purple-400 hover:bg-purple-200',
};

const STATUS_LABEL_COLORS: Record<TableDisplayStatus, string> = {
  available: 'bg-green-600 text-white',
  occupied: 'bg-red-600 text-white',
  reserved: 'bg-amber-600 text-white',
  blocked: 'bg-gray-600 text-white',
  merged: 'bg-purple-600 text-white',
};

const getTranslatedName = (translations: Array<{ language_code?: string; name: string }> | undefined, fallback = '-') => {
  if (!translations || translations.length === 0) return fallback;
  return translations[0].name || fallback;
};

export default function PosFloorPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { session } = usePosSessionStore();
  const { hasPermission } = usePermissions();

  const canTakeOrder = hasPermission('pos.take_order');

  const [tables, setTables] = useState<PosFloorTable[]>([]);
  const [areas, setAreas] = useState<PosSeatingArea[]>([]);
  const [areaFilter, setAreaFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Merge mode
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelection, setMergeSelection] = useState<Set<number>>(new Set());
  const [mergeSaving, setMergeSaving] = useState(false);

  const [fabOpen, setFabOpen] = useState(false);

  const translatedAreaName = (a: PosSeatingArea) => {
    const trans = a.translations || [];
    return trans.find(tr => tr.language_code === i18n.language)?.name
      || trans.find(tr => tr.language_code === 'en')?.name
      || getTranslatedName(trans, `Area #${a.id}`);
  };

  const fetchData = async () => {
    if (!session) return;
    try {
      setLoading(true);
      const [tableData, areaData] = await Promise.all([
        posFloorService.getFloor(session.store_id, areaFilter ?? undefined),
        posFloorService.getSeatingAreas(session.store_id),
      ]);
      setTables(tableData);
      setAreas(areaData);
    } catch {
      toast.error(t('pos.floor.fetchError', 'Failed to load floor plan'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) {
      navigate('/pos/login', { replace: true });
      return;
    }
    fetchData();
    // Refresh every 30 seconds to keep statuses live
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [session?.id, areaFilter]);

  const grouped = useMemo(() => {
    const byArea: Record<string, PosFloorTable[]> = {};
    for (const tbl of tables) {
      const key = tbl.tenant_seating_area_id != null ? String(tbl.tenant_seating_area_id) : 'none';
      (byArea[key] ||= []).push(tbl);
    }
    return byArea;
  }, [tables]);

  const areaName = (areaId: string) => {
    if (areaId === 'none') return t('pos.floor.noArea', 'Unassigned');
    const a = areas.find(x => String(x.id) === areaId);
    return a ? translatedAreaName(a) : t('pos.floor.noArea', 'Unassigned');
  };

  const handleTableTap = async (tbl: PosFloorTable) => {
    if (mergeMode) {
      if (tbl.display_status === 'blocked') return;
      const next = new Set(mergeSelection);
      if (next.has(tbl.id)) next.delete(tbl.id); else next.add(tbl.id);
      setMergeSelection(next);
      return;
    }
    if (tbl.display_status === 'blocked') {
      toast.message(t('pos.floor.tableBlocked', 'This table is blocked'));
      return;
    }
    if (tbl.display_status === 'merged' && tbl.parent_table_id) {
      toast.message(t('pos.floor.mergedChild', 'This table is merged. Tap the parent to open its order.'));
      return;
    }
    if (!canTakeOrder) {
      toast.error(t('pos.floor.noTakeOrderPermission', 'You do not have permission to take orders'));
      return;
    }
    if (tbl.open_order) {
      navigate(`/pos/orders/${tbl.open_order.id}`);
    } else {
      navigate(`/pos/orders/new?table_id=${tbl.id}`);
    }
  };

  const handleMergeConfirm = async () => {
    if (!session) return;
    if (mergeSelection.size < 2) {
      toast.error(t('pos.floor.mergeMinTwo', 'Select at least 2 tables to merge'));
      return;
    }
    const ids = Array.from(mergeSelection);
    const [parentId, ...childIds] = ids;
    try {
      setMergeSaving(true);
      await posFloorService.merge(parentId, session.store_id, childIds);
      toast.success(t('pos.floor.mergeSuccess', 'Tables merged'));
      setMergeMode(false);
      setMergeSelection(new Set());
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('pos.floor.mergeError', 'Failed to merge'));
    } finally {
      setMergeSaving(false);
    }
  };

  const handleUnmerge = async (tbl: PosFloorTable) => {
    if (!session) return;
    if (!confirm(t('pos.floor.confirmUnmerge', 'Unmerge this table?'))) return;
    try {
      await posFloorService.unmerge(tbl.id, session.store_id);
      toast.success(t('pos.floor.unmergeSuccess', 'Table unmerged'));
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('pos.floor.unmergeError', 'Failed to unmerge'));
    }
  };

  const handleWalkIn = () => {
    navigate('/pos/orders/new?walkin=1');
  };

  const handleCheckInReservation = () => {
    toast.message(t('pos.floor.checkInComingSoon', 'Reservation check-in will be available in a later step'));
    setFabOpen(false);
  };

  if (!session) return null;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('pos.floor.title', 'Floor Plan')}</h1>
          <p className="text-sm text-gray-500">{session.store_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} title={t('common.refresh', 'Refresh')}
            className="p-2 text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
          </button>
          {canTakeOrder && !mergeMode && (
            <button onClick={() => setMergeMode(true)}
              className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
              <Link2 className="w-4 h-4" /> {t('pos.floor.merge', 'Merge Tables')}
            </button>
          )}
          {mergeMode && (
            <>
              <span className="text-sm text-gray-600">
                {t('pos.floor.mergeSelected', '{{count}} selected', { count: mergeSelection.size })}
              </span>
              <button onClick={handleMergeConfirm} disabled={mergeSaving || mergeSelection.size < 2}
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm">
                {mergeSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('pos.floor.confirmMerge', 'Confirm Merge')}
              </button>
              <button onClick={() => { setMergeMode(false); setMergeSelection(new Set()); }}
                className="p-2 text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Area filter tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={() => setAreaFilter(null)}
          className={`px-3 py-1.5 rounded-full text-sm ${areaFilter === null ? 'bg-slate-900 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}>
          {t('pos.floor.allAreas', 'All Areas')}
        </button>
        {areas.map(a => (
          <button key={a.id} onClick={() => setAreaFilter(a.id)}
            className={`px-3 py-1.5 rounded-full text-sm ${areaFilter === a.id ? 'bg-slate-900 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}>
            {translatedAreaName(a)} <span className="text-xs opacity-70">({a.table_count ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-4 text-xs text-gray-600 flex-wrap">
        {(['available', 'occupied', 'reserved', 'merged', 'blocked'] as TableDisplayStatus[]).map(s => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded ${STATUS_COLORS[s].split(' ')[0]}`} />
            <span className="capitalize">{t(`pos.floor.status.${s}`, s)}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>
      ) : tables.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center text-gray-500">
          {t('pos.floor.empty', 'No tables configured for this store')}
        </div>
      ) : (
        <div className="space-y-6 pb-24">
          {Object.entries(grouped).map(([areaId, tbls]) => (
            <div key={areaId}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">{areaName(areaId)}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {tbls.map(tbl => {
                  const selected = mergeSelection.has(tbl.id);
                  const shapeClass = tbl.shape === 'circle' || tbl.shape === 'oval' ? 'rounded-full' : 'rounded-lg';
                  const canTap = tbl.display_status !== 'blocked';
                  return (
                    <div key={tbl.id}
                      onClick={() => canTap ? handleTableTap(tbl) : undefined}
                      className={`relative border-2 p-3 transition ${shapeClass} ${STATUS_COLORS[tbl.display_status]}
                        ${selected ? 'ring-4 ring-purple-500' : ''}
                        ${canTap ? 'cursor-pointer' : ''}`}
                      style={{ minHeight: 110 }}>
                      <div className="flex items-start justify-between mb-1">
                        <div className="font-bold text-gray-900">{tbl.name}</div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_LABEL_COLORS[tbl.display_status]}`}>
                          {t(`pos.floor.status.${tbl.display_status}`, tbl.display_status)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-700 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {tbl.capacity}
                      </div>

                      {tbl.open_order && (
                        <div className="mt-2 text-xs bg-white/70 rounded px-2 py-1">
                          <div className="font-semibold">{tbl.open_order.order_number}</div>
                        </div>
                      )}

                      {tbl.todays_reservations.length > 0 && tbl.display_status !== 'merged' && (
                        <div className="mt-2 space-y-1">
                          {tbl.todays_reservations.slice(0, 2).map(r => (
                            <div key={r.id} className="text-[10px] bg-white/80 rounded px-1.5 py-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span className="font-medium">{new Date(r.reserved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="truncate">· {r.customer_name || `${r.guest_count}p`}</span>
                            </div>
                          ))}
                          {tbl.todays_reservations.length > 2 && (
                            <div className="text-[10px] text-gray-500">+{tbl.todays_reservations.length - 2} more</div>
                          )}
                        </div>
                      )}

                      {tbl.display_status === 'merged' && !mergeMode && canTakeOrder && (
                        <button onClick={(e) => { e.stopPropagation(); handleUnmerge(tbl); }}
                          className="absolute bottom-1 right-1 text-purple-700 hover:text-purple-900"
                          title={t('pos.floor.unmerge', 'Unmerge')}>
                          <Unlink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating action menu */}
      {canTakeOrder && !mergeMode && (
        <div className="fixed bottom-6 right-6 z-40">
          {fabOpen && (
            <div className="mb-3 flex flex-col gap-2 items-end">
              <button onClick={handleWalkIn}
                className="px-4 py-2 rounded-full bg-white shadow-lg border border-gray-200 text-sm flex items-center gap-2 hover:bg-gray-50">
                <Users className="w-4 h-4 text-amber-600" /> {t('pos.floor.walkIn', 'Walk-in order')}
              </button>
              <button onClick={() => { setMergeMode(true); setFabOpen(false); }}
                className="px-4 py-2 rounded-full bg-white shadow-lg border border-gray-200 text-sm flex items-center gap-2 hover:bg-gray-50">
                <Link2 className="w-4 h-4 text-purple-600" /> {t('pos.floor.merge', 'Merge Tables')}
              </button>
              <button onClick={handleCheckInReservation}
                className="px-4 py-2 rounded-full bg-white shadow-lg border border-gray-200 text-sm flex items-center gap-2 hover:bg-gray-50">
                <Clock className="w-4 h-4 text-blue-600" /> {t('pos.floor.checkInReservation', 'Check-in reservation')}
              </button>
            </div>
          )}
          <button onClick={() => setFabOpen(!fabOpen)}
            className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition ${fabOpen ? 'bg-gray-700 rotate-45' : 'bg-amber-600 hover:bg-amber-700'}`}>
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
