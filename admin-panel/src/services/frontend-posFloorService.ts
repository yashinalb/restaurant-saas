import api from './api';

export type TableDisplayStatus = 'available' | 'occupied' | 'reserved' | 'blocked' | 'merged';

export interface PosSeatingArea {
  id: number;
  sort_order: number;
  is_active: boolean | number;
  table_count?: number;
  translations?: Array<{ language_code: string; name: string }>;
}

export interface PosReservationChip {
  id: number;
  reserved_at: string;
  guest_count: number;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  duration_minutes: number | null;
}

export interface PosOpenOrder {
  id: number;
  order_number: string;
  table_id: number;
  total: number | string;
  created_at: string;
  tenant_waiter_id: number | null;
}

export interface PosFloorTable {
  id: number;
  store_id: number;
  tenant_seating_area_id: number | null;
  name: string;
  position_x: number | null;
  position_y: number | null;
  width: number | null;
  height: number | null;
  shape: 'square' | 'rectangle' | 'circle' | 'oval';
  capacity: number;
  min_capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'blocked';
  parent_table_id: number | null;
  is_temporary_merge: boolean | number;
  merged_at: string | null;
  is_active: boolean | number;
  display_status: TableDisplayStatus;
  open_order: PosOpenOrder | null;
  todays_reservations: PosReservationChip[];
}

const posFloorService = {
  async getSeatingAreas(store_id: number): Promise<PosSeatingArea[]> {
    const response = await api.get('/api/tenant/pos/seating-areas', { params: { store_id } });
    return response.data.data || [];
  },
  async getFloor(store_id: number, seating_area_id?: number): Promise<PosFloorTable[]> {
    const response = await api.get('/api/tenant/pos/floor', {
      params: { store_id, ...(seating_area_id ? { seating_area_id } : {}) },
    });
    return response.data.data || [];
  },
  async merge(parentTableId: number, store_id: number, child_ids: number[]): Promise<void> {
    await api.post(`/api/tenant/pos/tables/${parentTableId}/merge`, { store_id, child_ids });
  },
  async unmerge(tableId: number, store_id: number): Promise<void> {
    await api.post(`/api/tenant/pos/tables/${tableId}/unmerge`, { store_id });
  },
};

export default posFloorService;
