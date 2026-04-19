import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { PosItemStatusService } from '../services/posItemStatusService.js';

export class PosItemStatusController {
  static async patch(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const itemId = parseInt(req.params.itemId);
      if (isNaN(itemId)) { res.status(400).json({ error: 'Invalid item ID' }); return; }
      const { status, language, reason } = req.body || {};
      if (!status) { res.status(400).json({ error: 'status is required' }); return; }
      const result = await PosItemStatusService.transition(Number(req.tenant.id), itemId, status, {
        language,
        reason: reason ?? null,
        admin_user_id: req.admin ? Number(req.admin.id) : null,
      });
      res.json({ data: result, message: 'Item status updated' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message, code: error.code }); return; }
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      console.error('[PosItemStatusController] patch error:', error);
      res.status(500).json({ error: 'Failed to update item status' });
    }
  }
}
