import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { PosSessionService } from '../services/posSessionService.js';

function resolveIp(req: TenantAuthRequest): string | null {
  const xff = (req.headers['x-forwarded-for'] as string) || '';
  const ip = xff.split(',')[0]?.trim() || req.ip || (req.socket as any)?.remoteAddress || null;
  return ip;
}

export class PosSessionController {
  static async login(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const { pin, store_id, device_identifier } = req.body;
      const ip_address = resolveIp(req);
      const session = await PosSessionService.login(tenantId, {
        pin: String(pin ?? ''),
        store_id: Number(store_id),
        device_identifier: device_identifier ?? null,
        ip_address,
      });
      res.status(201).json({ data: session, message: 'Waiter logged in' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      if (error.status === 401) { res.status(401).json({ error: error.message }); return; }
      if (error.status === 403) { res.status(403).json({ error: error.message }); return; }
      console.error('[PosSessionController] login error:', error);
      res.status(500).json({ error: 'Failed to log in waiter' });
    }
  }

  static async logout(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const sessionId = parseInt(req.params.id);
      if (isNaN(sessionId)) { res.status(400).json({ error: 'Invalid session ID' }); return; }
      const done = await PosSessionService.logout(tenantId, sessionId);
      if (!done) { res.status(404).json({ error: 'Active session not found' }); return; }
      res.json({ message: 'Waiter logged out' });
    } catch (error: any) {
      console.error('[PosSessionController] logout error:', error);
      res.status(500).json({ error: 'Failed to log out waiter' });
    }
  }

  static async getActiveSession(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const device = String(req.query.device_identifier ?? '');
      if (!device) { res.status(400).json({ error: 'device_identifier is required' }); return; }
      const session = await PosSessionService.getActiveSessionForDevice(tenantId, device);
      res.json({ data: session });
    } catch (error: any) {
      console.error('[PosSessionController] getActiveSession error:', error);
      res.status(500).json({ error: 'Failed to fetch active session' });
    }
  }
}
