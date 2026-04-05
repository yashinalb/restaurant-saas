import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { OrderDestinationService } from '../services/orderDestinationService.js';

export class OrderDestinationController {
  static async getAll(req: AuthRequest, res: Response): Promise<void> {
    try { res.json({ data: await OrderDestinationService.getAll() }); }
    catch (error: any) { console.error('[OrderDestinationController] getAll error:', error); res.status(500).json({ message: 'Failed to fetch order destinations' }); }
  }

  static async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      const item = await OrderDestinationService.getById(id);
      if (!item) { res.status(404).json({ message: 'Order destination not found' }); return; }
      res.json({ data: item });
    } catch (error: any) { console.error('[OrderDestinationController] getById error:', error); res.status(500).json({ message: 'Failed to fetch order destination' }); }
  }

  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { code, icon, sort_order, is_active, translations } = req.body;
      if (!code) { res.status(400).json({ message: 'Code is required' }); return; }
      const id = await OrderDestinationService.create({ code, icon, sort_order, is_active, translations });
      const item = await OrderDestinationService.getById(id);
      res.status(201).json({ data: item, message: 'Order destination created successfully' });
    } catch (error: any) {
      if (error.status === 409) { res.status(409).json({ message: error.message }); return; }
      console.error('[OrderDestinationController] create error:', error); res.status(500).json({ message: 'Failed to create order destination' });
    }
  }

  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      await OrderDestinationService.update(id, req.body);
      const item = await OrderDestinationService.getById(id);
      res.json({ data: item, message: 'Order destination updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ message: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ message: error.message }); return; }
      console.error('[OrderDestinationController] update error:', error); res.status(500).json({ message: 'Failed to update order destination' });
    }
  }

  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      const deleted = await OrderDestinationService.delete(id);
      if (!deleted) { res.status(404).json({ message: 'Order destination not found' }); return; }
      res.json({ message: 'Order destination deleted successfully' });
    } catch (error: any) { console.error('[OrderDestinationController] delete error:', error); res.status(500).json({ message: 'Failed to delete order destination' }); }
  }
}
