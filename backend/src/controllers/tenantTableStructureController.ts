import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { TenantTableStructureService } from '../services/tenantTableStructureService.js';

export class TenantTableStructureController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = {
        is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
        store_id: req.query.store_id ? parseInt(req.query.store_id as string) : undefined,
        tenant_seating_area_id: req.query.tenant_seating_area_id ? parseInt(req.query.tenant_seating_area_id as string) : undefined,
        status: req.query.status as string | undefined,
      };
      const items = await TenantTableStructureService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantTableStructureController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch tables' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await TenantTableStructureService.getById(Number(req.tenant.id), id);
      if (!item) { res.status(404).json({ error: 'Table not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[TenantTableStructureController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch table' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      if (!req.body.store_id) { res.status(400).json({ error: 'Store is required' }); return; }
      if (!req.body.name) { res.status(400).json({ error: 'Name is required' }); return; }
      const id = await TenantTableStructureService.create(tenantId, req.body);
      const item = await TenantTableStructureService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Table created successfully' });
    } catch (error: any) {
      console.error('[TenantTableStructureController] create error:', error);
      res.status(500).json({ error: 'Failed to create table' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await TenantTableStructureService.update(tenantId, id, req.body);
      const item = await TenantTableStructureService.getById(tenantId, id);
      res.json({ data: item, message: 'Table updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      console.error('[TenantTableStructureController] update error:', error);
      res.status(500).json({ error: 'Failed to update table' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await TenantTableStructureService.delete(Number(req.tenant.id), id);
      if (!deleted) { res.status(404).json({ error: 'Table not found' }); return; }
      res.json({ message: 'Table deleted successfully' });
    } catch (error: any) {
      console.error('[TenantTableStructureController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete table' });
    }
  }
}
