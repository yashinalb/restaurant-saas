import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { MenuCategoryService } from '../services/menuCategoryService.js';

export class MenuCategoryController {
  static async getAll(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const items = await MenuCategoryService.getAll();
      res.json({ data: items });
    } catch (error: any) {
      console.error('[MenuCategoryController] getAll error:', error);
      res.status(500).json({ message: 'Failed to fetch menu categories' });
    }
  }

  static async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      const item = await MenuCategoryService.getById(id);
      if (!item) { res.status(404).json({ message: 'Menu category not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[MenuCategoryController] getById error:', error);
      res.status(500).json({ message: 'Failed to fetch menu category' });
    }
  }

  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { code, parent_id, icon_url, image_url, sort_order, is_active, translations } = req.body;
      if (!code) { res.status(400).json({ message: 'Code is required' }); return; }
      const id = await MenuCategoryService.create({ code, parent_id, icon_url, image_url, sort_order, is_active, translations });
      const item = await MenuCategoryService.getById(id);
      res.status(201).json({ data: item, message: 'Menu category created successfully' });
    } catch (error: any) {
      if (error.status === 409) { res.status(409).json({ message: error.message }); return; }
      console.error('[MenuCategoryController] create error:', error);
      res.status(500).json({ message: 'Failed to create menu category' });
    }
  }

  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      await MenuCategoryService.update(id, req.body);
      const item = await MenuCategoryService.getById(id);
      res.json({ data: item, message: 'Menu category updated successfully' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ message: error.message }); return; }
      if (error.status === 404) { res.status(404).json({ message: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ message: error.message }); return; }
      console.error('[MenuCategoryController] update error:', error);
      res.status(500).json({ message: 'Failed to update menu category' });
    }
  }

  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      const deleted = await MenuCategoryService.delete(id);
      if (!deleted) { res.status(404).json({ message: 'Menu category not found' }); return; }
      res.json({ message: 'Menu category deleted successfully' });
    } catch (error: any) {
      console.error('[MenuCategoryController] delete error:', error);
      res.status(500).json({ message: 'Failed to delete menu category' });
    }
  }
}
