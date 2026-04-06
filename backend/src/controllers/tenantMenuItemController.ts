import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { TenantMenuItemService } from '../services/tenantMenuItemService.js';

export class TenantMenuItemController {
  static async getAll(_req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!_req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(_req.tenant.id);
      const filters = {
        is_active: _req.query.is_active !== undefined ? _req.query.is_active === 'true' : undefined,
        tenant_menu_category_id: _req.query.tenant_menu_category_id ? parseInt(_req.query.tenant_menu_category_id as string) : undefined,
        is_combo: _req.query.is_combo !== undefined ? _req.query.is_combo === 'true' : undefined,
      };
      const items = await TenantMenuItemService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantMenuItemController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch menu items' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await TenantMenuItemService.getById(tenantId, id);
      if (!item) { res.status(404).json({ error: 'Menu item not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[TenantMenuItemController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch menu item' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = await TenantMenuItemService.create(tenantId, req.body);
      const item = await TenantMenuItemService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Menu item created successfully' });
    } catch (error: any) {
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantMenuItemController] create error:', error);
      res.status(500).json({ error: 'Failed to create menu item' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await TenantMenuItemService.update(tenantId, id, req.body);
      const item = await TenantMenuItemService.getById(tenantId, id);
      res.json({ data: item, message: 'Menu item updated successfully' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantMenuItemController] update error:', error);
      res.status(500).json({ error: 'Failed to update menu item' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await TenantMenuItemService.delete(tenantId, id);
      if (!deleted) { res.status(404).json({ error: 'Menu item not found' }); return; }
      res.json({ message: 'Menu item deleted successfully' });
    } catch (error: any) {
      console.error('[TenantMenuItemController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete menu item' });
    }
  }
}
