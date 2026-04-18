import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { PosMenuService } from '../services/posMenuService.js';

export class PosMenuController {
  static async getCategories(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const storeId = Number(req.query.store_id);
      if (!storeId) { res.status(400).json({ error: 'store_id is required' }); return; }
      const data = await PosMenuService.getCategories(Number(req.tenant.id), storeId);
      res.json({ data });
    } catch (error: any) {
      console.error('[PosMenuController] getCategories error:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  }

  static async getItems(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const storeId = Number(req.query.store_id);
      const currencyId = Number(req.query.currency_id);
      if (!storeId || !currencyId) { res.status(400).json({ error: 'store_id and currency_id are required' }); return; }
      const data = await PosMenuService.getItems(Number(req.tenant.id), {
        store_id: storeId,
        currency_id: currencyId,
        category_id: req.query.category_id ? Number(req.query.category_id) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
      });
      res.json({ data });
    } catch (error: any) {
      console.error('[PosMenuController] getItems error:', error);
      res.status(500).json({ error: 'Failed to fetch menu items' });
    }
  }

  static async quickAdd(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) { res.status(400).json({ error: 'Invalid order ID' }); return; }
      const { tenant_menu_item_id, quantity, notes } = req.body;
      const itemId = await PosMenuService.quickAdd(Number(req.tenant.id), {
        order_id: orderId,
        tenant_menu_item_id: Number(tenant_menu_item_id),
        quantity: quantity ? Number(quantity) : 1,
        notes: notes ?? null,
      });
      res.status(201).json({ data: { order_item_id: itemId }, message: 'Item added' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      console.error('[PosMenuController] quickAdd error:', error);
      res.status(500).json({ error: 'Failed to add item' });
    }
  }
}
