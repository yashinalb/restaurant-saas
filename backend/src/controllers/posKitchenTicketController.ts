import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { PosKitchenTicketService } from '../services/posKitchenTicketService.js';
import { AuditLogService } from '../services/auditLogService.js';

function parseOpts(req: TenantAuthRequest) {
  const body = req.body || {};
  const query = req.query || {};
  const refire = String(body.refire ?? query.refire ?? '') === 'true' || body.refire === true;
  const itemIds = Array.isArray(body.item_ids) ? body.item_ids.map((n: any) => Number(n)) : null;
  const voidIds = Array.isArray(body.void_item_ids) ? body.void_item_ids.map((n: any) => Number(n)) : null;
  return {
    language: (body.language || query.language) ? String(body.language || query.language) : undefined,
    destination_id: body.destination_id || query.destination_id
      ? Number(body.destination_id || query.destination_id)
      : undefined,
    refire,
    item_ids: itemIds,
    void_item_ids: voidIds,
  };
}

export class PosKitchenTicketController {
  static async getTickets(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) { res.status(400).json({ error: 'Invalid order ID' }); return; }
      const data = await PosKitchenTicketService.getTickets(Number(req.tenant.id), orderId, parseOpts(req));
      res.json({ data });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      console.error('[PosKitchenTicketController] getTickets error:', error);
      res.status(500).json({ error: 'Failed to build kitchen tickets' });
    }
  }

  static async printTickets(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) { res.status(400).json({ error: 'Invalid order ID' }); return; }
      const opts = parseOpts(req);
      const result = await PosKitchenTicketService.printTickets(Number(req.tenant.id), orderId, opts);
      const allPrinted = result.tickets.length > 0 && result.tickets.every(tk => tk.printed);
      const status = result.tickets.length === 0 ? 200 : (allPrinted ? 200 : 207); // 207 Multi-status
      // Any direct kitchen-ticket print from this endpoint is by definition a reprint.
      if (result.tickets.length > 0) {
        AuditLogService.log({
          tenant_id: Number(req.tenant.id),
          admin_user_id: req.admin ? Number(req.admin.id) : null,
          action: 'reprint_kitchen_ticket',
          target_type: 'order',
          target_id: orderId,
          after: {
            destinations: result.tickets.map((tk: any) => tk.destination_code),
            printed: result.tickets.filter((tk: any) => tk.printed).length,
            refire: opts.refire,
            void: Array.isArray(opts.void_item_ids) && opts.void_item_ids.length > 0,
          },
        });
      }
      res.status(status).json({ data: result, message: allPrinted ? 'Tickets printed' : 'Some tickets failed to print' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      console.error('[PosKitchenTicketController] printTickets error:', error);
      res.status(500).json({ error: 'Failed to print kitchen tickets' });
    }
  }
}
