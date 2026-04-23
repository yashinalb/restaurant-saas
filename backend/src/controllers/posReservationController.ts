import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { PosReservationService } from '../services/posReservationService.js';

export class PosReservationController {
  static async today(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const storeId = Number(req.query.store_id);
      if (!storeId) { res.status(400).json({ error: 'store_id is required' }); return; }
      const data = await PosReservationService.todayForStore(Number(req.tenant.id), storeId);
      res.json({ data });
    } catch (error: any) {
      console.error('[PosReservationController] today error:', error);
      res.status(500).json({ error: 'Failed to fetch reservations' });
    }
  }

  static async checkIn(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const reservationId = parseInt(req.params.id);
      if (isNaN(reservationId)) { res.status(400).json({ error: 'Invalid reservation ID' }); return; }
      const { session_id } = req.body;
      if (!session_id) { res.status(400).json({ error: 'session_id is required' }); return; }
      const result = await PosReservationService.checkIn(Number(req.tenant.id), reservationId, {
        session_id: Number(session_id),
      });
      res.status(201).json({ data: result, message: 'Reservation checked in' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      if (error.status === 401) { res.status(401).json({ error: error.message }); return; }
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      console.error('[PosReservationController] checkIn error:', error);
      res.status(500).json({ error: 'Failed to check in reservation' });
    }
  }
}
