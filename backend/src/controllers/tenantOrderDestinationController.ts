import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { TenantOrderDestinationService } from '../services/tenantOrderDestinationService.js';

export class TenantOrderDestinationController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = { is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined };
      const items = await TenantOrderDestinationService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantOrderDestinationController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch order destinations' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await TenantOrderDestinationService.getById(Number(req.tenant.id), id);
      if (!item) { res.status(404).json({ error: 'Order destination not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[TenantOrderDestinationController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch order destination' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      if (!req.body.code) { res.status(400).json({ error: 'Code is required' }); return; }
      const id = await TenantOrderDestinationService.create(tenantId, req.body);
      const item = await TenantOrderDestinationService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Order destination created successfully' });
    } catch (error: any) {
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantOrderDestinationController] create error:', error);
      res.status(500).json({ error: 'Failed to create order destination' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await TenantOrderDestinationService.update(tenantId, id, req.body);
      const item = await TenantOrderDestinationService.getById(tenantId, id);
      res.json({ data: item, message: 'Order destination updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantOrderDestinationController] update error:', error);
      res.status(500).json({ error: 'Failed to update order destination' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await TenantOrderDestinationService.delete(Number(req.tenant.id), id);
      if (!deleted) { res.status(404).json({ error: 'Order destination not found' }); return; }
      res.json({ message: 'Order destination deleted successfully' });
    } catch (error: any) {
      console.error('[TenantOrderDestinationController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete order destination' });
    }
  }

  static async getAvailableMaster(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const items = await TenantOrderDestinationService.getAvailableMaster(Number(req.tenant.id));
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantOrderDestinationController] getAvailableMaster error:', error);
      res.status(500).json({ error: 'Failed to fetch master order destinations' });
    }
  }

  static async importFromMaster(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const { master_ids } = req.body;
      if (!Array.isArray(master_ids) || master_ids.length === 0) {
        res.status(400).json({ error: 'master_ids array is required' }); return;
      }
      const result = await TenantOrderDestinationService.importFromMaster(Number(req.tenant.id), master_ids);
      res.json({ data: result, message: `Imported ${result.imported_count} order destinations` });
    } catch (error: any) {
      console.error('[TenantOrderDestinationController] importFromMaster error:', error);
      res.status(500).json({ error: 'Failed to import from master' });
    }
  }
}
