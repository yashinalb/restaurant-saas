import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { TenantExpenseSourceService } from '../services/tenantExpenseSourceService.js';

export class TenantExpenseSourceController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = {
        is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
        tenant_expense_category_id: req.query.tenant_expense_category_id ? Number(req.query.tenant_expense_category_id) : undefined,
      };
      const items = await TenantExpenseSourceService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantExpenseSourceController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch expense sources' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await TenantExpenseSourceService.getById(Number(req.tenant.id), id);
      if (!item) { res.status(404).json({ error: 'Expense source not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[TenantExpenseSourceController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch expense source' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = await TenantExpenseSourceService.create(tenantId, req.body);
      const item = await TenantExpenseSourceService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Expense source created successfully' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[TenantExpenseSourceController] create error:', error);
      res.status(500).json({ error: 'Failed to create expense source' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await TenantExpenseSourceService.update(tenantId, id, req.body);
      const item = await TenantExpenseSourceService.getById(tenantId, id);
      res.json({ data: item, message: 'Expense source updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[TenantExpenseSourceController] update error:', error);
      res.status(500).json({ error: 'Failed to update expense source' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await TenantExpenseSourceService.delete(Number(req.tenant.id), id);
      if (!deleted) { res.status(404).json({ error: 'Expense source not found' }); return; }
      res.json({ message: 'Expense source deleted successfully' });
    } catch (error: any) {
      console.error('[TenantExpenseSourceController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete expense source' });
    }
  }
}
