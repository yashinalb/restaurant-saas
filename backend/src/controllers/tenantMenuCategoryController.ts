import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { TenantMenuCategoryService } from '../services/tenantMenuCategoryService.js';

export class TenantMenuCategoryController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = {
        is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
        store_id: req.query.store_id ? parseInt(req.query.store_id as string) : undefined,
      };
      const items = await TenantMenuCategoryService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantMenuCategoryController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch menu categories' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await TenantMenuCategoryService.getById(tenantId, id);
      if (!item) { res.status(404).json({ error: 'Menu category not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[TenantMenuCategoryController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch menu category' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      if (!req.body.slug) { res.status(400).json({ error: 'Slug is required' }); return; }
      const id = await TenantMenuCategoryService.create(tenantId, req.body);
      const item = await TenantMenuCategoryService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Menu category created successfully' });
    } catch (error: any) {
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantMenuCategoryController] create error:', error);
      res.status(500).json({ error: 'Failed to create menu category' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await TenantMenuCategoryService.update(tenantId, id, req.body);
      const item = await TenantMenuCategoryService.getById(tenantId, id);
      res.json({ data: item, message: 'Menu category updated successfully' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantMenuCategoryController] update error:', error);
      res.status(500).json({ error: 'Failed to update menu category' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await TenantMenuCategoryService.delete(tenantId, id);
      if (!deleted) { res.status(404).json({ error: 'Menu category not found' }); return; }
      res.json({ message: 'Menu category deleted successfully' });
    } catch (error: any) {
      console.error('[TenantMenuCategoryController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete menu category' });
    }
  }

  static async getAvailableMaster(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const items = await TenantMenuCategoryService.getAvailableMaster(tenantId);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantMenuCategoryController] getAvailableMaster error:', error);
      res.status(500).json({ error: 'Failed to fetch master categories' });
    }
  }

  static async importFromMaster(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const { master_ids } = req.body;
      if (!Array.isArray(master_ids) || master_ids.length === 0) {
        res.status(400).json({ error: 'master_ids array is required' }); return;
      }
      const result = await TenantMenuCategoryService.importFromMaster(tenantId, master_ids);
      res.json({ data: result, message: `Imported ${result.imported_count} categories` });
    } catch (error: any) {
      console.error('[TenantMenuCategoryController] importFromMaster error:', error);
      res.status(500).json({ error: 'Failed to import from master' });
    }
  }
}
