import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import pool from '../config/database.js';

export class TenantLanguageController {
  /**
   * GET /api/tenant/languages
   * Get languages configured for current tenant (for form dropdowns)
   */
  static async getTenantLanguages(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      // Get tenant's configured languages
      const [languages] = await pool.query<any[]>(
        `SELECT 
          l.*,
          tl.is_default,
          tl.is_active as tenant_is_active
        FROM tenant_languages tl
        JOIN languages l ON tl.language_id = l.id
        WHERE tl.tenant_id = ? AND tl.is_active = 1
        ORDER BY tl.is_default DESC, l.sort_order ASC`,
        [req.tenant.id]
      );

      res.json({ data: languages });
    } catch (error: any) {
      console.error('Get tenant languages error:', error);
      res.status(500).json({ error: 'Failed to get tenant languages' });
    }
  }

  /**
   * GET /api/tenant/currencies
   * Get currencies configured for current tenant (for form dropdowns)
   */
  static async getTenantCurrencies(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      // Get tenant's configured currencies
      const [currencies] = await pool.query<any[]>(
        `SELECT 
          c.*,
          tc.is_default,
          tc.is_active as tenant_is_active
        FROM tenant_currencies tc
        JOIN currencies c ON tc.currency_id = c.id
        WHERE tc.tenant_id = ? AND tc.is_active = 1
        ORDER BY tc.is_default DESC, c.name ASC`,
        [req.tenant.id]
      );

      res.json({ data: currencies });
    } catch (error: any) {
      console.error('Get tenant currencies error:', error);
      res.status(500).json({ error: 'Failed to get tenant currencies' });
    }
  }
}
