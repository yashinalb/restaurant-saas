import { Router } from 'express';
import { TenantAddonTypeController } from '../controllers/tenantAddonTypeController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/addon-types/master/available', requireTenantPermission('addon_types.view'), TenantAddonTypeController.getAvailableMaster);
router.post('/addon-types/import', requireTenantPermission('addon_types.create'), TenantAddonTypeController.importFromMaster);

router.get('/addon-types', requireTenantPermission('addon_types.view'), TenantAddonTypeController.getAll);
router.get('/addon-types/:id', requireTenantPermission('addon_types.view'), TenantAddonTypeController.getById);
router.post('/addon-types', requireTenantPermission('addon_types.create'), TenantAddonTypeController.create);
router.put('/addon-types/:id', requireTenantPermission('addon_types.edit'), TenantAddonTypeController.update);
router.delete('/addon-types/:id', requireTenantPermission('addon_types.delete'), TenantAddonTypeController.delete);

export default router;
