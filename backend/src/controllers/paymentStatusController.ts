import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { PaymentStatusService } from '../services/paymentStatusService.js';

export class PaymentStatusController {
  static async getAll(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const items = await PaymentStatusService.getAll();
      res.json({ data: items });
    } catch (error: any) {
      console.error('[PaymentStatusController] getAll error:', error);
      res.status(500).json({ message: 'Failed to fetch payment statuses' });
    }
  }

  static async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      const item = await PaymentStatusService.getById(id);
      if (!item) { res.status(404).json({ message: 'Payment status not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[PaymentStatusController] getById error:', error);
      res.status(500).json({ message: 'Failed to fetch payment status' });
    }
  }

  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { code, color, sort_order, is_active, translations } = req.body;
      if (!code) { res.status(400).json({ message: 'Code is required' }); return; }
      const id = await PaymentStatusService.create({ code, color, sort_order, is_active, translations });
      const item = await PaymentStatusService.getById(id);
      res.status(201).json({ data: item, message: 'Payment status created successfully' });
    } catch (error: any) {
      if (error.status === 409) { res.status(409).json({ message: error.message }); return; }
      console.error('[PaymentStatusController] create error:', error);
      res.status(500).json({ message: 'Failed to create payment status' });
    }
  }

  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      await PaymentStatusService.update(id, req.body);
      const item = await PaymentStatusService.getById(id);
      res.json({ data: item, message: 'Payment status updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ message: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ message: error.message }); return; }
      console.error('[PaymentStatusController] update error:', error);
      res.status(500).json({ message: 'Failed to update payment status' });
    }
  }

  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      const deleted = await PaymentStatusService.delete(id);
      if (!deleted) { res.status(404).json({ message: 'Payment status not found' }); return; }
      res.json({ message: 'Payment status deleted successfully' });
    } catch (error: any) {
      console.error('[PaymentStatusController] delete error:', error);
      res.status(500).json({ message: 'Failed to delete payment status' });
    }
  }
}
