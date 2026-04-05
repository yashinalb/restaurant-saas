import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { OrderSourceService } from '../services/orderSourceService.js';

export class OrderSourceController {
  static async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const items = await OrderSourceService.getAll();
      res.json({ data: items });
    } catch (error: any) {
      console.error('[OrderSourceController] getAll error:', error);
      res.status(500).json({ message: 'Failed to fetch order sources' });
    }
  }

  static async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      const item = await OrderSourceService.getById(id);
      if (!item) { res.status(404).json({ message: 'Order source not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[OrderSourceController] getById error:', error);
      res.status(500).json({ message: 'Failed to fetch order source' });
    }
  }

  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { code, icon, sort_order, is_active, translations } = req.body;
      if (!code) { res.status(400).json({ message: 'Code is required' }); return; }
      const id = await OrderSourceService.create({ code, icon, sort_order, is_active, translations });
      const item = await OrderSourceService.getById(id);
      res.status(201).json({ data: item, message: 'Order source created successfully' });
    } catch (error: any) {
      if (error.status === 409) { res.status(409).json({ message: error.message }); return; }
      console.error('[OrderSourceController] create error:', error);
      res.status(500).json({ message: 'Failed to create order source' });
    }
  }

  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      await OrderSourceService.update(id, req.body);
      const item = await OrderSourceService.getById(id);
      res.json({ data: item, message: 'Order source updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ message: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ message: error.message }); return; }
      console.error('[OrderSourceController] update error:', error);
      res.status(500).json({ message: 'Failed to update order source' });
    }
  }

  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      const deleted = await OrderSourceService.delete(id);
      if (!deleted) { res.status(404).json({ message: 'Order source not found' }); return; }
      res.json({ message: 'Order source deleted successfully' });
    } catch (error: any) {
      console.error('[OrderSourceController] delete error:', error);
      res.status(500).json({ message: 'Failed to delete order source' });
    }
  }
}
