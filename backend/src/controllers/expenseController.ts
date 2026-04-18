import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { ExpenseService } from '../services/expenseService.js';

export class ExpenseController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = {
        store_id: req.query.store_id ? Number(req.query.store_id) : undefined,
        tenant_expense_source_id: req.query.tenant_expense_source_id ? Number(req.query.tenant_expense_source_id) : undefined,
        payment_status: req.query.payment_status ? String(req.query.payment_status) as any : undefined,
        from_date: req.query.from_date ? String(req.query.from_date) : undefined,
        to_date: req.query.to_date ? String(req.query.to_date) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
        overdue_only: req.query.overdue_only === 'true',
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      };
      const items = await ExpenseService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[ExpenseController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch expenses' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await ExpenseService.getById(Number(req.tenant.id), id);
      if (!item) { res.status(404).json({ error: 'Expense not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[ExpenseController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch expense' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant || !req.admin) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      // Auto-inject created_by from the authenticated user
      const payload = { ...req.body, created_by: req.body.created_by ?? Number(req.admin.id) };
      const id = await ExpenseService.create(tenantId, payload);
      const item = await ExpenseService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Expense created successfully' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[ExpenseController] create error:', error);
      res.status(500).json({ error: 'Failed to create expense' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await ExpenseService.update(tenantId, id, req.body);
      const item = await ExpenseService.getById(tenantId, id);
      res.json({ data: item, message: 'Expense updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[ExpenseController] update error:', error);
      res.status(500).json({ error: 'Failed to update expense' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await ExpenseService.delete(Number(req.tenant.id), id);
      if (!deleted) { res.status(404).json({ error: 'Expense not found' }); return; }
      res.json({ message: 'Expense deleted successfully' });
    } catch (error: any) {
      console.error('[ExpenseController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete expense' });
    }
  }

  static async addPayment(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant || !req.admin) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const expenseId = parseInt(req.params.id);
      if (isNaN(expenseId)) { res.status(400).json({ error: 'Invalid expense ID' }); return; }
      const payload = { ...req.body, paid_by: req.body.paid_by ?? Number(req.admin.id) };
      const paymentId = await ExpenseService.addPayment(tenantId, expenseId, payload);
      const item = await ExpenseService.getById(tenantId, expenseId);
      res.status(201).json({ data: item, payment_id: paymentId, message: 'Payment recorded successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[ExpenseController] addPayment error:', error);
      res.status(500).json({ error: 'Failed to record payment' });
    }
  }

  static async deletePayment(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const paymentId = parseInt(req.params.paymentId);
      if (isNaN(paymentId)) { res.status(400).json({ error: 'Invalid payment ID' }); return; }
      const deleted = await ExpenseService.deletePayment(tenantId, paymentId);
      if (!deleted) { res.status(404).json({ error: 'Payment not found' }); return; }
      res.json({ message: 'Payment deleted successfully' });
    } catch (error: any) {
      console.error('[ExpenseController] deletePayment error:', error);
      res.status(500).json({ error: 'Failed to delete payment' });
    }
  }
}
