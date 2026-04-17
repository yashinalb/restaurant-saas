import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { TenantOrderItemStatusService } from '../services/tenantOrderItemStatusService.js';

export class TenantOrderItemStatusController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = { is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined };
      const items = await TenantOrderItemStatusService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantOrderItemStatusController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch order item statuses' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await TenantOrderItemStatusService.getById(tenantId, id);
      if (!item) { res.status(404).json({ error: 'Order item status not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[TenantOrderItemStatusController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch order item status' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      if (!req.body.code) { res.status(400).json({ error: 'Code is required' }); return; }
      const id = await TenantOrderItemStatusService.create(tenantId, req.body);
      const item = await TenantOrderItemStatusService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Order item status created successfully' });
    } catch (error: any) {
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantOrderItemStatusController] create error:', error);
      res.status(500).json({ error: 'Failed to create order item status' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await TenantOrderItemStatusService.update(tenantId, id, req.body);
      const item = await TenantOrderItemStatusService.getById(tenantId, id);
      res.json({ data: item, message: 'Order item status updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantOrderItemStatusController] update error:', error);
      res.status(500).json({ error: 'Failed to update order item status' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await TenantOrderItemStatusService.delete(tenantId, id);
      if (!deleted) { res.status(404).json({ error: 'Order item status not found' }); return; }
      res.json({ message: 'Order item status deleted successfully' });
    } catch (error: any) {
      console.error('[TenantOrderItemStatusController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete order item status' });
    }
  }

  static async getAvailableMaster(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const items = await TenantOrderItemStatusService.getAvailableMaster(Number(req.tenant.id));
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantOrderItemStatusController] getAvailableMaster error:', error);
      res.status(500).json({ error: 'Failed to fetch master order item statuses' });
    }
  }

  static async importFromMaster(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const { master_ids } = req.body;
      if (!Array.isArray(master_ids) || master_ids.length === 0) {
        res.status(400).json({ error: 'master_ids array is required' }); return;
      }
      const result = await TenantOrderItemStatusService.importFromMaster(Number(req.tenant.id), master_ids);
      res.json({ data: result, message: `Imported ${result.imported_count} order item statuses` });
    } catch (error: any) {
      console.error('[TenantOrderItemStatusController] importFromMaster error:', error);
      res.status(500).json({ error: 'Failed to import from master' });
    }
  }
}
