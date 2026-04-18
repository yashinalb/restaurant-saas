import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { PosReceiptService } from '../services/posReceiptService.js';

function pickBaseUrl(req: TenantAuthRequest): string {
  const fromHeader = req.headers['x-public-base-url'];
  if (typeof fromHeader === 'string' && fromHeader) return fromHeader;
  const env = process.env.PUBLIC_APP_URL;
  if (env) return env;
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  return `${proto}://${host}`;
}

export class PosReceiptController {
  static async getReceipt(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) { res.status(400).json({ error: 'Invalid order ID' }); return; }
      const data = await PosReceiptService.getReceipt(Number(req.tenant.id), orderId, {
        language: req.query.language ? String(req.query.language) : undefined,
        base_url: pickBaseUrl(req),
      });
      res.json({ data });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      console.error('[PosReceiptController] getReceipt error:', error);
      res.status(500).json({ error: 'Failed to build receipt' });
    }
  }

  static async printThermal(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) { res.status(400).json({ error: 'Invalid order ID' }); return; }
      const result = await PosReceiptService.printToThermal(Number(req.tenant.id), orderId, {
        language: req.body?.language ? String(req.body.language) : (req.query.language ? String(req.query.language) : undefined),
        base_url: pickBaseUrl(req),
      });
      if (!result.printed) {
        res.status(502).json({ error: 'Thermal print failed', ...result });
        return;
      }
      res.json({ data: result, message: 'Receipt printed' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      console.error('[PosReceiptController] printThermal error:', error);
      res.status(500).json({ error: 'Failed to print receipt' });
    }
  }
}
