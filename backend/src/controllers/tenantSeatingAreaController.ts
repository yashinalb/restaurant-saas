import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { TenantSeatingAreaService } from '../services/tenantSeatingAreaService.js';

export class TenantSeatingAreaController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = {
        is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
        store_id: req.query.store_id ? parseInt(req.query.store_id as string) : undefined,
      };
      const items = await TenantSeatingAreaService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantSeatingAreaController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch seating areas' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await TenantSeatingAreaService.getById(Number(req.tenant.id), id);
      if (!item) { res.status(404).json({ error: 'Seating area not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[TenantSeatingAreaController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch seating area' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      if (!req.body.store_id) { res.status(400).json({ error: 'Store is required' }); return; }
      const id = await TenantSeatingAreaService.create(tenantId, req.body);
      const item = await TenantSeatingAreaService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Seating area created successfully' });
    } catch (error: any) {
      console.error('[TenantSeatingAreaController] create error:', error);
      res.status(500).json({ error: 'Failed to create seating area' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await TenantSeatingAreaService.update(tenantId, id, req.body);
      const item = await TenantSeatingAreaService.getById(tenantId, id);
      res.json({ data: item, message: 'Seating area updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      console.error('[TenantSeatingAreaController] update error:', error);
      res.status(500).json({ error: 'Failed to update seating area' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await TenantSeatingAreaService.delete(Number(req.tenant.id), id);
      if (!deleted) { res.status(404).json({ error: 'Seating area not found' }); return; }
      res.json({ message: 'Seating area deleted successfully' });
    } catch (error: any) {
      console.error('[TenantSeatingAreaController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete seating area' });
    }
  }
}
