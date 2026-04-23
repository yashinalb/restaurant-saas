import { Response, NextFunction } from 'express';
import { KdsDeviceService } from '../services/kdsDeviceService.js';
import { KdsDeviceRequest } from '../controllers/kdsDeviceController.js';

/**
 * Authenticate a request coming from a paired KDS device (45.1).
 * Token is sent via `X-KDS-Device-Token` header (or `Authorization: KDS <token>`).
 */
export async function authenticateKdsDevice(
  req: KdsDeviceRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | null = null;
    const headerToken = req.headers['x-kds-device-token'];
    if (typeof headerToken === 'string') token = headerToken;
    if (!token) {
      const authz = req.headers.authorization;
      if (authz && authz.startsWith('KDS ')) token = authz.slice(4);
    }
    if (!token) { res.status(401).json({ error: 'Device token required' }); return; }

    const ctx = await KdsDeviceService.authenticateToken(token);
    if (!ctx) { res.status(401).json({ error: 'Invalid or revoked device token' }); return; }
    req.kdsDevice = ctx;
    next();
  } catch (error) {
    console.error('[kdsDeviceAuth] error:', error);
    res.status(500).json({ error: 'Device authentication failed' });
  }
}
