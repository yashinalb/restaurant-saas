import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { TenantOrderTypeService } from '../services/tenantOrderTypeService.js';

export class TenantOrderTypeController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = { is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined };
      const items = await TenantOrderTypeService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantOrderTypeController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch order types' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await TenantOrderTypeService.getById(tenantId, id);
      if (!item) { res.status(404).json({ error: 'Order type not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[TenantOrderTypeController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch order type' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      if (!req.body.code) { res.status(400).json({ error: 'Code is required' }); return; }
      const id = await TenantOrderTypeService.create(tenantId, req.body);
      const item = await TenantOrderTypeService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Order type created successfully' });
    } catch (error: any) {
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantOrderTypeController] create error:', error);
      res.status(500).json({ error: 'Failed to create order type' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await TenantOrderTypeService.update(tenantId, id, req.body);
      const item = await TenantOrderTypeService.getById(tenantId, id);
      res.json({ data: item, message: 'Order type updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantOrderTypeController] update error:', error);
      res.status(500).json({ error: 'Failed to update order type' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await TenantOrderTypeService.delete(tenantId, id);
      if (!deleted) { res.status(404).json({ error: 'Order type not found' }); return; }
      res.json({ message: 'Order type deleted successfully' });
    } catch (error: any) {
      console.error('[TenantOrderTypeController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete order type' });
    }
  }

  static async getAvailableMaster(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const items = await TenantOrderTypeService.getAvailableMaster(Number(req.tenant.id));
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantOrderTypeController] getAvailableMaster error:', error);
      res.status(500).json({ error: 'Failed to fetch master order types' });
    }
  }

  static async importFromMaster(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const { master_ids } = req.body;
      if (!Array.isArray(master_ids) || master_ids.length === 0) {
        res.status(400).json({ error: 'master_ids array is required' }); return;
      }
      const result = await TenantOrderTypeService.importFromMaster(Number(req.tenant.id), master_ids);
      res.json({ data: result, message: `Imported ${result.imported_count} order types` });
    } catch (error: any) {
      console.error('[TenantOrderTypeController] importFromMaster error:', error);
      res.status(500).json({ error: 'Failed to import from master' });
    }
  }
}
