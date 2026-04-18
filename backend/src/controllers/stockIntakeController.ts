import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { StockIntakeService } from '../services/stockIntakeService.js';

export class StockIntakeController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = {
        store_id: req.query.store_id ? Number(req.query.store_id) : undefined,
        tenant_supplier_id: req.query.tenant_supplier_id ? Number(req.query.tenant_supplier_id) : undefined,
        supplier_invoice_id: req.query.supplier_invoice_id ? Number(req.query.supplier_invoice_id) : undefined,
        tenant_inventory_product_id: req.query.tenant_inventory_product_id ? Number(req.query.tenant_inventory_product_id) : undefined,
        status: req.query.status ? String(req.query.status) as any : undefined,
        from_date: req.query.from_date ? String(req.query.from_date) : undefined,
        to_date: req.query.to_date ? String(req.query.to_date) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      };
      const items = await StockIntakeService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[StockIntakeController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch stock intakes' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await StockIntakeService.getById(Number(req.tenant.id), id);
      if (!item) { res.status(404).json({ error: 'Stock intake not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[StockIntakeController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch stock intake' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = await StockIntakeService.create(tenantId, req.body);
      const item = await StockIntakeService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Stock intake created successfully' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[StockIntakeController] create error:', error);
      res.status(500).json({ error: 'Failed to create stock intake' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await StockIntakeService.update(tenantId, id, req.body);
      const item = await StockIntakeService.getById(tenantId, id);
      res.json({ data: item, message: 'Stock intake updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[StockIntakeController] update error:', error);
      res.status(500).json({ error: 'Failed to update stock intake' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await StockIntakeService.delete(Number(req.tenant.id), id);
      if (!deleted) { res.status(404).json({ error: 'Stock intake not found' }); return; }
      res.json({ message: 'Stock intake deleted successfully' });
    } catch (error: any) {
      console.error('[StockIntakeController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete stock intake' });
    }
  }
}
