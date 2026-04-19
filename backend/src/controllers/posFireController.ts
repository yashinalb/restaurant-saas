import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { PosFireService } from '../services/posFireService.js';

export class PosFireController {
  static async fire(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) { res.status(400).json({ error: 'Invalid order ID' }); return; }
      const body = req.body || {};
      const result = await PosFireService.fire(Number(req.tenant.id), {
        order_id: orderId,
        item_ids: Array.isArray(body.item_ids) ? body.item_ids.map((n: any) => Number(n)) : null,
        refire: body.refire === true,
        void_item_ids: Array.isArray(body.void_item_ids) ? body.void_item_ids.map((n: any) => Number(n)) : null,
        print: body.print !== false,
        broadcast_kds: body.broadcast_kds !== false,
        language: body.language ? String(body.language) : undefined,
      });
      res.status(200).json({ data: result, message: 'Fire processed' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      console.error('[PosFireController] fire error:', error);
      res.status(500).json({ error: 'Failed to process fire' });
    }
  }
}
