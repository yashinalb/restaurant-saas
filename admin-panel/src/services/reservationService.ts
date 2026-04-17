import api from './api';

export interface ReservationTableLink {
  tenant_table_structure_id: number;
  table_name: string | null;
}

export interface Reservation {
  id: number;
  store_id: number;
  primary_table_id: number;
  tenant_customer_id: number | null;
  guest_count: number;
  reserved_at: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  notes: string | null;
  source: 'phone' | 'online' | 'walk_in' | 'third_party';
  created_at: string;
  updated_at: string;
  store_name: string | null;
  primary_table_name: string | null;
  customer_name_ref: string | null;
  customer_email_ref: string | null;
  customer_phone_ref: string | null;
  tables: ReservationTableLink[];
}

export interface ReservationInput {
  store_id: number;
  primary_table_id: number;
  tenant_customer_id?: number | null;
  guest_count: number;
  reserved_at: string;
  duration_minutes?: number;
  status?: Reservation['status'];
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  notes?: string | null;
  source?: Reservation['source'];
  table_ids?: number[];
}

const reservationService = {
  async getAll(filters?: Record<string, any>): Promise<Reservation[]> {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
    const response = await api.get(`/api/tenant/reservations?${params.toString()}`);
    return response.data.data || response.data;
  },
  async getById(id: number): Promise<Reservation> {
    const response = await api.get(`/api/tenant/reservations/${id}`);
    return response.data.data || response.data;
  },
  async create(data: ReservationInput): Promise<Reservation> {
    const response = await api.post('/api/tenant/reservations', data);
    return response.data.data || response.data;
  },
  async update(id: number, data: Partial<ReservationInput>): Promise<Reservation> {
    const response = await api.put(`/api/tenant/reservations/${id}`, data);
    return response.data.data || response.data;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/api/tenant/reservations/${id}`);
  },
};

export default reservationService;
