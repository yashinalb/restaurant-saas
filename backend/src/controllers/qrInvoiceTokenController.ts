import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { QrInvoiceTokenService } from '../services/qrInvoiceTokenService.js';

export class QrInvoiceTokenController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = {
        status: req.query.status ? String(req.query.status) : undefined,
        order_id: req.query.order_id ? Number(req.query.order_id) : undefined,
        table_id: req.query.table_id ? Number(req.query.table_id) : undefined,
      };
      const items = await QrInvoiceTokenService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[QrInvoiceTokenController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch QR invoice tokens' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await QrInvoiceTokenService.getById(Number(req.tenant.id), id);
      if (!item) { res.status(404).json({ error: 'QR invoice token not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[QrInvoiceTokenController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch QR invoice token' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = await QrInvoiceTokenService.create(tenantId, req.body);
      const item = await QrInvoiceTokenService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'QR invoice token created successfully' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[QrInvoiceTokenController] create error:', error);
      res.status(500).json({ error: 'Failed to create QR invoice token' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await QrInvoiceTokenService.update(tenantId, id, req.body);
      const item = await QrInvoiceTokenService.getById(tenantId, id);
      res.json({ data: item, message: 'QR invoice token updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      console.error('[QrInvoiceTokenController] update error:', error);
      res.status(500).json({ error: 'Failed to update QR invoice token' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await QrInvoiceTokenService.delete(Number(req.tenant.id), id);
      if (!deleted) { res.status(404).json({ error: 'QR invoice token not found' }); return; }
      res.json({ message: 'QR invoice token deleted successfully' });
    } catch (error: any) {
      console.error('[QrInvoiceTokenController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete QR invoice token' });
    }
  }
}
