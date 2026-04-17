import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { TenantOrderSourceService } from '../services/tenantOrderSourceService.js';

export class TenantOrderSourceController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = { is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined };
      const items = await TenantOrderSourceService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantOrderSourceController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch order sources' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await TenantOrderSourceService.getById(tenantId, id);
      if (!item) { res.status(404).json({ error: 'Order source not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[TenantOrderSourceController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch order source' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      if (!req.body.code) { res.status(400).json({ error: 'Code is required' }); return; }
      const id = await TenantOrderSourceService.create(tenantId, req.body);
      const item = await TenantOrderSourceService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Order source created successfully' });
    } catch (error: any) {
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantOrderSourceController] create error:', error);
      res.status(500).json({ error: 'Failed to create order source' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await TenantOrderSourceService.update(tenantId, id, req.body);
      const item = await TenantOrderSourceService.getById(tenantId, id);
      res.json({ data: item, message: 'Order source updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantOrderSourceController] update error:', error);
      res.status(500).json({ error: 'Failed to update order source' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await TenantOrderSourceService.delete(tenantId, id);
      if (!deleted) { res.status(404).json({ error: 'Order source not found' }); return; }
      res.json({ message: 'Order source deleted successfully' });
    } catch (error: any) {
      console.error('[TenantOrderSourceController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete order source' });
    }
  }

  static async getAvailableMaster(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const items = await TenantOrderSourceService.getAvailableMaster(Number(req.tenant.id));
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantOrderSourceController] getAvailableMaster error:', error);
      res.status(500).json({ error: 'Failed to fetch master order sources' });
    }
  }

  static async importFromMaster(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const { master_ids } = req.body;
      if (!Array.isArray(master_ids) || master_ids.length === 0) {
        res.status(400).json({ error: 'master_ids array is required' }); return;
      }
      const result = await TenantOrderSourceService.importFromMaster(Number(req.tenant.id), master_ids);
      res.json({ data: result, message: `Imported ${result.imported_count} order sources` });
    } catch (error: any) {
      console.error('[TenantOrderSourceController] importFromMaster error:', error);
      res.status(500).json({ error: 'Failed to import from master' });
    }
  }
}
