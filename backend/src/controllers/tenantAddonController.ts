import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { TenantAddonService } from '../services/tenantAddonService.js';

export class TenantAddonController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = {
        is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
        tenant_addon_type_id: req.query.tenant_addon_type_id ? parseInt(req.query.tenant_addon_type_id as string) : undefined,
      };
      const items = await TenantAddonService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantAddonController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch addons' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await TenantAddonService.getById(tenantId, id);
      if (!item) { res.status(404).json({ error: 'Addon not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[TenantAddonController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch addon' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      if (!req.body.tenant_addon_type_id) { res.status(400).json({ error: 'Addon type is required' }); return; }
      const id = await TenantAddonService.create(tenantId, req.body);
      const item = await TenantAddonService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Addon created successfully' });
    } catch (error: any) {
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantAddonController] create error:', error);
      res.status(500).json({ error: 'Failed to create addon' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await TenantAddonService.update(tenantId, id, req.body);
      const item = await TenantAddonService.getById(tenantId, id);
      res.json({ data: item, message: 'Addon updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantAddonController] update error:', error);
      res.status(500).json({ error: 'Failed to update addon' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await TenantAddonService.delete(tenantId, id);
      if (!deleted) { res.status(404).json({ error: 'Addon not found' }); return; }
      res.json({ message: 'Addon deleted successfully' });
    } catch (error: any) {
      console.error('[TenantAddonController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete addon' });
    }
  }

  static async getAvailableMaster(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const items = await TenantAddonService.getAvailableMaster(Number(req.tenant.id));
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantAddonController] getAvailableMaster error:', error);
      res.status(500).json({ error: 'Failed to fetch master addons' });
    }
  }

  static async importFromMaster(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const { master_ids } = req.body;
      if (!Array.isArray(master_ids) || master_ids.length === 0) {
        res.status(400).json({ error: 'master_ids array is required' }); return;
      }
      const result = await TenantAddonService.importFromMaster(Number(req.tenant.id), master_ids);
      res.json({ data: result, message: `Imported ${result.imported_count} addons` });
    } catch (error: any) {
      console.error('[TenantAddonController] importFromMaster error:', error);
      res.status(500).json({ error: 'Failed to import from master' });
    }
  }
}
