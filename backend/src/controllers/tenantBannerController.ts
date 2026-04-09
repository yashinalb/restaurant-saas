import { Response } from 'express';
import { TenantBannerService } from '../services/tenantBannerService.js';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';

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
      if (req.file) {
        data.image_url = `/uploads/${req.tenant.id}_banners/${req.file.filename}`;
      }
      if (typeof data.translations === 'string') {
        try { data.translations = JSON.parse(data.translations); } catch { data.translations = []; }
      }
      if (typeof data.text_style === 'string') {
        try { data.text_style = JSON.parse(data.text_style); } catch { data.text_style = null; }
      }

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
      if (req.file) {
        data.image_url = `/uploads/${req.tenant.id}_banners/${req.file.filename}`;
      }
      if (typeof data.translations === 'string') {
        try { data.translations = JSON.parse(data.translations); } catch { data.translations = []; }
      }
      if (typeof data.text_style === 'string') {
        try { data.text_style = JSON.parse(data.text_style); } catch { data.text_style = null; }
      }

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
}
