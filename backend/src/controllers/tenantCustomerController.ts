import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { TenantCustomerService } from '../services/tenantCustomerService.js';

export class TenantCustomerController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = {
        is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
        is_registered: req.query.is_registered !== undefined ? req.query.is_registered === 'true' : undefined,
      };
      const items = await TenantCustomerService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantCustomerController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await TenantCustomerService.getById(Number(req.tenant.id), id);
      if (!item) { res.status(404).json({ error: 'Customer not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[TenantCustomerController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch customer' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      if (!req.body.name) { res.status(400).json({ error: 'Name is required' }); return; }
      const id = await TenantCustomerService.create(tenantId, req.body);
      const item = await TenantCustomerService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Customer created successfully' });
    } catch (error: any) {
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantCustomerController] create error:', error);
      res.status(500).json({ error: 'Failed to create customer' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await TenantCustomerService.update(tenantId, id, req.body);
      const item = await TenantCustomerService.getById(tenantId, id);
      res.json({ data: item, message: 'Customer updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantCustomerController] update error:', error);
      res.status(500).json({ error: 'Failed to update customer' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await TenantCustomerService.delete(Number(req.tenant.id), id);
      if (!deleted) { res.status(404).json({ error: 'Customer not found' }); return; }
      res.json({ message: 'Customer deleted successfully' });
    } catch (error: any) {
      console.error('[TenantCustomerController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete customer' });
    }
  }
}
