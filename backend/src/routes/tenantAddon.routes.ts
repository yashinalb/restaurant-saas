import { Router } from 'express';
import { TenantAddonController } from '../controllers/tenantAddonController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/addons/master/available', requireTenantPermission('addons.view'), TenantAddonController.getAvailableMaster);
router.post('/addons/import', requireTenantPermission('addons.create'), TenantAddonController.importFromMaster);

router.get('/addons', requireTenantPermission('addons.view'), TenantAddonController.getAll);
router.get('/addons/:id', requireTenantPermission('addons.view'), TenantAddonController.getById);
router.post('/addons', requireTenantPermission('addons.create'), TenantAddonController.create);
router.put('/addons/:id', requireTenantPermission('addons.edit'), TenantAddonController.update);
router.delete('/addons/:id', requireTenantPermission('addons.delete'), TenantAddonController.delete);

export default router;
