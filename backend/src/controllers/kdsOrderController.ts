import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { KdsOrderService } from '../services/kdsOrderService.js';

export class KdsOrderController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = {
        store_id: req.query.store_id ? Number(req.query.store_id) : undefined,
        tenant_order_destination_id: req.query.tenant_order_destination_id ? Number(req.query.tenant_order_destination_id) : undefined,
        status: req.query.status ? String(req.query.status) as any : undefined,
        order_id: req.query.order_id ? Number(req.query.order_id) : undefined,
        active_only: req.query.active_only === 'true',
        from_date: req.query.from_date ? String(req.query.from_date) : undefined,
        to_date: req.query.to_date ? String(req.query.to_date) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      };
      const items = await KdsOrderService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[KdsOrderController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch KDS orders' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await KdsOrderService.getById(Number(req.tenant.id), id);
      if (!item) { res.status(404).json({ error: 'KDS order not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[KdsOrderController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch KDS order' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = await KdsOrderService.create(tenantId, req.body);
      const item = await KdsOrderService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'KDS order created successfully' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[KdsOrderController] create error:', error);
      res.status(500).json({ error: 'Failed to create KDS order' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await KdsOrderService.update(tenantId, id, req.body);
      const item = await KdsOrderService.getById(tenantId, id);
      res.json({ data: item, message: 'KDS order updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[KdsOrderController] update error:', error);
      res.status(500).json({ error: 'Failed to update KDS order' });
    }
  }

  static async updateStatus(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const { status } = req.body;
      if (!status) { res.status(400).json({ error: 'status is required' }); return; }
      await KdsOrderService.updateStatus(tenantId, id, status);
      const item = await KdsOrderService.getById(tenantId, id);
      res.json({ data: item, message: 'Status updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[KdsOrderController] updateStatus error:', error);
      res.status(500).json({ error: 'Failed to update status' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await KdsOrderService.delete(Number(req.tenant.id), id);
      if (!deleted) { res.status(404).json({ error: 'KDS order not found' }); return; }
      res.json({ message: 'KDS order deleted successfully' });
    } catch (error: any) {
      console.error('[KdsOrderController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete KDS order' });
    }
  }
}
