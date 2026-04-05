import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/database.js';

interface TenantTypeTranslation {
  language_id: number;
  name: string;
  description?: string;
}

interface CreateTenantTypeData {
  code: string;
  icon_url?: string;
  sort_order?: number;
  is_active?: boolean;
  translations: TenantTypeTranslation[];
}

interface UpdateTenantTypeData {
  code?: string;
  icon_url?: string;
  sort_order?: number;
  is_active?: boolean;
  translations?: TenantTypeTranslation[];
}

export class TenantTypeService {
  /**
   * Get all tenant types with translations
   */
  static async getAllTenantTypes(languageCode?: string) {
    const query = `
      SELECT 
        tt.*,
        (SELECT COUNT(*) FROM tenants WHERE tenant_type_id = tt.id) as tenant_count
      FROM tenant_types tt
      ORDER BY tt.sort_order ASC, tt.id ASC
    `;

    const [tenantTypes] = await pool.query<RowDataPacket[]>(query);

    // Get translations for each tenant type
    for (const tenantType of tenantTypes) {
      const [translations] = await pool.query<RowDataPacket[]>(
        `SELECT 
          ttt.*,
          l.code as language_code,
          l.name as language_name
        FROM tenant_type_translations ttt
        JOIN languages l ON ttt.language_id = l.id
        WHERE ttt.tenant_type_id = ?
        ORDER BY l.sort_order`,
        [tenantType.id]
      );
      tenantType.translations = translations;

      // If language code specified, add primary translation
      if (languageCode && translations.length > 0) {
        const primaryTranslation = translations.find(
          (t: any) => t.language_code === languageCode
        );
        if (primaryTranslation) {
          tenantType.name = primaryTranslation.name;
          tenantType.description = primaryTranslation.description;
        } else {
          // Fallback to first translation
          tenantType.name = translations[0].name;
          tenantType.description = translations[0].description;
        }
      }
    }

    return tenantTypes;
  }

  /**
   * Get tenant type by ID with translations
   */
  static async getTenantTypeById(tenantTypeId: number) {
    const [tenantTypes] = await pool.query<RowDataPacket[]>(
      `SELECT 
        tt.*,
        (SELECT COUNT(*) FROM tenants WHERE tenant_type_id = tt.id) as tenant_count
      FROM tenant_types tt
      WHERE tt.id = ?`,
      [tenantTypeId]
    );

    if (tenantTypes.length === 0) {
      throw new Error('Tenant type not found');
    }

    const tenantType = tenantTypes[0];

    // Get translations
    const [translations] = await pool.query<RowDataPacket[]>(
      `SELECT 
        ttt.*,
        l.code as language_code,
        l.name as language_name
      FROM tenant_type_translations ttt
      JOIN languages l ON ttt.language_id = l.id
      WHERE ttt.tenant_type_id = ?
      ORDER BY l.sort_order`,
      [tenantTypeId]
    );

    tenantType.translations = translations;

    return tenantType;
  }

  /**
   * Get tenant type by code
   */
  static async getTenantTypeByCode(code: string) {
    const [tenantTypes] = await pool.query<RowDataPacket[]>(
      `SELECT 
        tt.*,
        (SELECT COUNT(*) FROM tenants WHERE tenant_type_id = tt.id) as tenant_count
      FROM tenant_types tt
      WHERE tt.code = ?`,
      [code]
    );

    if (tenantTypes.length === 0) {
      throw new Error('Tenant type not found');
    }

    const tenantType = tenantTypes[0];

    // Get translations
    const [translations] = await pool.query<RowDataPacket[]>(
      `SELECT 
        ttt.*,
        l.code as language_code,
        l.name as language_name
      FROM tenant_type_translations ttt
      JOIN languages l ON ttt.language_id = l.id
      WHERE ttt.tenant_type_id = ?
      ORDER BY l.sort_order`,
      [tenantType.id]
    );

    tenantType.translations = translations;

    return tenantType;
  }

  /**
   * Create new tenant type with translations
   */
  static async createTenantType(data: CreateTenantTypeData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if code already exists
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM tenant_types WHERE code = ?',
        [data.code]
      );

      if (existing.length > 0) {
        throw new Error('Tenant type code already exists');
      }

      // Get next sort order if not provided
      let sortOrder = data.sort_order;
      if (sortOrder === undefined) {
        const [maxOrder] = await connection.query<RowDataPacket[]>(
          'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM tenant_types'
        );
        sortOrder = maxOrder[0].next_order;
      }

      // Create tenant type
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO tenant_types (code, icon_url, sort_order, is_active)
         VALUES (?, ?, ?, ?)`,
        [
          data.code,
          data.icon_url || null,
          sortOrder,
          data.is_active !== undefined ? data.is_active : true,
        ]
      );

      const tenantTypeId = result.insertId;

      // Create translations
      if (data.translations && data.translations.length > 0) {
        for (const translation of data.translations) {
          await connection.query(
            `INSERT INTO tenant_type_translations (tenant_type_id, language_id, name, description)
             VALUES (?, ?, ?, ?)`,
            [tenantTypeId, translation.language_id, translation.name, translation.description || null]
          );
        }
      }

      await connection.commit();

      return await this.getTenantTypeById(tenantTypeId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update tenant type
   */
  static async updateTenantType(tenantTypeId: number, data: UpdateTenantTypeData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if tenant type exists
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM tenant_types WHERE id = ?',
        [tenantTypeId]
      );

      if (existing.length === 0) {
        throw new Error('Tenant type not found');
      }

      // Check if new code already exists (if changing code)
      if (data.code) {
        const [codeExists] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM tenant_types WHERE code = ? AND id != ?',
          [data.code, tenantTypeId]
        );

        if (codeExists.length > 0) {
          throw new Error('Tenant type code already exists');
        }
      }

      // Update tenant type fields
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (data.code !== undefined) {
        updateFields.push('code = ?');
        updateValues.push(data.code);
      }
      if (data.icon_url !== undefined) {
        updateFields.push('icon_url = ?');
        updateValues.push(data.icon_url);
      }
      if (data.sort_order !== undefined) {
        updateFields.push('sort_order = ?');
        updateValues.push(data.sort_order);
      }
      if (data.is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(data.is_active);
      }

      if (updateFields.length > 0) {
        updateValues.push(tenantTypeId);
        await connection.query(
          `UPDATE tenant_types SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }

      // Update translations if provided
      if (data.translations && data.translations.length > 0) {
        // Delete existing translations
        await connection.query('DELETE FROM tenant_type_translations WHERE tenant_type_id = ?', [tenantTypeId]);

        // Insert new translations
        for (const translation of data.translations) {
          await connection.query(
            `INSERT INTO tenant_type_translations (tenant_type_id, language_id, name, description)
             VALUES (?, ?, ?, ?)`,
            [tenantTypeId, translation.language_id, translation.name, translation.description || null]
          );
        }
      }

      await connection.commit();

      return await this.getTenantTypeById(tenantTypeId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete tenant type (only if not used by any tenants)
   */
  static async deleteTenantType(tenantTypeId: number) {
    // Check if tenant type exists and get usage count
    const [tenantType] = await pool.query<RowDataPacket[]>(
      `SELECT 
        id,
        (SELECT COUNT(*) FROM tenants WHERE tenant_type_id = ?) as tenant_count
       FROM tenant_types 
       WHERE id = ?`,
      [tenantTypeId, tenantTypeId]
    );

    if (tenantType.length === 0) {
      throw new Error('Tenant type not found');
    }

    if (tenantType[0].tenant_count > 0) {
      throw new Error('Cannot delete tenant type that is used by tenants');
    }

    // Delete tenant type (translations will cascade)
    await pool.query('DELETE FROM tenant_types WHERE id = ?', [tenantTypeId]);

    return { message: 'Tenant type deleted successfully' };
  }
}
