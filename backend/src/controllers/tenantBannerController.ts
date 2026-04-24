import { Request, Response } from 'express';
import pool from '../config/database.js';
import { TenantBannerService } from '../services/tenantBannerService.js';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { deleteUploadedFile } from '../middleware/upload.js';
import { RowDataPacket } from 'mysql2';

export class TenantBannerController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const { is_active, banner_type } = req.query;
      const banners = await TenantBannerService.getAll(Number(req.tenant.id), {
        is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
        banner_type: banner_type as string | undefined,
      });
      res.json({ data: banners });
    } catch (error: any) {
      console.error('[TenantBannerController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch banners' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid banner ID' }); return; }
      const banner = await TenantBannerService.getById(Number(req.tenant.id), id);
      res.json({ data: banner });
    } catch (error: any) {
      if (error.message === 'Banner not found') res.status(404).json({ error: error.message });
      else { console.error('[TenantBannerController] getById error:', error); res.status(500).json({ error: 'Failed to fetch banner' }); }
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }

      const data = { ...req.body };
      const id = await TenantBannerService.create(Number(req.tenant.id), data);
      const banner = await TenantBannerService.getById(Number(req.tenant.id), id);
      res.status(201).json({ message: 'Banner created successfully', data: banner });
    } catch (error: any) {
      console.error('[TenantBannerController] create error:', error);
      res.status(500).json({ error: 'Failed to create banner' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid banner ID' }); return; }

      const data = { ...req.body };
      await TenantBannerService.update(Number(req.tenant.id), id, data);
      const banner = await TenantBannerService.getById(Number(req.tenant.id), id);
      res.json({ message: 'Banner updated successfully', data: banner });
    } catch (error: any) {
      if (error.message === 'Banner not found') res.status(404).json({ error: error.message });
      else { console.error('[TenantBannerController] update error:', error); res.status(500).json({ error: 'Failed to update banner' }); }
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid banner ID' }); return; }
      const result = await TenantBannerService.delete(Number(req.tenant.id), id);
      res.json(result);
    } catch (error: any) {
      if (error.message === 'Banner not found') res.status(404).json({ error: error.message });
      else { console.error('[TenantBannerController] delete error:', error); res.status(500).json({ error: 'Failed to delete banner' }); }
    }
  }

  static async toggleActive(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid banner ID' }); return; }
      const result = await TenantBannerService.toggleActive(Number(req.tenant.id), id);
      res.json(result);
    } catch (error: any) {
      if (error.message === 'Banner not found') res.status(404).json({ error: error.message });
      else { console.error('[TenantBannerController] toggleActive error:', error); res.status(500).json({ error: 'Failed to toggle banner' }); }
    }
  }

  static async uploadImage(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
      const folderName = `${req.tenant.id}_banners`;
      const image_url = `/uploads/${folderName}/${req.file.filename}`;
      res.json({ message: 'Image uploaded successfully', data: { image_url } });
    } catch (error: any) {
      console.error('[TenantBannerController] uploadImage error:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  }

  static async deleteImage(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const { image_url } = req.body;
      if (!image_url || typeof image_url !== 'string') {
        res.status(400).json({ error: 'image_url is required' }); return;
      }
      const tenantFolder = `${req.tenant.id}_banners`;
      const deleted = deleteUploadedFile(image_url, tenantFolder);
      if (!deleted) { res.status(404).json({ error: 'Image not found or access denied' }); return; }
      res.json({ message: 'Image deleted successfully' });
    } catch (error: any) {
      console.error('[TenantBannerController] deleteImage error:', error);
      res.status(500).json({ error: 'Failed to delete image' });
    }
  }

  static async getStats(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const stats = await TenantBannerService.getStats(Number(req.tenant.id));
      res.json({ data: stats });
    } catch (error: any) {
      console.error('[TenantBannerController] getStats error:', error);
      res.status(500).json({ error: 'Failed to fetch banner stats' });
    }
  }

  static async updateSortOrder(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const { items } = req.body;
      if (!Array.isArray(items)) { res.status(400).json({ error: 'items array required' }); return; }
      const result = await TenantBannerService.updateSortOrder(Number(req.tenant.id), items);
      res.json(result);
    } catch (error: any) {
      console.error('[TenantBannerController] updateSortOrder error:', error);
      res.status(500).json({ error: 'Failed to update sort order' });
    }
  }

  static async duplicate(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid banner ID' }); return; }
      const banner = await TenantBannerService.duplicate(Number(req.tenant.id), id);
      res.status(201).json({ message: 'Banner duplicated successfully', data: banner });
    } catch (error: any) {
      if (error.message === 'Banner not found') res.status(404).json({ error: error.message });
      else { console.error('[TenantBannerController] duplicate error:', error); res.status(500).json({ error: 'Failed to duplicate banner' }); }
    }
  }

  /**
   * Public storefront endpoint — no auth.
   * Resolves tenant by slug/subdomain and returns active banners of given type.
   * URL: GET /api/public/:tenantSlug/banners/type/:type
   */
  static async getPublicByType(req: Request, res: Response): Promise<void> {
    try {
      const tenantSlug = req.params.tenantSlug;
      const type = req.params.type;
      if (!tenantSlug || !type) {
        res.status(400).json({ error: 'tenant slug and banner type required' }); return;
      }

      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM tenants WHERE slug = ? AND is_active = 1 LIMIT 1',
        [tenantSlug]
      );
      if (rows.length === 0) { res.status(404).json({ error: 'Tenant not found' }); return; }
      const tenantId = Number(rows[0].id);

      const banners = await TenantBannerService.getPublicBannersByType(tenantId, type);
      res.json({ data: banners });
    } catch (error: any) {
      console.error('[TenantBannerController] getPublicByType error:', error);
      res.status(500).json({ error: 'Failed to fetch banners' });
    }
  }
}
