import { Request, Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { PosQrService } from '../services/posQrService.js';

function pickBaseUrl(req: Request): string {
  const fromHeader = req.headers['x-public-base-url'];
  if (typeof fromHeader === 'string' && fromHeader) return fromHeader;
  const env = process.env.PUBLIC_APP_URL;
  if (env) return env;
  const proto = (req.headers['x-forwarded-proto'] as string) || (req as any).protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  return `${proto}://${host}`;
}

export class PosQrController {
  static async generate(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) { res.status(400).json({ error: 'Invalid order ID' }); return; }
      const ttl = req.body?.ttl_minutes ? Number(req.body.ttl_minutes) : undefined;
      const result = await PosQrService.generateForOrder(Number(req.tenant.id), orderId, {
        ttl_minutes: ttl,
        base_url: pickBaseUrl(req),
      });
      res.status(201).json({ data: result, message: 'QR token generated' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      console.error('[PosQrController] generate error:', error);
      res.status(500).json({ error: 'Failed to generate QR token' });
    }
  }

  static async publicInvoice(req: Request, res: Response): Promise<void> {
    try {
      const token = String(req.params.token || '');
      const data = await PosQrService.getInvoiceByToken(token);
      res.json({ data });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 410) { res.status(410).json({ error: error.message, code: error.code }); return; }
      console.error('[PosQrController] publicInvoice error:', error);
      res.status(500).json({ error: 'Failed to load invoice' });
    }
  }
}
