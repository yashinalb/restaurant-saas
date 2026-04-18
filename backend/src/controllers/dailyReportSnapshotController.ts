import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { DailyReportSnapshotService } from '../services/dailyReportSnapshotService.js';

export class DailyReportSnapshotController {
  static async getAll(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const filters = {
        store_id: req.query.store_id ? Number(req.query.store_id) : undefined,
        currency_id: req.query.currency_id ? Number(req.query.currency_id) : undefined,
        from_date: req.query.from_date ? String(req.query.from_date) : undefined,
        to_date: req.query.to_date ? String(req.query.to_date) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      };
      const items = await DailyReportSnapshotService.getAll(tenantId, filters);
      res.json({ data: items });
    } catch (error: any) {
      console.error('[DailyReportSnapshotController] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch daily report snapshots' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const item = await DailyReportSnapshotService.getById(Number(req.tenant.id), id);
      if (!item) { res.status(404).json({ error: 'Snapshot not found' }); return; }
      res.json({ data: item });
    } catch (error: any) {
      console.error('[DailyReportSnapshotController] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch snapshot' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = await DailyReportSnapshotService.create(tenantId, req.body);
      const item = await DailyReportSnapshotService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Snapshot created successfully' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      if (error.status === 409) { res.status(409).json({ error: error.message }); return; }
      console.error('[DailyReportSnapshotController] create error:', error);
      res.status(500).json({ error: 'Failed to create snapshot' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      await DailyReportSnapshotService.update(tenantId, id, req.body);
      const item = await DailyReportSnapshotService.getById(tenantId, id);
      res.json({ data: item, message: 'Snapshot updated successfully' });
    } catch (error: any) {
      if (error.status === 404) { res.status(404).json({ error: error.message }); return; }
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[DailyReportSnapshotController] update error:', error);
      res.status(500).json({ error: 'Failed to update snapshot' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
      const deleted = await DailyReportSnapshotService.delete(Number(req.tenant.id), id);
      if (!deleted) { res.status(404).json({ error: 'Snapshot not found' }); return; }
      res.json({ message: 'Snapshot deleted successfully' });
    } catch (error: any) {
      console.error('[DailyReportSnapshotController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete snapshot' });
    }
  }

  static async generate(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tenantId = Number(req.tenant.id);
      const { store_id, report_date, currency_id } = req.body;
      if (!store_id || !report_date || !currency_id) {
        res.status(400).json({ error: 'store_id, report_date, and currency_id are required' });
        return;
      }
      const id = await DailyReportSnapshotService.generate(tenantId, { store_id, report_date, currency_id });
      const item = await DailyReportSnapshotService.getById(tenantId, id);
      res.status(201).json({ data: item, message: 'Snapshot generated successfully' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[DailyReportSnapshotController] generate error:', error);
      res.status(500).json({ error: 'Failed to generate snapshot' });
    }
  }
}
