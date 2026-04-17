import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { ReservationService } from '../services/reservationService.js';

export class ReservationController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = {
        store_id: req.query.store_id ? Number(req.query.store_id) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        source: req.query.source ? String(req.query.source) : undefined,
        primary_table_id: req.query.primary_table_id ? Number(req.query.primary_table_id) : undefined,
        tenant_customer_id: req.query.tenant_customer_id ? Number(req.query.tenant_customer_id) : undefined,
        from_date: req.query.from_date ? String(req.query.from_date) : undefined,
        to_date: req.query.to_date ? String(req.query.to_date) : undefined,
      };
      const items = await ReservationService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[ReservationController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch reservations' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await ReservationService.getById(Number(req.tenant.id), id);
      if (!item) { res.status(404).json({ error: 'Reservation not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[ReservationController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch reservation' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const { store_id, primary_table_id, guest_count, reserved_at } = req.body;
      if (!store_id || !primary_table_id || !guest_count || !reserved_at) {
        res.status(400).json({ error: 'store_id, primary_table_id, guest_count and reserved_at are required' });
        return;
      }
      const id = await ReservationService.create(tenantId, req.body);
      const item = await ReservationService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Reservation created successfully' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[ReservationController] create error:', error);
      res.status(500).json({ error: 'Failed to create reservation' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await ReservationService.update(tenantId, id, req.body);
      const item = await ReservationService.getById(tenantId, id);
      res.json({ data: item, message: 'Reservation updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[ReservationController] update error:', error);
      res.status(500).json({ error: 'Failed to update reservation' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await ReservationService.delete(Number(req.tenant.id), id);
      if (!deleted) { res.status(404).json({ error: 'Reservation not found' }); return; }
      res.json({ message: 'Reservation deleted successfully' });
    } catch (error: any) {
      console.error('[ReservationController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete reservation' });
    }
  }
}
