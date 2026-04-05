import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { AddonService } from '../services/addonService.js';

export class AddonController {
  static async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const filters = {
        master_addon_type_id: req.query.master_addon_type_id ? parseInt(req.query.master_addon_type_id as string) : undefined,
      };
      const items = await AddonService.getAll(filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[AddonController] getAll error:', error);
      res.status(500).json({ message: 'Failed to fetch addons' });
    }
  }

  static async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      const item = await AddonService.getById(id);
      if (!item) { res.status(404).json({ message: 'Addon not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[AddonController] getById error:', error);
      res.status(500).json({ message: 'Failed to fetch addon' });
    }
  }

  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { master_addon_type_id, code, sort_order, is_active, translations } = req.body;
      if (!master_addon_type_id || !code) { res.status(400).json({ message: 'Addon type and code are required' }); return; }
      const id = await AddonService.create({ master_addon_type_id, code, sort_order, is_active, translations });
      const item = await AddonService.getById(id);
      res.status(201).json({ data: item, message: 'Addon created successfully' });
    } catch (error: any) {
      if (error.status === 409) { res.status(409).json({ message: error.message }); return; }
      console.error('[AddonController] create error:', error);
      res.status(500).json({ message: 'Failed to create addon' });
    }
  }

  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      await AddonService.update(id, req.body);
      const item = await AddonService.getById(id);
      res.json({ data: item, message: 'Addon updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ message: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ message: error.message }); return; }
      console.error('[AddonController] update error:', error);
      res.status(500).json({ message: 'Failed to update addon' });
    }
  }

  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      const deleted = await AddonService.delete(id);
      if (!deleted) { res.status(404).json({ message: 'Addon not found' }); return; }
      res.json({ message: 'Addon deleted successfully' });
    } catch (error: any) {
      console.error('[AddonController] delete error:', error);
      res.status(500).json({ message: 'Failed to delete addon' });
    }
  }
}
