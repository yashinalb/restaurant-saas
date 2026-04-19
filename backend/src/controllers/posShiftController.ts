import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { PosShiftService } from '../services/posShiftService.js';

export class PosShiftController {
  static async getActive(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const storeId = Number(req.query.store_id);
      const currencyId = Number(req.query.currency_id);
      if (!storeId || !currencyId) { res.status(400).json({ error: 'store_id and currency_id are required' }); return; }
      const session = await PosShiftService.getActive(Number(req.tenant.id), { store_id: storeId, currency_id: currencyId });
      let reconciliation: any = null;
      if (session) {
        reconciliation = await PosShiftService.computeExpectedCash(Number(req.tenant.id), Number(session.id));
      }
      res.json({ data: { session, reconciliation } });
    } catch (error: any) {
      console.error('[PosShiftController] getActive error:', error);
      res.status(500).json({ error: 'Failed to fetch shift' });
    }
  }

  static async open(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant || !req.admin) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const { store_id, currency_id, opening_amount, notes } = req.body || {};
      if (!store_id || !currency_id || opening_amount == null) {
        res.status(400).json({ error: 'store_id, currency_id, and opening_amount are required' });
        return;
      }
      const id = await PosShiftService.open(Number(req.tenant.id), {
        store_id: Number(store_id),
        currency_id: Number(currency_id),
        opening_amount: Number(opening_amount),
        opened_by: Number(req.admin.id),
        notes: notes ?? null,
      });
      const session = await PosShiftService.getActive(Number(req.tenant.id), { store_id: Number(store_id), currency_id: Number(currency_id) });
      res.status(201).json({ data: { session_id: id, session }, message: 'Shift opened' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[PosShiftController] open error:', error);
      res.status(500).json({ error: 'Failed to open shift' });
    }
  }

  static async close(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant || !req.admin) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const { store_id, currency_id, closing_amount, expected_amount, notes } = req.body || {};
      if (!store_id || !currency_id || closing_amount == null) {
        res.status(400).json({ error: 'store_id, currency_id, and closing_amount are required' });
        return;
      }
      const result = await PosShiftService.close(Number(req.tenant.id), {
        store_id: Number(store_id),
        currency_id: Number(currency_id),
        closing_amount: Number(closing_amount),
        expected_amount: expected_amount != null ? Number(expected_amount) : null,
        closed_by: Number(req.admin.id),
        notes: notes ?? null,
      });
      res.json({ data: result, message: 'Shift closed' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      console.error('[PosShiftController] close error:', error);
      res.status(500).json({ error: 'Failed to close shift' });
    }
  }
}
