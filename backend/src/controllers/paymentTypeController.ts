import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { PaymentTypeService } from '../services/paymentTypeService.js';

export class PaymentTypeController {
  static async getAll(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const items = await PaymentTypeService.getAll();
      res.json({ data: items });
    } catch (error: any) {
      console.error('[PaymentTypeController] getAll error:', error);
      res.status(500).json({ message: 'Failed to fetch payment types' });
    }
  }

  static async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      const item = await PaymentTypeService.getById(id);
      if (!item) { res.status(404).json({ message: 'Payment type not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[PaymentTypeController] getById error:', error);
      res.status(500).json({ message: 'Failed to fetch payment type' });
    }
  }

  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { code, icon, sort_order, is_active, translations } = req.body;
      if (!code) { res.status(400).json({ message: 'Code is required' }); return; }
      const id = await PaymentTypeService.create({ code, icon, sort_order, is_active, translations });
      const item = await PaymentTypeService.getById(id);
      res.status(201).json({ data: item, message: 'Payment type created successfully' });
    } catch (error: any) {
      if (error.status === 409) { res.status(409).json({ message: error.message }); return; }
      console.error('[PaymentTypeController] create error:', error);
      res.status(500).json({ message: 'Failed to create payment type' });
    }
  }

  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      await PaymentTypeService.update(id, req.body);
      const item = await PaymentTypeService.getById(id);
      res.json({ data: item, message: 'Payment type updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ message: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ message: error.message }); return; }
      console.error('[PaymentTypeController] update error:', error);
      res.status(500).json({ message: 'Failed to update payment type' });
    }
  }

  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: 'Invalid ID' }); return; }
      const deleted = await PaymentTypeService.delete(id);
      if (!deleted) { res.status(404).json({ message: 'Payment type not found' }); return; }
      res.json({ message: 'Payment type deleted successfully' });
    } catch (error: any) {
      console.error('[PaymentTypeController] delete error:', error);
      res.status(500).json({ message: 'Failed to delete payment type' });
    }
  }
}
