import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { IngredientService } from '../services/ingredientService.js';

export class IngredientController {
  static async getAll(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const items = await IngredientService.getAll();
      res.json({ data: items });
    } catch (error: any) {
      console.error('[IngredientController] getAll error:', error);
      res.status(500).json({ message: 'Failed to fetch ingredients' });
    }
  }

  static async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      const item = await IngredientService.getById(id);
      if (!item) { res.status(404).json({ message: 'Ingredient not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[IngredientController] getById error:', error);
      res.status(500).json({ message: 'Failed to fetch ingredient' });
    }
  }

  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { code, allergen_type, icon_url, sort_order, is_active, translations } = req.body;
      if (!code) { res.status(400).json({ message: 'Code is required' }); return; }
      const id = await IngredientService.create({ code, allergen_type, icon_url, sort_order, is_active, translations });
      const item = await IngredientService.getById(id);
      res.status(201).json({ data: item, message: 'Ingredient created successfully' });
    } catch (error: any) {
      if (error.status === 409) { res.status(409).json({ message: error.message }); return; }
      console.error('[IngredientController] create error:', error);
      res.status(500).json({ message: 'Failed to create ingredient' });
    }
  }

  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      await IngredientService.update(id, req.body);
      const item = await IngredientService.getById(id);
      res.json({ data: item, message: 'Ingredient updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ message: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ message: error.message }); return; }
      console.error('[IngredientController] update error:', error);
      res.status(500).json({ message: 'Failed to update ingredient' });
    }
  }

  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      const deleted = await IngredientService.delete(id);
      if (!deleted) { res.status(404).json({ message: 'Ingredient not found' }); return; }
      res.json({ message: 'Ingredient deleted successfully' });
    } catch (error: any) {
      console.error('[IngredientController] delete error:', error);
      res.status(500).json({ message: 'Failed to delete ingredient' });
    }
  }
}
