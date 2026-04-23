import { Request, Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { KdsDeviceService, KdsDeviceContext } from '../services/kdsDeviceService.js';
import { KdsDisplayService } from '../services/kdsDisplayService.js';

export interface KdsDeviceRequest extends Request {
  kdsDevice?: KdsDeviceContext;
}

export class KdsDeviceController {
  // ---------- Admin (tenant-scoped) ----------

  static async list(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const storeId = req.query.store_id ? Number(req.query.store_id) : undefined;
      const data = await KdsDeviceService.listForTenant(Number(req.tenant.id), { store_id: storeId });
      res.json({ data });
    } catch (error: any) {
      console.error('[KdsDeviceController] list error:', error);
      res.status(500).json({ error: 'Failed to list KDS devices' });
    }
  }

  static async createPairingCode(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant || !req.admin) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const { store_id, tenant_order_destination_id, name } = req.body;
      const result = await KdsDeviceService.createPairingCode(Number(req.tenant.id), {
        store_id: Number(store_id),
        tenant_order_destination_id: Number(tenant_order_destination_id),
        name: name ?? null,
        created_by: Number(req.admin.id),
      });
      res.status(201).json({ data: result });
    } catch (error: any) {
      if (error.status) { res.status(error.status).json({ error: error.message }); return; }
      console.error('[KdsDeviceController] createPairingCode error:', error);
      res.status(500).json({ error: 'Failed to create pairing code' });
    }
  }

  static async revoke(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const deviceId = parseInt(req.params.id);
      if (isNaN(deviceId)) { res.status(400).json({ error: 'Invalid device ID' }); return; }
      await KdsDeviceService.revoke(Number(req.tenant.id), deviceId);
      res.json({ message: 'Device revoked' });
    } catch (error: any) {
      if (error.status) { res.status(error.status).json({ error: error.message }); return; }
      console.error('[KdsDeviceController] revoke error:', error);
      res.status(500).json({ error: 'Failed to revoke device' });
    }
  }

  // ---------- Public pairing ----------

  static async pair(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.body;
      const result = await KdsDeviceService.pair(String(code || ''));
      res.json({ data: result });
    } catch (error: any) {
      if (error.status) { res.status(error.status).json({ error: error.message }); return; }
      console.error('[KdsDeviceController] pair error:', error);
      res.status(500).json({ error: 'Failed to pair device' });
    }
  }

  // ---------- Device-authenticated (KDS runtime) ----------

  static async me(req: KdsDeviceRequest, res: Response): Promise<void> {
    if (!req.kdsDevice) { res.status(401).json({ error: 'Not paired' }); return; }
    res.json({ data: req.kdsDevice });
  }

  static async tickets(req: KdsDeviceRequest, res: Response): Promise<void> {
    if (!req.kdsDevice) { res.status(401).json({ error: 'Not paired' }); return; }
    try {
      const language = typeof req.query.language === 'string' ? req.query.language : undefined;
      const tickets = await KdsDisplayService.activeTicketsForDestination(
        req.kdsDevice.tenant_id,
        req.kdsDevice.store_id,
        req.kdsDevice.destination_id,
        { language }
      );
      res.json({ data: tickets });
    } catch (error: any) {
      console.error('[KdsDeviceController] tickets error:', error);
      res.status(500).json({ error: 'Failed to fetch tickets' });
    }
  }

  static async unpairSelf(req: KdsDeviceRequest, res: Response): Promise<void> {
    if (!req.kdsDevice) { res.status(401).json({ error: 'Not paired' }); return; }
    try {
      await KdsDeviceService.unpairSelf(req.kdsDevice.device_id);
      res.json({ message: 'Device unpaired' });
    } catch (error: any) {
      console.error('[KdsDeviceController] unpairSelf error:', error);
      res.status(500).json({ error: 'Failed to unpair device' });
    }
  }
}
