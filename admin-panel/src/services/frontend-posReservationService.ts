import api from './api';

export interface PosTodayReservation {
  id: number;
  status: 'pending' | 'confirmed' | 'checked_in';
  guest_count: number;
  reserved_at: string;
  duration_minutes: number | null;
  primary_table_id: number;
  primary_table_name: string | null;
  tenant_customer_id: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  notes: string | null;
  source: string | null;
  customer_name_ref: string | null;
  customer_phone_ref: string | null;
  customer_email_ref: string | null;
}

export interface PosCheckInResult {
  reservation_id: number;
  order_id: number;
  status: 'checked_in';
}

const posReservationService = {
  async today(store_id: number): Promise<PosTodayReservation[]> {
    const response = await api.get('/api/tenant/pos/reservations/today', { params: { store_id } });
    return response.data.data || [];
  },
  async checkIn(reservationId: number, session_id: number): Promise<PosCheckInResult> {
    const response = await api.post(`/api/tenant/pos/reservations/${reservationId}/check-in`, { session_id });
    return response.data.data;
  },
};

export default posReservationService;
