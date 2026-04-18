import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { TenantInventoryProductService } from '../services/tenantInventoryProductService.js';

export class TenantInventoryProductController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = {
        is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
        low_stock: req.query.low_stock === 'true',
        supplier_id: req.query.supplier_id ? Number(req.query.supplier_id) : undefined,
      };
      const items = await TenantInventoryProductService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantInventoryProductController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch inventory products' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await TenantInventoryProductService.getById(Number(req.tenant.id), id);
      if (!item) { res.status(404).json({ error: 'Inventory product not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[TenantInventoryProductController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch inventory product' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = await TenantInventoryProductService.create(tenantId, req.body);
      const item = await TenantInventoryProductService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Inventory product created successfully' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantInventoryProductController] create error:', error);
      res.status(500).json({ error: 'Failed to create inventory product' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await TenantInventoryProductService.update(tenantId, id, req.body);
      const item = await TenantInventoryProductService.getById(tenantId, id);
      res.json({ data: item, message: 'Inventory product updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[TenantInventoryProductController] update error:', error);
      res.status(500).json({ error: 'Failed to update inventory product' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await TenantInventoryProductService.delete(Number(req.tenant.id), id);
      if (!deleted) { res.status(404).json({ error: 'Inventory product not found' }); return; }
      res.json({ message: 'Inventory product deleted successfully' });
    } catch (error: any) {
      console.error('[TenantInventoryProductController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete inventory product' });
    }
  }
}
