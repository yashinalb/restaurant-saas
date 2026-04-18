import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { PosMoveItemsService } from '../services/posMoveItemsService.js';

export class PosMoveItemsController {
  static async listActiveOrders(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const storeId = Number(req.query.store_id);
      if (!storeId) { res.status(400).json({ error: 'store_id is required' }); return; }
      const excludeOrderId = req.query.exclude_order_id ? Number(req.query.exclude_order_id) : undefined;
      const data = await PosMoveItemsService.listActiveOrders(Number(req.tenant.id), {
        store_id: storeId,
        exclude_order_id: excludeOrderId,
      });
      res.json({ data });
    } catch (error: any) {
      console.error('[PosMoveItemsController] listActiveOrders error:', error);
      res.status(500).json({ error: 'Failed to fetch active orders' });
    }
  }

  static async move(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const sourceOrderId = parseInt(req.params.id);
      if (isNaN(sourceOrderId)) { res.status(400).json({ error: 'Invalid source order ID' }); return; }
      const { target_order_id, order_item_ids } = req.body;
      if (!target_order_id) { res.status(400).json({ error: 'target_order_id is required' }); return; }
      const result = await PosMoveItemsService.moveItems(
        Number(req.tenant.id),
        sourceOrderId,
        Number(target_order_id),
        Array.isArray(order_item_ids) ? order_item_ids.map((n: any) => Number(n)) : []
      );
      res.json({ data: result, message: 'Items moved' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      console.error('[PosMoveItemsController] move error:', error);
      res.status(500).json({ error: 'Failed to move items' });
    }
  }
}
