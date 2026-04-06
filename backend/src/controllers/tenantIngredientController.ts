import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { TenantIngredientService } from '../services/tenantIngredientService.js';

export class TenantIngredientController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = {
        is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
        allergen_type: req.query.allergen_type as string | undefined,
      };
      const items = await TenantIngredientService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantIngredientController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch ingredients' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await TenantIngredientService.getById(tenantId, id);
      if (!item) { res.status(404).json({ error: 'Ingredient not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[TenantIngredientController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch ingredient' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      if (!req.body.code) { res.status(400).json({ error: 'Code is required' }); return; }
      const id = await TenantIngredientService.create(tenantId, req.body);
      const item = await TenantIngredientService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Ingredient created successfully' });
    } catch (error: any) {
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantIngredientController] create error:', error);
      res.status(500).json({ error: 'Failed to create ingredient' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await TenantIngredientService.update(tenantId, id, req.body);
      const item = await TenantIngredientService.getById(tenantId, id);
      res.json({ data: item, message: 'Ingredient updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[TenantIngredientController] update error:', error);
      res.status(500).json({ error: 'Failed to update ingredient' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await TenantIngredientService.delete(tenantId, id);
      if (!deleted) { res.status(404).json({ error: 'Ingredient not found' }); return; }
      res.json({ message: 'Ingredient deleted successfully' });
    } catch (error: any) {
      console.error('[TenantIngredientController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete ingredient' });
    }
  }

  static async getAvailableMaster(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const items = await TenantIngredientService.getAvailableMaster(tenantId);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[TenantIngredientController] getAvailableMaster error:', error);
      res.status(500).json({ error: 'Failed to fetch master ingredients' });
    }
  }

  static async importFromMaster(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const { master_ids } = req.body;
      if (!Array.isArray(master_ids) || master_ids.length === 0) {
        res.status(400).json({ error: 'master_ids array is required' }); return;
      }
      const result = await TenantIngredientService.importFromMaster(tenantId, master_ids);
      res.json({ data: result, message: `Imported ${result.imported_count} ingredients` });
    } catch (error: any) {
      console.error('[TenantIngredientController] importFromMaster error:', error);
      res.status(500).json({ error: 'Failed to import from master' });
    }
  }
}
