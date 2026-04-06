import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { ExpenseCategoryService } from '../services/expenseCategoryService.js';

export class ExpenseCategoryController {
  static async getAll(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const items = await ExpenseCategoryService.getAll();
      res.json({ data: items });
    } catch (error: any) {
      console.error('[ExpenseCategoryController] getAll error:', error);
      res.status(500).json({ message: 'Failed to fetch expense categories' });
    }
  }

  static async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      const item = await ExpenseCategoryService.getById(id);
      if (!item) { res.status(404).json({ message: 'Expense category not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[ExpenseCategoryController] getById error:', error);
      res.status(500).json({ message: 'Failed to fetch expense category' });
    }
  }

  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { code, icon, sort_order, is_active, translations } = req.body;
      if (!code) { res.status(400).json({ message: 'Code is required' }); return; }
      const id = await ExpenseCategoryService.create({ code, icon, sort_order, is_active, translations });
      const item = await ExpenseCategoryService.getById(id);
      res.status(201).json({ data: item, message: 'Expense category created successfully' });
    } catch (error: any) {
      if (error.status === 409) { res.status(409).json({ message: error.message }); return; }
      console.error('[ExpenseCategoryController] create error:', error);
      res.status(500).json({ message: 'Failed to create expense category' });
    }
  }

  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      await ExpenseCategoryService.update(id, req.body);
      const item = await ExpenseCategoryService.getById(id);
      res.json({ data: item, message: 'Expense category updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ message: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ message: error.message }); return; }
      console.error('[ExpenseCategoryController] update error:', error);
      res.status(500).json({ message: 'Failed to update expense category' });
    }
  }

  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      const deleted = await ExpenseCategoryService.delete(id);
      if (!deleted) { res.status(404).json({ message: 'Expense category not found' }); return; }
      res.json({ message: 'Expense category deleted successfully' });
    } catch (error: any) {
      console.error('[ExpenseCategoryController] delete error:', error);
      res.status(500).json({ message: 'Failed to delete expense category' });
    }
  }
}
