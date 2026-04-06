import api from './api';

export interface TenantTableStructure {
  id: number;
  store_id: number;
  store_name: string;
  tenant_seating_area_id: number | null;
  seating_area_translations?: Array<{ language_code: string; name: string }>;
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
  parent_table_name: string | null;
  is_temporary_merge: boolean;
  merged_at: string | null;
  merged_by: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const tenantTableStructureService = {
  async getAll(filters?: Record<string, any>): Promise<TenantTableStructure[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const response = await api.get(`/api/tenant/tables?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<TenantTableStructure> {
    const response = await api.get(`/api/tenant/tables/${id}`);
    return response.data.data || response.data;
  },
  async create(data: Partial<TenantTableStructure>): Promise<TenantTableStructure> {
    const response = await api.post('/api/tenant/tables', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<TenantTableStructure>): Promise<TenantTableStructure> {
    const response = await api.put(`/api/tenant/tables/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/tables/${id}`);
  },
};

export default tenantTableStructureService;
