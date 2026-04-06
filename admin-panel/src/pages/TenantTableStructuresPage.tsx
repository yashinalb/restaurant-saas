import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2, LayoutGrid, List } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import tenantTableStructureService, { type TenantTableStructure } from '../services/tenantTableStructureService';
import tenantSeatingAreaService, { TenantSeatingArea } from '../services/tenantSeatingAreaService';
import { storeService, Store } from '../services/storeService';

const SHAPES = ['square', 'rectangle', 'circle', 'oval'] as const;
const STATUSES = ['available', 'occupied', 'reserved', 'blocked'] as const;
const GRID_H = 800;
const DEFAULT_SIZE = 70;

export default function TenantTableStructuresPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();
  const canManage = hasPermission('tables.manage');

  const getSeatingAreaName = (area: TenantSeatingArea) => {
    const tr = area.translations?.find(t => t.language_code === i18n.language)
      || area.translations?.find(t => t.language_code === 'en')
      || area.translations?.[0];
    return tr?.name || '-';
  };

  const [items, setItems] = useState<TenantTableStructure[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [seatingAreas, setSeatingAreas] = useState<TenantSeatingArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'floorplan'>('list');
  const [filterStoreId, setFilterStoreId] = useState<number | ''>('');

  // Form state
  const [formStoreId, setFormStoreId] = useState<number | ''>('');
  const [formSeatingAreaId, setFormSeatingAreaId] = useState<number | ''>('');
  const [formName, setFormName] = useState('');
  const [formShape, setFormShape] = useState<string>('square');
  const [formCapacity, setFormCapacity] = useState(2);
  const [formMinCapacity, setFormMinCapacity] = useState(1);
  const [formStatus, setFormStatus] = useState<string>('available');
  const [formIsActive, setFormIsActive] = useState(true);

  // Drag state
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  if (!selectedTenant) {
    return <div className="p-6 text-center text-gray-500">{t('common.selectTenantFirst', 'Please select a tenant first')}</div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsData, storesData, areasData] = await Promise.all([
        tenantTableStructureService.getAll(),
        storeService.getAll(),
        tenantSeatingAreaService.getAll(),
      ]);
      setItems(itemsData);
      setStores(storesData);
      setSeatingAreas(areasData);
      if (storesData.length > 0 && !filterStoreId) setFilterStoreId(storesData[0].id);
    } catch (error) {
      toast.error(t('tenantTables.fetchError', 'Failed to load'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedTenant?.id]);

  const getAreaName = (areaId: number | null) => {
    if (!areaId) return '-';
    const area = seatingAreas.find(a => a.id === areaId);
    return area ? getSeatingAreaName(area) : '-';
  };

  const filteredAreas = seatingAreas.filter(a => !formStoreId || a.store_id === formStoreId);
  const floorPlanTables = items.filter(i => !filterStoreId || i.store_id === (filterStoreId as number));

  const handleCreate = () => {
    setEditingId(null);
    setFormStoreId(filterStoreId || ''); setFormSeatingAreaId(''); setFormName(''); setFormShape('square');
    setFormCapacity(2); setFormMinCapacity(1); setFormStatus('available'); setFormIsActive(true);
    setShowModal(true);
  };

  const handleEdit = (item: TenantTableStructure) => {
    setEditingId(item.id);
    setFormStoreId(item.store_id); setFormSeatingAreaId(item.tenant_seating_area_id || '');
    setFormName(item.name); setFormShape(item.shape); setFormCapacity(item.capacity);
    setFormMinCapacity(item.min_capacity); setFormStatus(item.status); setFormIsActive(!!item.is_active);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('tenantTables.confirmDelete', 'Are you sure?'))) return;
    try {
      await tenantTableStructureService.delete(id);
      toast.success(t('tenantTables.deleted', 'Deleted'));
      fetchData();
    } catch (error) {
      toast.error(t('tenantTables.deleteError', 'Failed to delete'));
    }
  };

  const handleSave = async () => {
    if (!formStoreId) { toast.error(t('tenantTables.storeRequired', 'Store is required')); return; }
    if (!formName.trim()) { toast.error(t('tenantTables.nameRequired', 'Name is required')); return; }
    try {
      setSaving(true);
      const payload = {
        store_id: formStoreId as number,
        tenant_seating_area_id: formSeatingAreaId || null,
        name: formName, shape: formShape as TenantTableStructure['shape'],
        capacity: formCapacity, min_capacity: formMinCapacity,
        status: formStatus as TenantTableStructure['status'], is_active: formIsActive,
      };
      if (editingId) {
        await tenantTableStructureService.update(editingId, payload);
        toast.success(t('tenantTables.updated', 'Updated'));
      } else {
        await tenantTableStructureService.create(payload);
        toast.success(t('tenantTables.created', 'Created'));
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('tenantTables.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  // --- Drag & Drop ---
  const handleMouseDown = useCallback((e: React.MouseEvent, table: TenantTableStructure) => {
    if (!canManage) return;
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const tx = table.position_x ?? 50;
    const ty = table.position_y ?? 50;
    setDraggingId(table.id);
    setDragOffset({ x: e.clientX - rect.left - tx, y: e.clientY - rect.top - ty });
    setDragPos({ x: tx, y: ty });
  }, [canManage]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingId === null) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(rect.width - DEFAULT_SIZE, e.clientX - rect.left - dragOffset.x));
    const y = Math.max(0, Math.min(GRID_H - DEFAULT_SIZE, e.clientY - rect.top - dragOffset.y));
    setDragPos({ x, y });
  }, [draggingId, dragOffset]);

  const handleMouseUp = useCallback(async () => {
    if (draggingId === null) return;
    const x = Math.round(dragPos.x);
    const y = Math.round(dragPos.y);
    setDraggingId(null);
    try {
      await tenantTableStructureService.update(draggingId, { position_x: x, position_y: y });
      setItems(prev => prev.map(it => it.id === draggingId ? { ...it, position_x: x, position_y: y } : it));
    } catch {
      toast.error(t('tenantTables.saveError', 'Failed to save position'));
    }
  }, [draggingId, dragPos, t]);

  const statusBg: Record<string, string> = {
    available: 'bg-green-500',
    occupied: 'bg-red-500',
    reserved: 'bg-yellow-500',
    blocked: 'bg-gray-400',
  };
  const statusBorder: Record<string, string> = {
    available: 'border-green-600',
    occupied: 'border-red-600',
    reserved: 'border-yellow-600',
    blocked: 'border-gray-500',
  };
  const statusColors: Record<string, string> = {
    available: 'bg-green-100 text-green-800',
    occupied: 'bg-red-100 text-red-800',
    reserved: 'bg-yellow-100 text-yellow-800',
    blocked: 'bg-gray-100 text-gray-800',
  };

  const renderTableShape = (table: TenantTableStructure) => {
    const w = table.width || DEFAULT_SIZE;
    const h = table.height || (table.shape === 'rectangle' ? DEFAULT_SIZE * 0.6 : DEFAULT_SIZE);
    const isDragging = draggingId === table.id;
    const x = isDragging ? dragPos.x : (table.position_x ?? 50);
    const y = isDragging ? dragPos.y : (table.position_y ?? 50);
    const isRound = table.shape === 'circle' || table.shape === 'oval';

    return (
      <div
        key={table.id}
        onMouseDown={e => handleMouseDown(e, table)}
        onDoubleClick={() => canManage && handleEdit(table)}
        className={`absolute flex flex-col items-center justify-center border-2 select-none
          ${statusBorder[table.status]} ${table.is_active ? 'opacity-100' : 'opacity-40'}
          ${canManage ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
          ${isDragging ? 'z-20 shadow-lg scale-105' : 'z-10 hover:shadow-md'}
          transition-shadow`}
        style={{
          left: x, top: y, width: w, height: h,
          borderRadius: isRound ? '50%' : '8px',
          backgroundColor: `${statusBg[table.status]}22`,
        }}
        title={`${table.name} (${t(`tenantTables.status_${table.status}`, table.status)}) - ${table.capacity} seats`}
      >
        <span className="text-xs font-bold text-gray-800 leading-tight">{table.name}</span>
        <span className="text-[10px] text-gray-500">{table.capacity}p</span>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('tenantTables.title', 'Tables')}</h1>
        <div className="flex items-center gap-2">
          {/* Store filter */}
          <select value={filterStoreId} onChange={e => setFilterStoreId(e.target.value ? parseInt(e.target.value) : '')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="">{t('tenantTables.allStores', 'All Stores')}</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {/* View toggle */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('floorplan')}
              className={`px-3 py-2 text-sm ${viewMode === 'floorplan' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          {canManage && (
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> {t('tenantTables.add', 'Add Table')}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : viewMode === 'floorplan' ? (
        /* ===== FLOOR PLAN VIEW ===== */
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500" /> {t('tenantTables.status_available', 'Available')}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" /> {t('tenantTables.status_occupied', 'Occupied')}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500" /> {t('tenantTables.status_reserved', 'Reserved')}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-400" /> {t('tenantTables.status_blocked', 'Blocked')}</span>
            {canManage && <span className="ml-4 text-gray-400 italic">{t('tenantTables.dragHint', 'Drag to reposition. Double-click to edit.')}</span>}
          </div>
          <div
            ref={canvasRef}
            className="relative bg-white rounded-xl shadow-inner border-2 border-dashed border-gray-200 overflow-hidden"
            style={{ width: '100%', height: GRID_H, backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {floorPlanTables.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                {t('tenantTables.emptyFloorPlan', 'No tables yet. Add tables and drag them into position.')}
              </div>
            )}
            {floorPlanTables.map(table => renderTableShape(table))}
          </div>
        </div>
      ) : (
        /* ===== LIST VIEW ===== */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantTables.name', 'Name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantTables.store', 'Store')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantTables.seatingArea', 'Area')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantTables.shape', 'Shape')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantTables.capacity', 'Capacity')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tenantTables.tableStatus', 'Status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(filterStoreId ? items.filter(i => i.store_id === filterStoreId) : items).map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.store_name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{getAreaName(item.tenant_seating_area_id)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 capitalize">{t(`tenantTables.shape_${item.shape}`, item.shape)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.min_capacity}-{item.capacity}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColors[item.status] || 'bg-gray-100 text-gray-800'}`}>
                      {t(`tenantTables.status_${item.status}`, item.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {canManage && <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 mr-3"><Pencil className="w-4 h-4" /></button>}
                    {canManage && <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">{t('tenantTables.empty', 'No tables found')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">
                {editingId ? t('tenantTables.edit', 'Edit Table') : t('tenantTables.add', 'Add Table')}
              </h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantTables.name', 'Name')} *</label>
                  <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="T1, T2..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantTables.store', 'Store')} *</label>
                  <select value={formStoreId} onChange={e => { setFormStoreId(e.target.value ? parseInt(e.target.value) : ''); setFormSeatingAreaId(''); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">{t('tenantTables.selectStore', '-- Select Store --')}</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantTables.seatingArea', 'Seating Area')}</label>
                  <select value={formSeatingAreaId} onChange={e => setFormSeatingAreaId(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">{t('tenantTables.noArea', '-- No Area --')}</option>
                    {filteredAreas.map(a => <option key={a.id} value={a.id}>{getSeatingAreaName(a)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantTables.shape', 'Shape')}</label>
                  <select value={formShape} onChange={e => setFormShape(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    {SHAPES.map(s => <option key={s} value={s}>{t(`tenantTables.shape_${s}`, s)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantTables.capacity', 'Capacity')}</label>
                  <input type="number" min={1} value={formCapacity} onChange={e => setFormCapacity(parseInt(e.target.value) || 2)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantTables.minCapacity', 'Min')}</label>
                  <input type="number" min={1} value={formMinCapacity} onChange={e => setFormMinCapacity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantTables.tableStatus', 'Status')}</label>
                  <select value={formStatus} onChange={e => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    {STATUSES.map(s => <option key={s} value={s}>{t(`tenantTables.status_${s}`, s)}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formIsActive} onChange={e => setFormIsActive(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">{t('common.active', 'Active')}</span>
              </label>
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
