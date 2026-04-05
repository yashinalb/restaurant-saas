import { Router } from 'express';
import { TenantSettingController } from '../controllers/tenantSettingController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();

router.use(authenticateToken, loadTenantContext);

// Bulk upsert BEFORE :key route to avoid conflict
router.put('/settings/bulk', requireTenantPermission('settings.manage'), TenantSettingController.bulkUpsert);

router.get('/settings', requireTenantPermission('settings.view'), TenantSettingController.getAll);
router.get('/settings/:key', requireTenantPermission('settings.view'), TenantSettingController.getByKey);
router.put('/settings', requireTenantPermission('settings.manage'), TenantSettingController.upsert);
router.delete('/settings/:key', requireTenantPermission('settings.manage'), TenantSettingController.deleteByKey);

export default router;
