import { Router } from 'express';
import { TenantOrderSourceController } from '../controllers/tenantOrderSourceController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/order-sources/master/available', requireTenantPermission('order_sources.view'), TenantOrderSourceController.getAvailableMaster);
router.post('/order-sources/import', requireTenantPermission('order_sources.create'), TenantOrderSourceController.importFromMaster);

router.get('/order-sources', requireTenantPermission('order_sources.view'), TenantOrderSourceController.getAll);
router.get('/order-sources/:id', requireTenantPermission('order_sources.view'), TenantOrderSourceController.getById);
router.post('/order-sources', requireTenantPermission('order_sources.create'), TenantOrderSourceController.create);
router.put('/order-sources/:id', requireTenantPermission('order_sources.edit'), TenantOrderSourceController.update);
router.delete('/order-sources/:id', requireTenantPermission('order_sources.delete'), TenantOrderSourceController.delete);

export default router;
