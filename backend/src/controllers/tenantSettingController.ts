import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { TenantSettingService } from '../services/tenantSettingService.js';

export class TenantSettingController {
  /**
   * GET /api/tenant/settings
   */
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }
      const settings = await TenantSettingService.getAll(Number(req.tenant.id));
      res.json({ data: settings });
    } catch (error: any) {
      console.error('[TenantSettingController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  }

  /**
   * GET /api/tenant/settings/:key
   */
  static async getByKey(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }
      const setting = await TenantSettingService.getByKey(Number(req.tenant.id), req.params.key);
      if (!setting) {
        res.status(404).json({ error: 'Setting not found' });
        return;
      }
      res.json({ data: setting });
    } catch (error: any) {
      console.error('[TenantSettingController] getByKey error:', error);
      res.status(500).json({ error: 'Failed to fetch setting' });
    }
  }

  /**
   * PUT /api/tenant/settings
   * Upsert a single setting: { setting_key, setting_value, setting_type }
   */
  static async upsert(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }
      if (!req.body.setting_key) {
        res.status(400).json({ error: 'setting_key is required' });
        return;
      }
      const setting = await TenantSettingService.upsert(Number(req.tenant.id), req.body);
      res.json({ data: setting });
    } catch (error: any) {
      console.error('[TenantSettingController] upsert error:', error);
      res.status(500).json({ error: 'Failed to save setting' });
    }
  }

  /**
   * PUT /api/tenant/settings/bulk
   * Bulk upsert: { settings: [{ setting_key, setting_value, setting_type }] }
   */
  static async bulkUpsert(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }
      if (!Array.isArray(req.body.settings)) {
        res.status(400).json({ error: 'settings array is required' });
        return;
      }
      const settings = await TenantSettingService.bulkUpsert(Number(req.tenant.id), req.body.settings);
      res.json({ data: settings });
    } catch (error: any) {
      console.error('[TenantSettingController] bulkUpsert error:', error);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  }

  /**
   * DELETE /api/tenant/settings/:key
   */
  static async deleteByKey(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }
      const deleted = await TenantSettingService.deleteByKey(Number(req.tenant.id), req.params.key);
      if (!deleted) {
        res.status(404).json({ error: 'Setting not found' });
        return;
      }
      res.json({ message: 'Setting deleted successfully' });
    } catch (error: any) {
      console.error('[TenantSettingController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete setting' });
    }
  }
}
