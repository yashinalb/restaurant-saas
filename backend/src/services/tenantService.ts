import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/database.js';

interface CreateTenantData {
  name: string;
  slug: string;
  domain?: string;
  subdomain?: string;
  subscription_plan_id?: number | null;
  tenant_type_id?: number | null;
  logo_url?: string;
  favicon_url?: string;
  primary_color?: string;
  secondary_color?: string;
  default_language_id?: number | null;
  default_currency_id?: number | null;
  contact_email?: string;
  contact_phone?: string;
  is_active?: boolean;
  trial_ends_at?: string | null;
  subscription_ends_at?: string | null;
  settings?: any;
}

interface UpdateTenantData extends Partial<CreateTenantData> {}

export class TenantService {
  /**
   * Get all tenants with related info
   */
  static async getAllTenants() {
    const [tenants] = await pool.query<RowDataPacket[]>(
      `SELECT 
        t.*,
        sp.name as subscription_plan_name,
        sp.slug as subscription_plan_slug,
        tt.code as tenant_type_code,
        l.code as default_language_code,
        l.name as default_language_name,
        c.code as default_currency_code,
        c.symbol as default_currency_symbol,
        (SELECT COUNT(*) FROM tenant_languages WHERE tenant_id = t.id) as languages_count,
        (SELECT COUNT(*) FROM tenant_currencies WHERE tenant_id = t.id) as currencies_count
      FROM tenants t
      LEFT JOIN subscription_plans sp ON t.subscription_plan_id = sp.id
      LEFT JOIN tenant_types tt ON t.tenant_type_id = tt.id
      LEFT JOIN languages l ON t.default_language_id = l.id
      LEFT JOIN currencies c ON t.default_currency_id = c.id
      ORDER BY t.created_at DESC`
    );

    // Get tenant type translations
    for (const tenant of tenants) {
      if (tenant.tenant_type_id) {
        const [typeTranslations] = await pool.query<RowDataPacket[]>(
          `SELECT ttt.name, l.code as language_code
           FROM tenant_type_translations ttt
           JOIN languages l ON ttt.language_id = l.id
           WHERE ttt.tenant_type_id = ?
           LIMIT 1`,
          [tenant.tenant_type_id]
        );
        if (typeTranslations.length > 0) {
          tenant.tenant_type_name = typeTranslations[0].name;
        }
      }
    }

    return tenants;
  }

  /**
   * Get tenant by ID with full details
   */
  static async getTenantById(tenantId: number) {
    const [tenants] = await pool.query<RowDataPacket[]>(
      `SELECT 
        t.*,
        sp.name as subscription_plan_name,
        sp.slug as subscription_plan_slug,
        sp.price as subscription_plan_price,
        sp.currency as subscription_plan_currency,
        tt.code as tenant_type_code,
        l.code as default_language_code,
        l.name as default_language_name,
        c.code as default_currency_code,
        c.symbol as default_currency_symbol
      FROM tenants t
      LEFT JOIN subscription_plans sp ON t.subscription_plan_id = sp.id
      LEFT JOIN tenant_types tt ON t.tenant_type_id = tt.id
      LEFT JOIN languages l ON t.default_language_id = l.id
      LEFT JOIN currencies c ON t.default_currency_id = c.id
      WHERE t.id = ?`,
      [tenantId]
    );

    if (tenants.length === 0) {
      throw new Error('Tenant not found');
    }

    const tenant = tenants[0];

    // Get tenant type name
    if (tenant.tenant_type_id) {
      const [typeTranslations] = await pool.query<RowDataPacket[]>(
        `SELECT ttt.name, l.code as language_code
         FROM tenant_type_translations ttt
         JOIN languages l ON ttt.language_id = l.id
         WHERE ttt.tenant_type_id = ?
         LIMIT 1`,
        [tenant.tenant_type_id]
      );
      if (typeTranslations.length > 0) {
        tenant.tenant_type_name = typeTranslations[0].name;
      }
    }

    // Get tenant languages
    const [languages] = await pool.query<RowDataPacket[]>(
      `SELECT tl.*, l.code, l.name, l.native_name
       FROM tenant_languages tl
       JOIN languages l ON tl.language_id = l.id
       WHERE tl.tenant_id = ?
       ORDER BY tl.is_default DESC, l.name ASC`,
      [tenantId]
    );
    tenant.languages = languages;

    // Get tenant currencies
    const [currencies] = await pool.query<RowDataPacket[]>(
      `SELECT tc.*, c.code, c.name, c.symbol
       FROM tenant_currencies tc
       JOIN currencies c ON tc.currency_id = c.id
       WHERE tc.tenant_id = ?
       ORDER BY tc.is_default DESC, c.code ASC`,
      [tenantId]
    );
    tenant.currencies = currencies;

    return tenant;
  }

  /**
   * Create new tenant
   */
  static async createTenant(data: CreateTenantData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check slug uniqueness
      const [existingSlug] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM tenants WHERE slug = ?',
        [data.slug]
      );
      if (existingSlug.length > 0) {
        throw new Error('Tenant with this slug already exists');
      }

      // Check domain uniqueness if provided
      if (data.domain) {
        const [existingDomain] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM tenants WHERE domain = ?',
          [data.domain]
        );
        if (existingDomain.length > 0) {
          throw new Error('Tenant with this domain already exists');
        }
      }

      // Check subdomain uniqueness if provided
      if (data.subdomain) {
        const [existingSubdomain] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM tenants WHERE subdomain = ?',
          [data.subdomain]
        );
        if (existingSubdomain.length > 0) {
          throw new Error('Tenant with this subdomain already exists');
        }
      }

      // Create tenant
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO tenants (
          name, slug, domain, subdomain, subscription_plan_id, tenant_type_id,
          logo_url, favicon_url, primary_color, secondary_color,
          default_language_id, default_currency_id, contact_email, contact_phone,
          is_active, trial_ends_at, subscription_ends_at, settings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.name,
          data.slug,
          data.domain || null,
          data.subdomain || null,
          data.subscription_plan_id || null,
          data.tenant_type_id || null,
          data.logo_url || null,
          data.favicon_url || null,
          data.primary_color || '#0050AA',
          data.secondary_color || '#FFCC00',
          data.default_language_id || null,
          data.default_currency_id || null,
          data.contact_email || null,
          data.contact_phone || null,
          data.is_active !== undefined ? data.is_active : true,
          data.trial_ends_at ? new Date(data.trial_ends_at).toISOString().slice(0, 19).replace('T', ' ') : null,
          data.subscription_ends_at ? new Date(data.subscription_ends_at).toISOString().slice(0, 19).replace('T', ' ') : null,
          data.settings ? JSON.stringify(data.settings) : null,
        ]
      );

      await connection.commit();

      return await this.getTenantById(result.insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update tenant
   */
  static async updateTenant(tenantId: number, data: UpdateTenantData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if tenant exists
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM tenants WHERE id = ?',
        [tenantId]
      );
      if (existing.length === 0) {
        throw new Error('Tenant not found');
      }

      // Check slug uniqueness if being updated
      if (data.slug) {
        const [slugCheck] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM tenants WHERE slug = ? AND id != ?',
          [data.slug, tenantId]
        );
        if (slugCheck.length > 0) {
          throw new Error('Tenant with this slug already exists');
        }
      }

      // Check domain uniqueness if being updated
      if (data.domain) {
        const [domainCheck] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM tenants WHERE domain = ? AND id != ?',
          [data.domain, tenantId]
        );
        if (domainCheck.length > 0) {
          throw new Error('Tenant with this domain already exists');
        }
      }

      // Check subdomain uniqueness if being updated
      if (data.subdomain) {
        const [subdomainCheck] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM tenants WHERE subdomain = ? AND id != ?',
          [data.subdomain, tenantId]
        );
        if (subdomainCheck.length > 0) {
          throw new Error('Tenant with this subdomain already exists');
        }
      }

      // Build update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      const fieldMappings: { [key: string]: any } = {
        name: data.name,
        slug: data.slug,
        domain: data.domain,
        subdomain: data.subdomain,
        subscription_plan_id: data.subscription_plan_id,
        tenant_type_id: data.tenant_type_id,
        logo_url: data.logo_url,
        favicon_url: data.favicon_url,
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        default_language_id: data.default_language_id,
        default_currency_id: data.default_currency_id,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        is_active: data.is_active,
      };

      for (const [field, value] of Object.entries(fieldMappings)) {
        if (value !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(value);
        }
      }

      if (data.trial_ends_at !== undefined) {
        updateFields.push('trial_ends_at = ?');
        updateValues.push(data.trial_ends_at ? new Date(data.trial_ends_at).toISOString().slice(0, 19).replace('T', ' ') : null);
      }
      if (data.subscription_ends_at !== undefined) {
        updateFields.push('subscription_ends_at = ?');
        updateValues.push(data.subscription_ends_at ? new Date(data.subscription_ends_at).toISOString().slice(0, 19).replace('T', ' ') : null);
      }

      if (data.settings !== undefined) {
        updateFields.push('settings = ?');
        updateValues.push(JSON.stringify(data.settings));
      }

      if (updateFields.length > 0) {
        updateValues.push(tenantId);
        await connection.query(
          `UPDATE tenants SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }

      await connection.commit();

      return await this.getTenantById(tenantId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete tenant
   */
  static async deleteTenant(tenantId: number) {
    const [tenant] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM tenants WHERE id = ?',
      [tenantId]
    );

    if (tenant.length === 0) {
      throw new Error('Tenant not found');
    }

    // Delete tenant (languages, currencies, and subscriptions will cascade)
    await pool.query('DELETE FROM tenants WHERE id = ?', [tenantId]);

    return { message: 'Tenant deleted successfully' };
  }

  /**
   * Get subscription status for a tenant
   */
  static async getTenantSubscriptionStatus(tenantId: number) {
    const [tenant] = await pool.query<RowDataPacket[]>(
      `SELECT 
        t.id,
        t.name,
        t.trial_ends_at,
        t.subscription_ends_at,
        t.is_active,
        sp.name as plan_name,
        sp.price as plan_price,
        sp.currency as plan_currency
      FROM tenants t
      LEFT JOIN subscription_plans sp ON t.subscription_plan_id = sp.id
      WHERE t.id = ?`,
      [tenantId]
    );

    if (tenant.length === 0) {
      throw new Error('Tenant not found');
    }

    const now = new Date();
    const tenantData = tenant[0];
    
    let status = 'active';
    
    if (tenantData.trial_ends_at && new Date(tenantData.trial_ends_at) > now) {
      status = 'trial';
    } else if (tenantData.subscription_ends_at && new Date(tenantData.subscription_ends_at) < now) {
      status = 'expired';
    } else if (!tenantData.is_active) {
      status = 'inactive';
    }

    return {
      ...tenantData,
      status,
    };
  }
  // Add these methods to the TenantService class in tenantService.ts

  /**
   * Get tenant languages
   */
  /**
   * Get tenant languages
   */
  static async getTenantLanguages(tenantId: number) {
    const [languages] = await pool.query<RowDataPacket[]>(
      `SELECT tl.*, l.code, l.name, l.native_name
       FROM tenant_languages tl
       JOIN languages l ON tl.language_id = l.id
       WHERE tl.tenant_id = ?
       ORDER BY tl.is_default DESC, l.name ASC`,
      [tenantId]
    );
    return languages;
  }

  /**
   * Update tenant languages
   */
  static async updateTenantLanguages(
    tenantId: number,
    languages: Array<{
      language_id: number;
      is_default: boolean;
      is_active: boolean;
    }>
  ) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Verify tenant exists
      const [tenant] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM tenants WHERE id = ?',
        [tenantId]
      );
      if (tenant.length === 0) {
        throw new Error('Tenant not found');
      }

      // Delete all existing language links
      await connection.query(
        'DELETE FROM tenant_languages WHERE tenant_id = ?',
        [tenantId]
      );

      // Ensure only one default language
      let hasDefault = false;
      const processedLanguages = languages.map((lang, _index) => {
        const isDefault = !hasDefault && lang.is_default;
        if (isDefault) hasDefault = true;
        return { ...lang, is_default: isDefault };
      });

      // Insert new language links
      if (processedLanguages.length > 0) {
        for (const lang of processedLanguages) {
          // Verify language exists
          const [language] = await connection.query<RowDataPacket[]>(
            'SELECT id FROM languages WHERE id = ?',
            [lang.language_id]
          );
          if (language.length === 0) {
            throw new Error(`Language ${lang.language_id} not found`);
          }

          await connection.query(
            `INSERT INTO tenant_languages (tenant_id, language_id, is_default, is_active)
             VALUES (?, ?, ?, ?)`,
            [tenantId, lang.language_id, lang.is_default, lang.is_active]
          );
        }

        // Update tenant's default_language_id
        const defaultLang = processedLanguages.find(l => l.is_default);
        if (defaultLang) {
          await connection.query(
            'UPDATE tenants SET default_language_id = ? WHERE id = ?',
            [defaultLang.language_id, tenantId]
          );
        }
      }

      await connection.commit();
      return { message: 'Tenant languages updated successfully' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get tenant currencies
   */
  static async getTenantCurrencies(tenantId: number) {
    const [currencies] = await pool.query<RowDataPacket[]>(
      `SELECT tc.*, c.code, c.name, c.symbol
       FROM tenant_currencies tc
       JOIN currencies c ON tc.currency_id = c.id
       WHERE tc.tenant_id = ?
       ORDER BY tc.is_default DESC, c.code ASC`,
      [tenantId]
    );
    return currencies;
  }

  /**
   * Update tenant currencies
   */
  static async updateTenantCurrencies(
    tenantId: number,
    currencies: Array<{
      currency_id: number;
      is_default: boolean;
      is_active: boolean;
    }>
  ) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Verify tenant exists
      const [tenant] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM tenants WHERE id = ?',
        [tenantId]
      );
      if (tenant.length === 0) {
        throw new Error('Tenant not found');
      }

      // Delete all existing currency links
      await connection.query(
        'DELETE FROM tenant_currencies WHERE tenant_id = ?',
        [tenantId]
      );

      // Ensure only one default currency
      let hasDefault = false;
      const processedCurrencies = currencies.map((curr, _index) => {
        const isDefault = !hasDefault && curr.is_default;
        if (isDefault) hasDefault = true;
        return { ...curr, is_default: isDefault };
      });

      // Insert new currency links
      if (processedCurrencies.length > 0) {
        for (const curr of processedCurrencies) {
          // Verify currency exists
          const [currency] = await connection.query<RowDataPacket[]>(
            'SELECT id FROM currencies WHERE id = ?',
            [curr.currency_id]
          );
          if (currency.length === 0) {
            throw new Error(`Currency ${curr.currency_id} not found`);
          }

          await connection.query(
            `INSERT INTO tenant_currencies (tenant_id, currency_id, is_default, is_active)
             VALUES (?, ?, ?, ?)`,
            [tenantId, curr.currency_id, curr.is_default, curr.is_active]
          );
        }

        // Update tenant's default_currency_id
        const defaultCurr = processedCurrencies.find(c => c.is_default);
        if (defaultCurr) {
          await connection.query(
            'UPDATE tenants SET default_currency_id = ? WHERE id = ?',
            [defaultCurr.currency_id, tenantId]
          );
        }
      }

      await connection.commit();
      return { message: 'Tenant currencies updated successfully' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}