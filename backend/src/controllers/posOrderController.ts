import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { PosOrderService } from '../services/posOrderService.js';
import { OrderService } from '../services/orderService.js';

export class PosOrderController {
  static async start(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const { session_id, table_id, order_type_code, tenant_customer_id, guest_name, guest_phone, delivery_address, notes } = req.body;
      if (!session_id) { res.status(400).json({ error: 'session_id is required' }); return; }
      const id = await PosOrderService.start(tenantId, {
        session_id: Number(session_id),
        table_id: table_id ? Number(table_id) : null,
        order_type_code: order_type_code ?? null,
        tenant_customer_id: tenant_customer_id ? Number(tenant_customer_id) : null,
        guest_name: guest_name ?? null,
        guest_phone: guest_phone ?? null,
        delivery_address: delivery_address ?? null,
        notes: notes ?? null,
      });
      const order = await OrderService.getById(tenantId, id);
      res.status(201).json({ data: order, message: 'Order started' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      if (error.status === 401) { res.status(401).json({ error: error.message }); return; }
      console.error('[PosOrderController] start error:', error);
      res.status(500).json({ error: 'Failed to start order' });
    }
  }
}
