import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { TenantExpenseCategoryService } from '../services/tenantExpenseCategoryService.js';

export class TenantExpenseCategoryController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = {
        is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      };
      const items = await TenantExpenseCategoryService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantExpenseCategoryController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch expense categories' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await TenantExpenseCategoryService.getById(Number(req.tenant.id), id);
      if (!item) { res.status(404).json({ error: 'Expense category not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[TenantExpenseCategoryController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch expense category' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = await TenantExpenseCategoryService.create(tenantId, req.body);
      const item = await TenantExpenseCategoryService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Expense category created successfully' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantExpenseCategoryController] create error:', error);
      res.status(500).json({ error: 'Failed to create expense category' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await TenantExpenseCategoryService.update(tenantId, id, req.body);
      const item = await TenantExpenseCategoryService.getById(tenantId, id);
      res.json({ data: item, message: 'Expense category updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantExpenseCategoryController] update error:', error);
      res.status(500).json({ error: 'Failed to update expense category' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await TenantExpenseCategoryService.delete(Number(req.tenant.id), id);
      if (!deleted) { res.status(404).json({ error: 'Expense category not found' }); return; }
      res.json({ message: 'Expense category deleted successfully' });
    } catch (error: any) {
      console.error('[TenantExpenseCategoryController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete expense category' });
    }
  }

  static async getAvailableMaster(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const items = await TenantExpenseCategoryService.getAvailableMaster(tenantId);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantExpenseCategoryController] getAvailableMaster error:', error);
      res.status(500).json({ error: 'Failed to fetch master expense categories' });
    }
  }

  static async importFromMaster(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const { master_ids } = req.body;
      if (!Array.isArray(master_ids) || master_ids.length === 0) {
        res.status(400).json({ error: 'master_ids array is required' });
        return;
      }
      const result = await TenantExpenseCategoryService.importFromMaster(tenantId, master_ids);
      res.json({ data: result, message: `Imported ${result.imported_count} categories` });
    } catch (error: any) {
      console.error('[TenantExpenseCategoryController] importFromMaster error:', error);
      res.status(500).json({ error: 'Failed to import from master' });
    }
  }
}
