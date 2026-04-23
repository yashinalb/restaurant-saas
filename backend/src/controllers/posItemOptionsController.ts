import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { PosItemOptionsService } from '../services/posItemOptionsService.js';

export class PosItemOptionsController {
  static async getOptions(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) { res.status(400).json({ error: 'Invalid item ID' }); return; }
      const storeId = Number(req.query.store_id);
      const currencyId = Number(req.query.currency_id);
      if (!storeId || !currencyId) { res.status(400).json({ error: 'store_id and currency_id are required' }); return; }
      const data = await PosItemOptionsService.getOptions(Number(req.tenant.id), itemId, { store_id: storeId, currency_id: currencyId });
      res.json({ data });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      console.error('[PosItemOptionsController] getOptions error:', error);
      res.status(500).json({ error: 'Failed to fetch item options' });
    }
  }

  static async addItem(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) { res.status(400).json({ error: 'Invalid order ID' }); return; }
      const { tenant_menu_item_id, quantity, weight_grams, selected_addons, removed_ingredient_ids, notes,
              seat_number, course_code, course_hold } = req.body;
      const itemId = await PosItemOptionsService.addItem(Number(req.tenant.id), {
        order_id: orderId,
        tenant_menu_item_id: Number(tenant_menu_item_id),
        quantity: quantity ? Number(quantity) : 1,
        weight_grams: weight_grams != null ? Number(weight_grams) : null,
        selected_addons: Array.isArray(selected_addons) ? selected_addons : [],
        removed_ingredient_ids: Array.isArray(removed_ingredient_ids) ? removed_ingredient_ids : [],
        notes: notes ?? null,
        seat_number: seat_number != null ? Number(seat_number) : null,
        course_code: course_code ?? null,
        course_hold: !!course_hold,
      });
      res.status(201).json({ data: { order_item_id: itemId }, message: 'Item added' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      console.error('[PosItemOptionsController] addItem error:', error);
      res.status(500).json({ error: 'Failed to add item' });
    }
  }
}
