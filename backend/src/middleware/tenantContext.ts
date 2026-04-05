import { Request, Response, NextFunction } from 'express';
import pool from '../config/database.js';
import { Tenant } from '../types/index.js';

export interface TenantRequest extends Request {
  tenant?: Tenant;
}

/**
 * Tenant Context Middleware
 * Automatically detects tenant from:
 * 1. Subdomain (e.g., demo.yourplatform.com)
 * 2. Custom domain (e.g., deals.lidlcyprus.com)
 * 3. X-Tenant-ID header (for admin panel)
 */
export async function tenantContext(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let tenant: Tenant | null = null;

    // Option 1: Check for X-Tenant-ID header (used by admin panel)
    const tenantIdHeader = req.headers['x-tenant-id'];
    if (tenantIdHeader) {
      const [rows] = await pool.query<any[]>(
        'SELECT * FROM tenants WHERE id = ? AND is_active = 1',
        [tenantIdHeader]
      );
      if (rows.length > 0) {
        tenant = rows[0] as Tenant;
      }
    }

    // Option 2: Check subdomain
    if (!tenant) {
      const host = req.hostname;
      const parts = host.split('.');
      
      // If subdomain exists (e.g., demo.yourplatform.com)
      if (parts.length >= 3) {
        const subdomain = parts[0];
        const [rows] = await pool.query<any[]>(
          'SELECT * FROM tenants WHERE subdomain = ? AND is_active = 1',
          [subdomain]
        );
        if (rows.length > 0) {
          tenant = rows[0] as Tenant;
        }
      }
    }

    // Option 3: Check custom domain
    if (!tenant) {
      const domain = req.hostname;
      const [rows] = await pool.query<any[]>(
        'SELECT * FROM tenants WHERE domain = ? AND is_active = 1',
        [domain]
      );
      if (rows.length > 0) {
        tenant = rows[0] as Tenant;
      }
    }

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    // Check subscription status
    const [subscriptionRows] = await pool.query<any[]>(
      `SELECT * FROM tenant_subscriptions 
       WHERE tenant_id = ? 
       AND status = 'active' 
       AND expires_at > NOW()
       ORDER BY expires_at DESC 
       LIMIT 1`,
      [tenant.id]
    );

    if (subscriptionRows.length === 0) {
      res.status(403).json({ 
        error: 'Subscription expired', 
        message: 'Please renew your subscription to continue' 
      });
      return;
    }

    req.tenant = tenant;
    next();
  } catch (error) {
    console.error('Tenant context error:', error);
    res.status(500).json({ error: 'Failed to load tenant context' });
  }
}

/**
 * Optional tenant context (doesn't fail if no tenant found)
 * Useful for admin routes that may or may not need tenant context
 */
export async function optionalTenantContext(
  req: TenantRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantIdHeader = req.headers['x-tenant-id'];
    if (tenantIdHeader) {
      const [rows] = await pool.query<any[]>(
        'SELECT * FROM tenants WHERE id = ? AND is_active = 1',
        [tenantIdHeader]
      );
      if (rows.length > 0) {
        req.tenant = rows[0] as Tenant;
      }
    }
    next();
  } catch (error) {
    next(); // Continue even if tenant loading fails
  }
}
