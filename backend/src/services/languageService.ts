import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/database.js';

interface CreateLanguageData {
  code: string;
  name: string;
  native_name: string;
  is_rtl?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

interface UpdateLanguageData {
  code?: string;
  name?: string;
  native_name?: string;
  is_rtl?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

export class LanguageService {
  /**
   * Get all languages
   */
  
  static async getAllLanguages() {
    const [languages] = await pool.query<RowDataPacket[]>(
      `SELECT 
        l.*,
        (SELECT COUNT(*) FROM tenant_languages WHERE language_id = l.id) as tenant_count
      FROM languages l
      ORDER BY l.sort_order ASC, l.name ASC`
    );

    return languages;
  }

  /**
   * Get language by ID
   */
  static async getLanguageById(languageId: number) {
    const [languages] = await pool.query<RowDataPacket[]>(
      `SELECT 
        l.*,
        (SELECT COUNT(*) FROM tenant_languages WHERE language_id = l.id) as tenant_count
      FROM languages l
      WHERE l.id = ?`,
      [languageId]
    );

    if (languages.length === 0) {
      throw new Error('Language not found');
    }

    return languages[0];
  }

  /**
   * Create new language
   */
  static async createLanguage(data: CreateLanguageData) {
    // Check if code already exists
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM languages WHERE code = ?',
      [data.code]
    );

    if (existing.length > 0) {
      throw new Error('Language code already exists');
    }

    // Get next sort order
    const [maxOrder] = await pool.query<RowDataPacket[]>(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM languages'
    );

    const sortOrder = data.sort_order || maxOrder[0].next_order;

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO languages (code, name, native_name, is_rtl, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.code,
        data.name,
        data.native_name,
        data.is_rtl !== undefined ? data.is_rtl : false,
        data.is_active !== undefined ? data.is_active : true,
        sortOrder,
      ]
    );

    return await this.getLanguageById(result.insertId);
  }

  /**
   * Update language
   */
  static async updateLanguage(languageId: number, data: UpdateLanguageData) {
    // Check if language exists
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM languages WHERE id = ?',
      [languageId]
    );

    if (existing.length === 0) {
      throw new Error('Language not found');
    }

    // Check if new code already exists (if changing code)
    if (data.code) {
      const [codeExists] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM languages WHERE code = ? AND id != ?',
        [data.code, languageId]
      );

      if (codeExists.length > 0) {
        throw new Error('Language code already exists');
      }
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (data.code !== undefined) {
      updateFields.push('code = ?');
      updateValues.push(data.code);
    }
    if (data.name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(data.name);
    }
    if (data.native_name !== undefined) {
      updateFields.push('native_name = ?');
      updateValues.push(data.native_name);
    }
    if (data.is_rtl !== undefined) {
      updateFields.push('is_rtl = ?');
      updateValues.push(data.is_rtl);
    }
    if (data.is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(data.is_active);
    }
    if (data.sort_order !== undefined) {
      updateFields.push('sort_order = ?');
      updateValues.push(data.sort_order);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateValues.push(languageId);

    await pool.query(
      `UPDATE languages SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    return await this.getLanguageById(languageId);
  }

  /**
   * Delete language (only if not used by any tenant)
   */
  static async deleteLanguage(languageId: number) {
    // Check if language exists
    const [language] = await pool.query<RowDataPacket[]>(
      `SELECT 
        id,
        (SELECT COUNT(*) FROM tenant_languages WHERE language_id = ?) as tenant_count
       FROM languages 
       WHERE id = ?`,
      [languageId, languageId]
    );

    if (language.length === 0) {
      throw new Error('Language not found');
    }

    if (language[0].tenant_count > 0) {
      throw new Error('Cannot delete language that is used by tenants');
    }

    await pool.query('DELETE FROM languages WHERE id = ?', [languageId]);

    return { message: 'Language deleted successfully' };
  }

  /**
   * Reorder languages
   */
  static async reorderLanguages(orderedIds: number[]) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      for (let i = 0; i < orderedIds.length; i++) {
        await connection.query(
          'UPDATE languages SET sort_order = ? WHERE id = ?',
          [i + 1, orderedIds[i]]
        );
      }

      await connection.commit();

      return { message: 'Languages reordered successfully' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
