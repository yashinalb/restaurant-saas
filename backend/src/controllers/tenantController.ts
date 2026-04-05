import { Response } from 'express';
import { TenantService } from '../services/tenantService.js';
import { AuthRequest } from '../middleware/auth.js';

export class TenantController {
  /**
   * GET /api/admin/tenants
   */
  static async getAllTenants(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenants = await TenantService.getAllTenants();
      res.json({ data: tenants });
    } catch (error: any) {
      console.error('Get tenants error:', error);
      res.status(500).json({ error: 'Failed to get tenants' });
    }
  }

  /**
   * GET /api/admin/tenants/:id
   */
  static async getTenantById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = parseInt(req.params.id);

      if (isNaN(tenantId)) {
        res.status(400).json({ error: 'Invalid tenant ID' });
        return;
      }

      const tenant = await TenantService.getTenantById(tenantId);
      res.json({ data: tenant });
    } catch (error: any) {
      console.error('Get tenant error:', error);
      if (error.message === 'Tenant not found') {
        res.status(404).json({ error: 'Tenant not found' });
      } else {
        res.status(500).json({ error: 'Failed to get tenant' });
      }
    }
  }

  /**
   * POST /api/admin/tenants
   */
  static async createTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        name,
        slug,
        domain,
        subdomain,
        subscription_plan_id,
        tenant_type_id,
        logo_url,
        favicon_url,
        primary_color,
        secondary_color,
        default_language_id,
        default_currency_id,
        contact_email,
        contact_phone,
        is_active,
        trial_ends_at,
        subscription_ends_at,
        settings,
      } = req.body;

      // Validation
      if (!name || !slug) {
        res.status(400).json({ error: 'Name and slug are required' });
        return;
      }

      const tenant = await TenantService.createTenant({
        name,
        slug,
        domain,
        subdomain,
        subscription_plan_id,
        tenant_type_id,
        logo_url,
        favicon_url,
        primary_color,
        secondary_color,
        default_language_id,
        default_currency_id,
        contact_email,
        contact_phone,
        is_active,
        trial_ends_at,
        subscription_ends_at,
        settings,
      });

      res.status(201).json({
        message: 'Tenant created successfully',
        data: tenant,
      });
    } catch (error: any) {
      console.error('Create tenant error:', error);
      if (
        error.message.includes('already exists') ||
        error.message.includes('slug') ||
        error.message.includes('domain') ||
        error.message.includes('subdomain')
      ) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create tenant' });
      }
    }
  }

  /**
   * PUT /api/admin/tenants/:id
   */
  static async updateTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = parseInt(req.params.id);

      if (isNaN(tenantId)) {
        res.status(400).json({ error: 'Invalid tenant ID' });
        return;
      }

      const {
        name,
        slug,
        domain,
        subdomain,
        subscription_plan_id,
        tenant_type_id,
        logo_url,
        favicon_url,
        primary_color,
        secondary_color,
        default_language_id,
        default_currency_id,
        contact_email,
        contact_phone,
        is_active,
        trial_ends_at,
        subscription_ends_at,
        settings,
      } = req.body;

      const tenant = await TenantService.updateTenant(tenantId, {
        name,
        slug,
        domain,
        subdomain,
        subscription_plan_id,
        tenant_type_id,
        logo_url,
        favicon_url,
        primary_color,
        secondary_color,
        default_language_id,
        default_currency_id,
        contact_email,
        contact_phone,
        is_active,
        trial_ends_at,
        subscription_ends_at,
        settings,
      });

      res.json({
        message: 'Tenant updated successfully',
        data: tenant,
      });
    } catch (error: any) {
      console.error('Update tenant error:', error);
      if (error.message === 'Tenant not found') {
        res.status(404).json({ error: 'Tenant not found' });
      } else if (
        error.message.includes('already exists') ||
        error.message.includes('slug') ||
        error.message.includes('domain') ||
        error.message.includes('subdomain')
      ) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update tenant' });
      }
    }
  }

  /**
   * DELETE /api/admin/tenants/:id
   */
  static async deleteTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = parseInt(req.params.id);

      if (isNaN(tenantId)) {
        res.status(400).json({ error: 'Invalid tenant ID' });
        return;
      }

      const result = await TenantService.deleteTenant(tenantId);
      res.json(result);
    } catch (error: any) {
      console.error('Delete tenant error:', error);
      if (error.message === 'Tenant not found') {
        res.status(404).json({ error: 'Tenant not found' });
      } else {
        res.status(500).json({ error: 'Failed to delete tenant' });
      }
    }
  }

  /**
   * GET /api/admin/tenants/:id/subscription-status
   */
  static async getTenantSubscriptionStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = parseInt(req.params.id);

      if (isNaN(tenantId)) {
        res.status(400).json({ error: 'Invalid tenant ID' });
        return;
      }

      const status = await TenantService.getTenantSubscriptionStatus(tenantId);
      res.json({ data: status });
    } catch (error: any) {
      console.error('Get subscription status error:', error);
      if (error.message === 'Tenant not found') {
        res.status(404).json({ error: 'Tenant not found' });
      } else {
        res.status(500).json({ error: 'Failed to get subscription status' });
      }
    }
  }

  // Add these methods to the TenantController class in tenantController.ts

  /**
   * GET /api/admin/tenants/:id/languages
   */
  static async getTenantLanguages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = parseInt(req.params.id);

      if (isNaN(tenantId)) {
        res.status(400).json({ error: 'Invalid tenant ID' });
        return;
      }

      const languages = await TenantService.getTenantLanguages(tenantId);
      res.json({ data: languages });
    } catch (error: any) {
      console.error('Get tenant languages error:', error);
      res.status(500).json({ error: 'Failed to get tenant languages' });
    }
  }

  /**
   * PUT /api/admin/tenants/:id/languages
   */
  static async updateTenantLanguages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = parseInt(req.params.id);

      if (isNaN(tenantId)) {
        res.status(400).json({ error: 'Invalid tenant ID' });
        return;
      }

      const { languages } = req.body;

      if (!Array.isArray(languages)) {
        res.status(400).json({ error: 'Languages must be an array' });
        return;
      }

      const result = await TenantService.updateTenantLanguages(tenantId, languages);
      res.json(result);
    } catch (error: any) {
      console.error('Update tenant languages error:', error);
      if (error.message === 'Tenant not found') {
        res.status(404).json({ error: 'Tenant not found' });
      } else {
        res.status(500).json({ error: error.message || 'Failed to update tenant languages' });
      }
    }
  }

  /**
   * GET /api/admin/tenants/:id/currencies
   */
  static async getTenantCurrencies(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = parseInt(req.params.id);

      if (isNaN(tenantId)) {
        res.status(400).json({ error: 'Invalid tenant ID' });
        return;
      }

      const currencies = await TenantService.getTenantCurrencies(tenantId);
      res.json({ data: currencies });
    } catch (error: any) {
      console.error('Get tenant currencies error:', error);
      res.status(500).json({ error: 'Failed to get tenant currencies' });
    }
  }

  /**
   * PUT /api/admin/tenants/:id/currencies
   */
  static async updateTenantCurrencies(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = parseInt(req.params.id);

      if (isNaN(tenantId)) {
        res.status(400).json({ error: 'Invalid tenant ID' });
        return;
      }

      const { currencies } = req.body;

      if (!Array.isArray(currencies)) {
        res.status(400).json({ error: 'Currencies must be an array' });
        return;
      }

      const result = await TenantService.updateTenantCurrencies(tenantId, currencies);
      res.json(result);
    } catch (error: any) {
      console.error('Update tenant currencies error:', error);
      if (error.message === 'Tenant not found') {
        res.status(404).json({ error: 'Tenant not found' });
      } else {
        res.status(500).json({ error: error.message || 'Failed to update tenant currencies' });
      }
    }
  }







  
}
