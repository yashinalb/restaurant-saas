import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { TenantSupplierService } from '../services/tenantSupplierService.js';

export class TenantSupplierController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = {
        is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
      };
      const items = await TenantSupplierService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantSupplierController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await TenantSupplierService.getById(Number(req.tenant.id), id);
      if (!item) { res.status(404).json({ error: 'Supplier not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[TenantSupplierController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch supplier' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = await TenantSupplierService.create(tenantId, req.body);
      const item = await TenantSupplierService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Supplier created successfully' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[TenantSupplierController] create error:', error);
      res.status(500).json({ error: 'Failed to create supplier' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await TenantSupplierService.update(tenantId, id, req.body);
      const item = await TenantSupplierService.getById(tenantId, id);
      res.json({ data: item, message: 'Supplier updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[TenantSupplierController] update error:', error);
      res.status(500).json({ error: 'Failed to update supplier' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await TenantSupplierService.delete(Number(req.tenant.id), id);
      if (!deleted) { res.status(404).json({ error: 'Supplier not found' }); return; }
      res.json({ message: 'Supplier deleted successfully' });
    } catch (error: any) {
      console.error('[TenantSupplierController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete supplier' });
    }
  }
}
