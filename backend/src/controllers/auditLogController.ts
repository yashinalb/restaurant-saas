import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { AuditLogService } from '../services/auditLogService.js';

export class AuditLogController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const data = await AuditLogService.getAll(tenantId, {
        store_id: req.query.store_id ? Number(req.query.store_id) : undefined,
        action: req.query.action ? String(req.query.action) : undefined,
        target_type: req.query.target_type ? String(req.query.target_type) : undefined,
        target_id: req.query.target_id ? Number(req.query.target_id) : undefined,
        admin_user_id: req.query.admin_user_id ? Number(req.query.admin_user_id) : undefined,
        tenant_waiter_id: req.query.tenant_waiter_id ? Number(req.query.tenant_waiter_id) : undefined,
        from_date: req.query.from_date ? String(req.query.from_date) : undefined,
        to_date: req.query.to_date ? String(req.query.to_date) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });
      res.json({ data });
    } catch (error: any) {
      console.error('[AuditLogController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch audit log' });
    }
  }

  static async getActions(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const data = await AuditLogService.getActions(Number(req.tenant.id));
      res.json({ data });
    } catch (error: any) {
      console.error('[AuditLogController] getActions error:', error);
      res.status(500).json({ error: 'Failed to fetch audit actions' });
    }
  }
}
