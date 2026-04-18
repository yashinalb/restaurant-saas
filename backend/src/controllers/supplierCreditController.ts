import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { SupplierCreditService } from '../services/supplierCreditService.js';

export class SupplierCreditController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = {
        tenant_supplier_id: req.query.tenant_supplier_id ? Number(req.query.tenant_supplier_id) : undefined,
        supplier_invoice_id: req.query.supplier_invoice_id ? Number(req.query.supplier_invoice_id) : undefined,
        unpaid_only: req.query.unpaid_only === 'true',
        from_date: req.query.from_date ? String(req.query.from_date) : undefined,
        to_date: req.query.to_date ? String(req.query.to_date) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      };
      const items = await SupplierCreditService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[SupplierCreditController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch supplier credits' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await SupplierCreditService.getById(Number(req.tenant.id), id);
      if (!item) { res.status(404).json({ error: 'Supplier credit not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[SupplierCreditController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch supplier credit' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = await SupplierCreditService.create(tenantId, req.body);
      const item = await SupplierCreditService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Supplier credit created successfully' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[SupplierCreditController] create error:', error);
      res.status(500).json({ error: 'Failed to create supplier credit' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await SupplierCreditService.update(tenantId, id, req.body);
      const item = await SupplierCreditService.getById(tenantId, id);
      res.json({ data: item, message: 'Supplier credit updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[SupplierCreditController] update error:', error);
      res.status(500).json({ error: 'Failed to update supplier credit' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await SupplierCreditService.delete(Number(req.tenant.id), id);
      if (!deleted) { res.status(404).json({ error: 'Supplier credit not found' }); return; }
      res.json({ message: 'Supplier credit deleted successfully' });
    } catch (error: any) {
      console.error('[SupplierCreditController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete supplier credit' });
    }
  }

  static async addPayment(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const creditId = parseInt(req.params.id);
      if (isNaN(creditId)) { res.status(400).json({ error: 'Invalid credit ID' }); return; }
      const paymentId = await SupplierCreditService.addPayment(tenantId, creditId, req.body);
      const item = await SupplierCreditService.getById(tenantId, creditId);
      res.status(201).json({ data: item, payment_id: paymentId, message: 'Payment recorded successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[SupplierCreditController] addPayment error:', error);
      res.status(500).json({ error: 'Failed to record payment' });
    }
  }

  static async deletePayment(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const paymentId = parseInt(req.params.paymentId);
      if (isNaN(paymentId)) { res.status(400).json({ error: 'Invalid payment ID' }); return; }
      const deleted = await SupplierCreditService.deletePayment(tenantId, paymentId);
      if (!deleted) { res.status(404).json({ error: 'Payment not found' }); return; }
      res.json({ message: 'Payment deleted successfully' });
    } catch (error: any) {
      console.error('[SupplierCreditController] deletePayment error:', error);
      res.status(500).json({ error: 'Failed to delete payment' });
    }
  }
}
