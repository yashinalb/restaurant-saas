import { Router } from 'express';
import { TenantOrderTypeController } from '../controllers/tenantOrderTypeController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/order-types/master/available', requireTenantPermission('order_types.view'), TenantOrderTypeController.getAvailableMaster);
router.post('/order-types/import', requireTenantPermission('order_types.create'), TenantOrderTypeController.importFromMaster);

router.get('/order-types', requireTenantPermission('order_types.view'), TenantOrderTypeController.getAll);
router.get('/order-types/:id', requireTenantPermission('order_types.view'), TenantOrderTypeController.getById);
router.post('/order-types', requireTenantPermission('order_types.create'), TenantOrderTypeController.create);
router.put('/order-types/:id', requireTenantPermission('order_types.edit'), TenantOrderTypeController.update);
router.delete('/order-types/:id', requireTenantPermission('order_types.delete'), TenantOrderTypeController.delete);

export default router;
