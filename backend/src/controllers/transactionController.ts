import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { TransactionService } from '../services/transactionService.js';

export class TransactionController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = {
        store_id: req.query.store_id ? Number(req.query.store_id) : undefined,
        order_id: req.query.order_id ? Number(req.query.order_id) : undefined,
        tenant_payment_status_id: req.query.tenant_payment_status_id ? Number(req.query.tenant_payment_status_id) : undefined,
        from_date: req.query.from_date ? String(req.query.from_date) : undefined,
        to_date: req.query.to_date ? String(req.query.to_date) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      };
      const items = await TransactionService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TransactionController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await TransactionService.getById(Number(req.tenant.id), id);
      if (!item) { res.status(404).json({ error: 'Transaction not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[TransactionController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch transaction' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = await TransactionService.create(tenantId, req.body);
      const item = await TransactionService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Transaction created successfully' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[TransactionController] create error:', error);
      res.status(500).json({ error: 'Failed to create transaction' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await TransactionService.update(tenantId, id, req.body);
      const item = await TransactionService.getById(tenantId, id);
      res.json({ data: item, message: 'Transaction updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[TransactionController] update error:', error);
      res.status(500).json({ error: 'Failed to update transaction' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await TransactionService.delete(Number(req.tenant.id), id);
      if (!deleted) { res.status(404).json({ error: 'Transaction not found' }); return; }
      res.json({ message: 'Transaction deleted successfully' });
    } catch (error: any) {
      console.error('[TransactionController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete transaction' });
    }
  }
}
