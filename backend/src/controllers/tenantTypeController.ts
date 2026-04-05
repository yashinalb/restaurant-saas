import {  Response } from 'express';
import { TenantTypeService } from '../services/tenantTypeService.js';
import { AuthRequest } from '../middleware/auth.js';

export class TenantTypeController {
  /**
   * GET /api/admin/tenant-types
   * Get all tenant types
   */
  static async getAllTenantTypes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const languageCode = req.query.language as string | undefined;
      const tenantTypes = await TenantTypeService.getAllTenantTypes(languageCode);
      res.json(tenantTypes);
    } catch (error) {
      console.error('Error getting tenant types:', error);
      res.status(500).json({ 
        error: 'Failed to get tenant types',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/admin/tenant-types/:id
   * Get tenant type by ID
   */
  static async getTenantTypeById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantTypeId = parseInt(req.params.id);
      if (isNaN(tenantTypeId)) {
        res.status(400).json({ error: 'Invalid tenant type ID' });
        return;
      }

      const tenantType = await TenantTypeService.getTenantTypeById(tenantTypeId);
      res.json(tenantType);
    } catch (error) {
      console.error('Error getting tenant type:', error);
      if (error instanceof Error && error.message === 'Tenant type not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(500).json({ 
        error: 'Failed to get tenant type',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/admin/tenant-types/code/:code
   * Get tenant type by code
   */
  static async getTenantTypeByCode(req: AuthRequest, res: Response): Promise<void> {
    try {
      const code = req.params.code;
      const tenantType = await TenantTypeService.getTenantTypeByCode(code);
      res.json(tenantType);
    } catch (error) {
      console.error('Error getting tenant type by code:', error);
      if (error instanceof Error && error.message === 'Tenant type not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(500).json({ 
        error: 'Failed to get tenant type',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/admin/tenant-types
   * Create new tenant type
   */
  static async createTenantType(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = req.body;

      // Validate required fields
      if (!data.code || !data.translations || data.translations.length === 0) {
        res.status(400).json({ 
          error: 'Missing required fields',
          details: 'code and translations are required'
        });
        return;
      }

      const tenantType = await TenantTypeService.createTenantType(data);
      res.status(201).json(tenantType);
    } catch (error) {
      console.error('Error creating tenant type:', error);
      if (error instanceof Error && error.message === 'Tenant type code already exists') {
        res.status(409).json({ error: error.message });
        return;
      }
      res.status(500).json({ 
        error: 'Failed to create tenant type',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * PUT /api/admin/tenant-types/:id
   * Update tenant type
   */
  static async updateTenantType(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantTypeId = parseInt(req.params.id);
      if (isNaN(tenantTypeId)) {
        res.status(400).json({ error: 'Invalid tenant type ID' });
        return;
      }

      const data = req.body;
      const tenantType = await TenantTypeService.updateTenantType(tenantTypeId, data);
      res.json(tenantType);
    } catch (error) {
      console.error('Error updating tenant type:', error);
      if (error instanceof Error && error.message === 'Tenant type not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof Error && error.message === 'Tenant type code already exists') {
        res.status(409).json({ error: error.message });
        return;
      }
      res.status(500).json({ 
        error: 'Failed to update tenant type',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * DELETE /api/admin/tenant-types/:id
   * Delete tenant type
   */
  static async deleteTenantType(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantTypeId = parseInt(req.params.id);
      if (isNaN(tenantTypeId)) {
        res.status(400).json({ error: 'Invalid tenant type ID' });
        return;
      }

      const result = await TenantTypeService.deleteTenantType(tenantTypeId);
      res.json(result);
    } catch (error) {
      console.error('Error deleting tenant type:', error);
      if (error instanceof Error && error.message === 'Tenant type not found') {
        res.status(404).json({ error: error.message });
      }
      if (error instanceof Error && error.message === 'Cannot delete tenant type that is used by tenants') {
        res.status(409).json({ error: error.message });
        return;
      }
      res.status(500).json({ 
        error: 'Failed to delete tenant type',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
