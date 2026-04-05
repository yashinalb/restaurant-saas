import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { StoreService } from '../services/storeService.js';

export class StoreController {
  /**
   * GET /api/tenant/stores
   */
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      const tenantId = Number(req.tenant.id);
      const filters = {
        is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      };
      const stores = await StoreService.getAll(tenantId, filters);
      res.json({ data: stores });
    } catch (error: any) {
      console.error('[StoreController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch stores' });
    }
  }

  /**
   * GET /api/tenant/stores/:id
   */
  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid ID' });
        return;
      }

      const store = await StoreService.getById(tenantId, id);
      if (!store) {
        res.status(404).json({ error: 'Store not found' });
        return;
      }

      res.json({ data: store });
    } catch (error: any) {
      console.error('[StoreController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch store' });
    }
  }

  /**
   * POST /api/tenant/stores
   */
  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      const tenantId = Number(req.tenant.id);

      if (!req.body.name || !req.body.slug) {
        res.status(400).json({ error: 'Name and slug are required' });
        return;
      }

      const id = await StoreService.create(tenantId, req.body);
      const store = await StoreService.getById(tenantId, id);
      res.status(201).json({ data: store });
    } catch (error: any) {
      if (error.status === 409) {
        res.status(409).json({ error: error.message });
        return;
      }
      console.error('[StoreController] create error:', error);
      res.status(500).json({ error: 'Failed to create store' });
    }
  }

  /**
   * PUT /api/tenant/stores/:id
   */
  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid ID' });
        return;
      }

      await StoreService.update(tenantId, id, req.body);
      const store = await StoreService.getById(tenantId, id);
      res.json({ data: store });
    } catch (error: any) {
      if (error.status === 404) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.status === 409) {
        res.status(409).json({ error: error.message });
        return;
      }
      console.error('[StoreController] update error:', error);
      res.status(500).json({ error: 'Failed to update store' });
    }
  }

  /**
   * DELETE /api/tenant/stores/:id
   */
  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid ID' });
        return;
      }

      const deleted = await StoreService.delete(tenantId, id);
      if (!deleted) {
        res.status(404).json({ error: 'Store not found' });
        return;
      }

      res.json({ message: 'Store deleted successfully' });
    } catch (error: any) {
      console.error('[StoreController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete store' });
    }
  }
}
