import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { PosPaymentService } from '../services/posPaymentService.js';

export class PosPaymentController {
  static async pay(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) { res.status(400).json({ error: 'Invalid order ID' }); return; }
      const { payments, tip_amount, item_ids } = req.body;
      const result = await PosPaymentService.pay(Number(req.tenant.id), {
        order_id: orderId,
        payments: Array.isArray(payments) ? payments : [],
        tip_amount: tip_amount != null ? Number(tip_amount) : 0,
        item_ids: Array.isArray(item_ids) ? item_ids.map((n: any) => Number(n)) : [],
      });
      res.status(201).json({ data: result, message: 'Payment recorded' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ error: error.message, code: error.code }); return; }
      console.error('[PosPaymentController] pay error:', error);
      res.status(500).json({ error: 'Failed to record payment' });
    }
  }
}
