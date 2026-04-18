import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { PosFloorService } from '../services/posFloorService.js';

export class PosFloorController {
  static async getSeatingAreas(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const storeId = Number(req.query.store_id);
      if (!storeId) { res.status(400).json({ error: 'store_id is required' }); return; }
      const areas = await PosFloorService.getSeatingAreas(Number(req.tenant.id), storeId);
      res.json({ data: areas });
    } catch (error: any) {
      console.error('[PosFloorController] getSeatingAreas error:', error);
      res.status(500).json({ error: 'Failed to fetch seating areas' });
    }
  }

  static async getFloor(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const storeId = Number(req.query.store_id);
      if (!storeId) { res.status(400).json({ error: 'store_id is required' }); return; }
      const areaId = req.query.seating_area_id ? Number(req.query.seating_area_id) : undefined;
      const tables = await PosFloorService.getFloor(Number(req.tenant.id), storeId, areaId);
      res.json({ data: tables });
    } catch (error: any) {
      console.error('[PosFloorController] getFloor error:', error);
      res.status(500).json({ error: 'Failed to fetch floor plan' });
    }
  }

  static async merge(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant || !req.admin) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const parentId = parseInt(req.params.id);
      if (isNaN(parentId)) { res.status(400).json({ error: 'Invalid parent ID' }); return; }
      const { store_id, child_ids } = req.body;
      if (!store_id || !Array.isArray(child_ids) || child_ids.length === 0) {
        res.status(400).json({ error: 'store_id and child_ids[] are required' });
        return;
      }
      await PosFloorService.mergeTables(Number(req.tenant.id), Number(store_id), parentId, child_ids.map((n: any) => Number(n)), Number(req.admin.id));
      res.json({ message: 'Tables merged successfully' });
    } catch (error: any) {
      if (error.status === 400) { res.status(400).json({ error: error.message }); return; }
      console.error('[PosFloorController] merge error:', error);
      res.status(500).json({ error: 'Failed to merge tables' });
    }
  }

  static async unmerge(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      if (!req.tenant) { res.status(400).json({ error: 'Tenant context required' }); return; }
      const tableId = parseInt(req.params.id);
      if (isNaN(tableId)) { res.status(400).json({ error: 'Invalid table ID' }); return; }
      const storeId = Number(req.query.store_id || req.body.store_id);
      if (!storeId) { res.status(400).json({ error: 'store_id is required' }); return; }
      const done = await PosFloorService.unmergeTable(Number(req.tenant.id), storeId, tableId);
      if (!done) { res.status(404).json({ error: 'Table not found' }); return; }
      res.json({ message: 'Table unmerged successfully' });
    } catch (error: any) {
      console.error('[PosFloorController] unmerge error:', error);
      res.status(500).json({ error: 'Failed to unmerge table' });
    }
  }
}
