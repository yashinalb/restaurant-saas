import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { CashRegisterSessionService } from '../services/cashRegisterSessionService.js';

export class CashRegisterSessionController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = {
        store_id: req.query.store_id ? Number(req.query.store_id) : undefined,
        currency_id: req.query.currency_id ? Number(req.query.currency_id) : undefined,
        status: req.query.status ? String(req.query.status) as any : undefined,
        opened_by: req.query.opened_by ? Number(req.query.opened_by) : undefined,
        from_date: req.query.from_date ? String(req.query.from_date) : undefined,
        to_date: req.query.to_date ? String(req.query.to_date) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      };
      const items = await CashRegisterSessionService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[CashRegisterSessionController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch cash register sessions' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await CashRegisterSessionService.getById(Number(req.tenant.id), id);
      if (!item) { res.status(404).json({ error: 'Session not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[CashRegisterSessionController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch session' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant || !req.admin) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const payload = { ...req.body, opened_by: req.body.opened_by ?? Number(req.admin.id) };
      const id = await CashRegisterSessionService.create(tenantId, payload);
      const item = await CashRegisterSessionService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Cash register session opened successfully' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[CashRegisterSessionController] create error:', error);
      res.status(500).json({ error: 'Failed to open session' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await CashRegisterSessionService.update(tenantId, id, req.body);
      const item = await CashRegisterSessionService.getById(tenantId, id);
      res.json({ data: item, message: 'Session updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[CashRegisterSessionController] update error:', error);
      res.status(500).json({ error: 'Failed to update session' });
    }
  }

  static async close(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant || !req.admin) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const payload = { ...req.body, closed_by: req.body.closed_by ?? Number(req.admin.id) };
      await CashRegisterSessionService.close(tenantId, id, payload);
      const item = await CashRegisterSessionService.getById(tenantId, id);
      res.json({ data: item, message: 'Session closed successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[CashRegisterSessionController] close error:', error);
      res.status(500).json({ error: 'Failed to close session' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await CashRegisterSessionService.delete(Number(req.tenant.id), id);
      if (!deleted) { res.status(404).json({ error: 'Session not found' }); return; }
      res.json({ message: 'Session deleted successfully' });
    } catch (error: any) {
      console.error('[CashRegisterSessionController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete session' });
    }
  }
}
