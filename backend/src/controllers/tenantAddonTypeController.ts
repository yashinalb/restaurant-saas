import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { TenantAddonTypeService } from '../services/tenantAddonTypeService.js';

export class TenantAddonTypeController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = { is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined };
      const items = await TenantAddonTypeService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantAddonTypeController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch addon types' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await TenantAddonTypeService.getById(tenantId, id);
      if (!item) { res.status(404).json({ error: 'Addon type not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[TenantAddonTypeController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch addon type' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      if (!req.body.code) { res.status(400).json({ error: 'Code is required' }); return; }
      const id = await TenantAddonTypeService.create(tenantId, req.body);
      const item = await TenantAddonTypeService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Addon type created successfully' });
    } catch (error: any) {
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantAddonTypeController] create error:', error);
      res.status(500).json({ error: 'Failed to create addon type' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await TenantAddonTypeService.update(tenantId, id, req.body);
      const item = await TenantAddonTypeService.getById(tenantId, id);
      res.json({ data: item, message: 'Addon type updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantAddonTypeController] update error:', error);
      res.status(500).json({ error: 'Failed to update addon type' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await TenantAddonTypeService.delete(tenantId, id);
      if (!deleted) { res.status(404).json({ error: 'Addon type not found' }); return; }
      res.json({ message: 'Addon type deleted successfully' });
    } catch (error: any) {
      console.error('[TenantAddonTypeController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete addon type' });
    }
  }

  static async getAvailableMaster(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const items = await TenantAddonTypeService.getAvailableMaster(Number(req.tenant.id));
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantAddonTypeController] getAvailableMaster error:', error);
      res.status(500).json({ error: 'Failed to fetch master addon types' });
    }
  }

  static async importFromMaster(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const { master_ids } = req.body;
      if (!Array.isArray(master_ids) || master_ids.length === 0) {
        res.status(400).json({ error: 'master_ids array is required' }); return;
      }
      const result = await TenantAddonTypeService.importFromMaster(Number(req.tenant.id), master_ids);
      res.json({ data: result, message: `Imported ${result.imported_count} addon types` });
    } catch (error: any) {
      console.error('[TenantAddonTypeController] importFromMaster error:', error);
      res.status(500).json({ error: 'Failed to import from master' });
    }
  }
}
