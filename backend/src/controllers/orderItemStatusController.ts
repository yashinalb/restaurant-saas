import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { OrderItemStatusService } from '../services/orderItemStatusService.js';

export class OrderItemStatusController {
  static async getAll(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const items = await OrderItemStatusService.getAll();
      res.json({ data: items });
    } catch (error: any) {
      console.error('[OrderItemStatusController] getAll error:', error);
      res.status(500).json({ message: 'Failed to fetch order item statuses' });
    }
  }

  static async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      const item = await OrderItemStatusService.getById(id);
      if (!item) { res.status(404).json({ message: 'Order item status not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[OrderItemStatusController] getById error:', error);
      res.status(500).json({ message: 'Failed to fetch order item status' });
    }
  }

  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { code, color, sort_order, is_active, translations } = req.body;
      if (!code) { res.status(400).json({ message: 'Code is required' }); return; }
      const id = await OrderItemStatusService.create({ code, color, sort_order, is_active, translations });
      const item = await OrderItemStatusService.getById(id);
      res.status(201).json({ data: item, message: 'Order item status created successfully' });
    } catch (error: any) {
      if (error.status === 409) { res.status(409).json({ message: error.message }); return; }
      console.error('[OrderItemStatusController] create error:', error);
      res.status(500).json({ message: 'Failed to create order item status' });
    }
  }

  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      await OrderItemStatusService.update(id, req.body);
      const item = await OrderItemStatusService.getById(id);
      res.json({ data: item, message: 'Order item status updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ message: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ message: error.message }); return; }
      console.error('[OrderItemStatusController] update error:', error);
      res.status(500).json({ message: 'Failed to update order item status' });
    }
  }

  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      const deleted = await OrderItemStatusService.delete(id);
      if (!deleted) { res.status(404).json({ message: 'Order item status not found' }); return; }
      res.json({ message: 'Order item status deleted successfully' });
    } catch (error: any) {
      console.error('[OrderItemStatusController] delete error:', error);
      res.status(500).json({ message: 'Failed to delete order item status' });
    }
  }
}
