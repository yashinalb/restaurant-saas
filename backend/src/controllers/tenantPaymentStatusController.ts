import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { TenantPaymentStatusService } from '../services/tenantPaymentStatusService.js';

export class TenantPaymentStatusController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = { is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined };
      const items = await TenantPaymentStatusService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantPaymentStatusController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch payment statuses' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await TenantPaymentStatusService.getById(tenantId, id);
      if (!item) { res.status(404).json({ error: 'Payment status not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[TenantPaymentStatusController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch payment status' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      if (!req.body.code) { res.status(400).json({ error: 'Code is required' }); return; }
      const id = await TenantPaymentStatusService.create(tenantId, req.body);
      const item = await TenantPaymentStatusService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Payment status created successfully' });
    } catch (error: any) {
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantPaymentStatusController] create error:', error);
      res.status(500).json({ error: 'Failed to create payment status' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await TenantPaymentStatusService.update(tenantId, id, req.body);
      const item = await TenantPaymentStatusService.getById(tenantId, id);
      res.json({ data: item, message: 'Payment status updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantPaymentStatusController] update error:', error);
      res.status(500).json({ error: 'Failed to update payment status' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await TenantPaymentStatusService.delete(tenantId, id);
      if (!deleted) { res.status(404).json({ error: 'Payment status not found' }); return; }
      res.json({ message: 'Payment status deleted successfully' });
    } catch (error: any) {
      console.error('[TenantPaymentStatusController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete payment status' });
    }
  }

  static async getAvailableMaster(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const items = await TenantPaymentStatusService.getAvailableMaster(Number(req.tenant.id));
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantPaymentStatusController] getAvailableMaster error:', error);
      res.status(500).json({ error: 'Failed to fetch master payment statuses' });
    }
  }

  static async importFromMaster(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const { master_ids } = req.body;
      if (!Array.isArray(master_ids) || master_ids.length === 0) {
        res.status(400).json({ error: 'master_ids array is required' }); return;
      }
      const result = await TenantPaymentStatusService.importFromMaster(Number(req.tenant.id), master_ids);
      res.json({ data: result, message: `Imported ${result.imported_count} payment statuses` });
    } catch (error: any) {
      console.error('[TenantPaymentStatusController] importFromMaster error:', error);
      res.status(500).json({ error: 'Failed to import from master' });
    }
  }
}
