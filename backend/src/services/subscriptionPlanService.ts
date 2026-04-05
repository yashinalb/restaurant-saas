import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/database.js';

interface SubscriptionPlanData {
  name: string;
  slug: string;
  description?: string;
  price?: number | null;
  currency?: string;
  billing_period: string;
  max_products?: number | null;
  max_stores?: number;
  max_campaigns?: number | null;
  features?: any;
  is_active?: boolean;
  sort_order?: number;
}

export class SubscriptionPlanService {
  /**
   * Get all subscription plans
   */
  static async getAllPlans() {
    const [plans] = await pool.query<RowDataPacket[]>(
      `SELECT 
        sp.*,
        (SELECT COUNT(*) FROM tenants WHERE subscription_plan_id = sp.id) as active_tenants_count,
        (SELECT COUNT(*) FROM tenant_type_subscription_plans WHERE subscription_plan_id = sp.id) as tenant_types_count
      FROM subscription_plans sp
      ORDER BY sp.sort_order ASC, sp.id ASC`
    );

    return plans;
  }

  /**
   * Get subscription plan by ID
   */
  static async getPlanById(planId: number) {
    const [plans] = await pool.query<RowDataPacket[]>(
      `SELECT 
        sp.*,
        (SELECT COUNT(*) FROM tenants WHERE subscription_plan_id = sp.id) as active_tenants_count,
        (SELECT COUNT(*) FROM tenant_type_subscription_plans WHERE subscription_plan_id = sp.id) as tenant_types_count
      FROM subscription_plans sp
      WHERE sp.id = ?`,
      [planId]
    );

    if (plans.length === 0) {
      throw new Error('Subscription plan not found');
    }

    return plans[0];
  }

  /**
   * Create new subscription plan
   */
  static async createPlan(data: SubscriptionPlanData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if slug already exists
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM subscription_plans WHERE slug = ?',
        [data.slug]
      );

      if (existing.length > 0) {
        throw new Error('Subscription plan with this slug already exists');
      }

      // Get next sort order if not provided
      let sortOrder = data.sort_order;
      if (sortOrder === undefined) {
        const [maxOrder] = await connection.query<RowDataPacket[]>(
          'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM subscription_plans'
        );
        sortOrder = maxOrder[0].next_order;
      }

      // Create plan
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO subscription_plans 
         (name, slug, description, price, currency, billing_period, max_products, max_stores, max_campaigns, features, is_active, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.name,
          data.slug,
          data.description || null,
          data.price || null,
          data.currency || 'EUR',
          data.billing_period,
          data.max_products || null,
          data.max_stores || 1,
          data.max_campaigns || null,
          data.features ? JSON.stringify(data.features) : null,
          data.is_active !== undefined ? data.is_active : true,
          sortOrder,
        ]
      );

      await connection.commit();

      return await this.getPlanById(result.insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update subscription plan
   */
  static async updatePlan(planId: number, data: Partial<SubscriptionPlanData>) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if plan exists
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM subscription_plans WHERE id = ?',
        [planId]
      );

      if (existing.length === 0) {
        throw new Error('Subscription plan not found');
      }

      // Check slug uniqueness if being updated
      if (data.slug) {
        const [slugCheck] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM subscription_plans WHERE slug = ? AND id != ?',
          [data.slug, planId]
        );
        if (slugCheck.length > 0) {
          throw new Error('Subscription plan with this slug already exists');
        }
      }

      // Build update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (data.name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(data.name);
      }
      if (data.slug !== undefined) {
        updateFields.push('slug = ?');
        updateValues.push(data.slug);
      }
      if (data.description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(data.description);
      }
      if (data.price !== undefined) {
        updateFields.push('price = ?');
        updateValues.push(data.price);
      }
      if (data.currency !== undefined) {
        updateFields.push('currency = ?');
        updateValues.push(data.currency);
      }
      if (data.billing_period !== undefined) {
        updateFields.push('billing_period = ?');
        updateValues.push(data.billing_period);
      }
      if (data.max_products !== undefined) {
        updateFields.push('max_products = ?');
        updateValues.push(data.max_products);
      }
      if (data.max_stores !== undefined) {
        updateFields.push('max_stores = ?');
        updateValues.push(data.max_stores);
      }
      if (data.max_campaigns !== undefined) {
        updateFields.push('max_campaigns = ?');
        updateValues.push(data.max_campaigns);
      }
      if (data.features !== undefined) {
        updateFields.push('features = ?');
        updateValues.push(JSON.stringify(data.features));
      }
      if (data.is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(data.is_active);
      }
      if (data.sort_order !== undefined) {
        updateFields.push('sort_order = ?');
        updateValues.push(data.sort_order);
      }

      if (updateFields.length > 0) {
        updateValues.push(planId);
        await connection.query(
          `UPDATE subscription_plans SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }

      await connection.commit();

      return await this.getPlanById(planId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete subscription plan (only if not used by any tenant)
   */
  static async deletePlan(planId: number) {
    // Check if plan exists and get usage count
    const [plan] = await pool.query<RowDataPacket[]>(
      `SELECT 
        id,
        (SELECT COUNT(*) FROM tenants WHERE subscription_plan_id = ?) as active_tenants_count
       FROM subscription_plans 
       WHERE id = ?`,
      [planId, planId]
    );

    if (plan.length === 0) {
      throw new Error('Subscription plan not found');
    }

    if (plan[0].active_tenants_count > 0) {
      throw new Error('Cannot delete subscription plan that is used by active tenants');
    }

    // Delete plan (tenant type links will cascade)
    await pool.query('DELETE FROM subscription_plans WHERE id = ?', [planId]);

    return { message: 'Subscription plan deleted successfully' };
  }

  /**
   * Get tenant types linked to a plan
   */
  static async getPlanTenantTypes(planId: number) {
    // Verify plan exists
    const [plan] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM subscription_plans WHERE id = ?',
      [planId]
    );

    if (plan.length === 0) {
      throw new Error('Subscription plan not found');
    }

    // Get linked tenant types
    const [linkedTypes] = await pool.query<RowDataPacket[]>(
      `SELECT 
        ttsp.tenant_type_id,
        ttsp.is_recommended,
        ttsp.custom_price,
        ttsp.custom_features,
        ttsp.sort_order,
        ttsp.created_at,
        tt.code as tenant_type_code,
        tt.icon_url as tenant_type_icon,
        tt.is_active as tenant_type_is_active
      FROM tenant_type_subscription_plans ttsp
      JOIN tenant_types tt ON ttsp.tenant_type_id = tt.id
      WHERE ttsp.subscription_plan_id = ?
      ORDER BY ttsp.sort_order ASC`,
      [planId]
    );

    // Get translations for each linked type
    for (const type of linkedTypes) {
      const [translations] = await pool.query<RowDataPacket[]>(
        `SELECT 
          ttt.*,
          l.code as language_code,
          l.name as language_name
        FROM tenant_type_translations ttt
        JOIN languages l ON ttt.language_id = l.id
        WHERE ttt.tenant_type_id = ?
        ORDER BY l.sort_order`,
        [type.tenant_type_id]
      );
      type.translations = translations;
    }

    return linkedTypes;
  }

  /**
   * Update plan-tenant type links
   */
  static async updatePlanTenantTypes(
    planId: number,
    tenantTypes: Array<{
      tenant_type_id: number;
      is_recommended: boolean;
      custom_price?: number | null;
      custom_features?: any;
      sort_order: number;
    }>
  ) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Verify plan exists
      const [plan] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM subscription_plans WHERE id = ?',
        [planId]
      );

      if (plan.length === 0) {
        throw new Error('Subscription plan not found');
      }

      // Delete all existing links
      await connection.query(
        'DELETE FROM tenant_type_subscription_plans WHERE subscription_plan_id = ?',
        [planId]
      );

      // Insert new links
      if (tenantTypes.length > 0) {
        for (const type of tenantTypes) {
          // Verify tenant type exists
          const [tenantType] = await connection.query<RowDataPacket[]>(
            'SELECT id FROM tenant_types WHERE id = ?',
            [type.tenant_type_id]
          );

          if (tenantType.length === 0) {
            throw new Error(`Tenant type ${type.tenant_type_id} not found`);
          }

          await connection.query(
            `INSERT INTO tenant_type_subscription_plans 
             (tenant_type_id, subscription_plan_id, is_recommended, custom_price, custom_features, sort_order)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              type.tenant_type_id,
              planId,
              type.is_recommended,
              type.custom_price || null,
              type.custom_features ? JSON.stringify(type.custom_features) : null,
              type.sort_order,
            ]
          );
        }
      }

      await connection.commit();

      return { message: 'Tenant type links updated successfully' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get plans for a specific tenant type (with custom pricing)
   */
  static async getPlansForTenantType(tenantTypeId: number) {
    const [plans] = await pool.query<RowDataPacket[]>(
      `SELECT 
        sp.*,
        ttsp.is_recommended,
        ttsp.custom_price,
        ttsp.custom_features,
        ttsp.sort_order as tenant_type_sort_order,
        COALESCE(ttsp.custom_price, sp.price) as effective_price
      FROM subscription_plans sp
      JOIN tenant_type_subscription_plans ttsp ON sp.id = ttsp.subscription_plan_id
      WHERE ttsp.tenant_type_id = ? AND sp.is_active = 1
      ORDER BY ttsp.sort_order ASC`,
      [tenantTypeId]
    );

    return plans;
  }
}
