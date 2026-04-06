import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { TenantWaiterService } from '../services/tenantWaiterService.js';

export class TenantWaiterController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = {
        is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
        store_id: req.query.store_id ? parseInt(req.query.store_id as string) : undefined,
      };
      const items = await TenantWaiterService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantWaiterController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch waiters' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await TenantWaiterService.getById(Number(req.tenant.id), id);
      if (!item) { res.status(404).json({ error: 'Waiter not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[TenantWaiterController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch waiter' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      if (!req.body.name) { res.status(400).json({ error: 'Name is required' }); return; }
      if (!req.body.pin) { res.status(400).json({ error: 'PIN is required' }); return; }
      const id = await TenantWaiterService.create(tenantId, req.body);
      const item = await TenantWaiterService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Waiter created successfully' });
    } catch (error: any) {
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantWaiterController] create error:', error);
      res.status(500).json({ error: 'Failed to create waiter' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await TenantWaiterService.update(tenantId, id, req.body);
      const item = await TenantWaiterService.getById(tenantId, id);
      res.json({ data: item, message: 'Waiter updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantWaiterController] update error:', error);
      res.status(500).json({ error: 'Failed to update waiter' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await TenantWaiterService.delete(Number(req.tenant.id), id);
      if (!deleted) { res.status(404).json({ error: 'Waiter not found' }); return; }
      res.json({ message: 'Waiter deleted successfully' });
    } catch (error: any) {
      console.error('[TenantWaiterController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete waiter' });
    }
  }
}
