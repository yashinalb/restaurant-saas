import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { SupplierInvoiceService } from '../services/supplierInvoiceService.js';

export class SupplierInvoiceController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = {
        tenant_supplier_id: req.query.tenant_supplier_id ? Number(req.query.tenant_supplier_id) : undefined,
        stock_status: req.query.stock_status ? String(req.query.stock_status) as any : undefined,
        from_date: req.query.from_date ? String(req.query.from_date) : undefined,
        to_date: req.query.to_date ? String(req.query.to_date) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      };
      const items = await SupplierInvoiceService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[SupplierInvoiceController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch supplier invoices' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await SupplierInvoiceService.getById(Number(req.tenant.id), id);
      if (!item) { res.status(404).json({ error: 'Supplier invoice not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[SupplierInvoiceController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch supplier invoice' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = await SupplierInvoiceService.create(tenantId, req.body);
      const item = await SupplierInvoiceService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Supplier invoice created successfully' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[SupplierInvoiceController] create error:', error);
      res.status(500).json({ error: 'Failed to create supplier invoice' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await SupplierInvoiceService.update(tenantId, id, req.body);
      const item = await SupplierInvoiceService.getById(tenantId, id);
      res.json({ data: item, message: 'Supplier invoice updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[SupplierInvoiceController] update error:', error);
      res.status(500).json({ error: 'Failed to update supplier invoice' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await SupplierInvoiceService.delete(Number(req.tenant.id), id);
      if (!deleted) { res.status(404).json({ error: 'Supplier invoice not found' }); return; }
      res.json({ message: 'Supplier invoice deleted successfully' });
    } catch (error: any) {
      console.error('[SupplierInvoiceController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete supplier invoice' });
    }
  }
}
