import { Response } from 'express';
import { LanguageService } from '../services/languageService.js';
import { AuthRequest } from '../middleware/auth.js';
import { RowDataPacket } from 'mysql2/typings/mysql/lib/protocol/packets/index.js';
import { pool } from '../config/database.js';

export class LanguageController {
  /**
   * GET /api/admin/languages/active
   * Get all active languages (available to all authenticated users)
   */
  static async getActiveLanguages(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const [languages] = await pool.query<RowDataPacket[]>(
        `SELECT id, code, name, native_name, is_rtl, sort_order
         FROM languages 
         WHERE is_active = 1 
         ORDER BY sort_order ASC, name ASC`
      );

      res.json({ data: languages });
    } catch (error: any) {
      console.error('Get active languages error:', error);
      res.status(500).json({ error: 'Failed to get languages' });
    }
  }
  /**
   * GET /api/admin/languages
   * Get all languages
   */
  static async getAllLanguages(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const languages = await LanguageService.getAllLanguages();
      res.json({ data: languages });
    } catch (error: any) {
      console.error('Get languages error:', error);
      res.status(500).json({ error: 'Failed to get languages' });
    }
  }

  /**
   * GET /api/admin/languages/:id
   * Get language by ID
   */
  static async getLanguageById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const languageId = parseInt(req.params.id);

      if (isNaN(languageId)) {
        res.status(400).json({ error: 'Invalid language ID' });
        return;
      }

      const language = await LanguageService.getLanguageById(languageId);
      res.json({ data: language });
    } catch (error: any) {
      console.error('Get language error:', error);
      if (error.message === 'Language not found') {
        res.status(404).json({ error: 'Language not found' });
      } else {
        res.status(500).json({ error: 'Failed to get language' });
      }
    }
  }

  /**
   * POST /api/admin/languages
   * Create new language
   */
  static async createLanguage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { code, name, native_name, is_rtl, is_active, sort_order } = req.body;

      // Validation
      if (!code || !name || !native_name) {
        res.status(400).json({ error: 'code, name, and native_name are required' });
        return;
      }

      const language = await LanguageService.createLanguage({
        code,
        name,
        native_name,
        is_rtl,
        is_active,
        sort_order,
      });

      res.status(201).json({
        message: 'Language created successfully',
        data: language,
      });
    } catch (error: any) {
      console.error('Create language error:', error);
      if (error.message === 'Language code already exists') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create language' });
      }
    }
  }

  /**
   * PUT /api/admin/languages/:id
   * Update language
   */
  static async updateLanguage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const languageId = parseInt(req.params.id);

      if (isNaN(languageId)) {
        res.status(400).json({ error: 'Invalid language ID' });
        return;
      }

      const { code, name, native_name, is_rtl, is_active, sort_order } = req.body;

      const language = await LanguageService.updateLanguage(languageId, {
        code,
        name,
        native_name,
        is_rtl,
        is_active,
        sort_order,
      });

      res.json({
        message: 'Language updated successfully',
        data: language,
      });
    } catch (error: any) {
      console.error('Update language error:', error);
      if (error.message === 'Language not found') {
        res.status(404).json({ error: 'Language not found' });
      } else if (error.message === 'Language code already exists') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update language' });
      }
    }
  }

  /**
   * DELETE /api/admin/languages/:id
   * Delete language
   */
  static async deleteLanguage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const languageId = parseInt(req.params.id);

      if (isNaN(languageId)) {
        res.status(400).json({ error: 'Invalid language ID' });
        return;
      }

      const result = await LanguageService.deleteLanguage(languageId);
      res.json(result);
    } catch (error: any) {
      console.error('Delete language error:', error);
      if (error.message === 'Language not found') {
        res.status(404).json({ error: 'Language not found' });
      } else if (error.message === 'Cannot delete language that is used by tenants') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete language' });
      }
    }
  }

  /**
   * PUT /api/admin/languages/reorder
   * Reorder languages
   */
  static async reorderLanguages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ordered_ids } = req.body;

      if (!Array.isArray(ordered_ids) || ordered_ids.length === 0) {
        res.status(400).json({ error: 'ordered_ids array is required' });
        return;
      }

      const result = await LanguageService.reorderLanguages(ordered_ids);
      res.json(result);
    } catch (error: any) {
      console.error('Reorder languages error:', error);
      res.status(500).json({ error: 'Failed to reorder languages' });
    }
  }
}