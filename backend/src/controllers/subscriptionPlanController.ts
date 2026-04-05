import { Response } from 'express';
import { SubscriptionPlanService } from '../services/subscriptionPlanService.js';
import { AuthRequest } from '../middleware/auth.js';

export class SubscriptionPlanController {
  /**
   * GET /api/admin/subscription-plans
   */
  static async getAllPlans(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const plans = await SubscriptionPlanService.getAllPlans();
      res.json({ data: plans });
    } catch (error: any) {
      console.error('Get subscription plans error:', error);
      res.status(500).json({ error: 'Failed to get subscription plans' });
    }
  }

  /**
   * GET /api/admin/subscription-plans/:id
   */
  static async getPlanById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const planId = parseInt(req.params.id);

      if (isNaN(planId)) {
        res.status(400).json({ error: 'Invalid plan ID' });
        return;
      }

      const plan = await SubscriptionPlanService.getPlanById(planId);
      res.json({ data: plan });
    } catch (error: any) {
      console.error('Get subscription plan error:', error);
      if (error.message === 'Subscription plan not found') {
        res.status(404).json({ error: 'Subscription plan not found' });
      } else {
        res.status(500).json({ error: 'Failed to get subscription plan' });
      }
    }
  }

  /**
   * POST /api/admin/subscription-plans
   */
  static async createPlan(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, slug, description, price, currency, billing_period, max_products, max_stores, max_campaigns, features, is_active, sort_order } = req.body;

      // Validation
      if (!name || !slug || price === undefined || !billing_period) {
        res.status(400).json({ error: 'Name, slug, price, and billing_period are required' });
        return;
      }

      const plan = await SubscriptionPlanService.createPlan({
        name,
        slug,
        description,
        price,
        currency,
        billing_period,
        max_products,
        max_stores,
        max_campaigns,
        features,
        is_active,
        sort_order,
      });

      res.status(201).json({
        message: 'Subscription plan created successfully',
        data: plan,
      });
    } catch (error: any) {
      console.error('Create subscription plan error:', error);
      if (error.message === 'Subscription plan with this slug already exists') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create subscription plan' });
      }
    }
  }

  /**
   * PUT /api/admin/subscription-plans/:id
   */
  static async updatePlan(req: AuthRequest, res: Response): Promise<void> {
    try {
      const planId = parseInt(req.params.id);

      if (isNaN(planId)) {
        res.status(400).json({ error: 'Invalid plan ID' });
        return;
      }

      const { name, slug, description, price, currency, billing_period, max_products, max_stores, max_campaigns, features, is_active, sort_order } = req.body;

      const plan = await SubscriptionPlanService.updatePlan(planId, {
        name,
        slug,
        description,
        price,
        currency,
        billing_period,
        max_products,
        max_stores,
        max_campaigns,
        features,
        is_active,
        sort_order,
      });

      res.json({
        message: 'Subscription plan updated successfully',
        data: plan,
      });
    } catch (error: any) {
      console.error('Update subscription plan error:', error);
      if (error.message === 'Subscription plan not found') {
        res.status(404).json({ error: 'Subscription plan not found' });
      } else if (error.message === 'Subscription plan with this slug already exists') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update subscription plan' });
      }
    }
  }

  /**
   * DELETE /api/admin/subscription-plans/:id
   */
  static async deletePlan(req: AuthRequest, res: Response): Promise<void> {
    try {
      const planId = parseInt(req.params.id);

      if (isNaN(planId)) {
        res.status(400).json({ error: 'Invalid plan ID' });
        return;
      }

      const result = await SubscriptionPlanService.deletePlan(planId);
      res.json(result);
    } catch (error: any) {
      console.error('Delete subscription plan error:', error);
      if (error.message === 'Subscription plan not found') {
        res.status(404).json({ error: 'Subscription plan not found' });
      } else if (error.message === 'Cannot delete subscription plan that is used by active tenants') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete subscription plan' });
      }
    }
  }

  /**
   * GET /api/admin/subscription-plans/:id/tenant-types
   */
  static async getPlanTenantTypes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const planId = parseInt(req.params.id);

      if (isNaN(planId)) {
        res.status(400).json({ error: 'Invalid plan ID' });
        return;
      }

      const tenantTypes = await SubscriptionPlanService.getPlanTenantTypes(planId);
      res.json({ data: tenantTypes });
    } catch (error: any) {
      console.error('Get plan tenant types error:', error);
      if (error.message === 'Subscription plan not found') {
        res.status(404).json({ error: 'Subscription plan not found' });
      } else {
        res.status(500).json({ error: 'Failed to get tenant types' });
      }
    }
  }

  /**
   * PUT /api/admin/subscription-plans/:id/tenant-types
   */
  static async updatePlanTenantTypes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const planId = parseInt(req.params.id);

      if (isNaN(planId)) {
        res.status(400).json({ error: 'Invalid plan ID' });
        return;
      }

      const { tenant_types } = req.body;

      if (!Array.isArray(tenant_types)) {
        res.status(400).json({ error: 'tenant_types must be an array' });
        return;
      }

      const result = await SubscriptionPlanService.updatePlanTenantTypes(planId, tenant_types);

      res.json(result);
    } catch (error: any) {
      console.error('Update plan tenant types error:', error);
      if (
        error.message === 'Subscription plan not found' ||
        error.message.includes('Tenant type') && error.message.includes('not found')
      ) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update tenant type links' });
      }
    }
  }

  /**
   * GET /api/admin/tenant-types/:id/subscription-plans
   */
  static async getPlansForTenantType(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantTypeId = parseInt(req.params.id);

      if (isNaN(tenantTypeId)) {
        res.status(400).json({ error: 'Invalid tenant type ID' });
        return;
      }

      const plans = await SubscriptionPlanService.getPlansForTenantType(tenantTypeId);
      res.json({ data: plans });
    } catch (error: any) {
      console.error('Get plans for tenant type error:', error);
      res.status(500).json({ error: 'Failed to get subscription plans' });
    }
  }
}
