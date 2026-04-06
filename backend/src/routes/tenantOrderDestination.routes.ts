import { Router } from 'express';
import { TenantOrderDestinationController } from '../controllers/tenantOrderDestinationController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/order-destinations/master/available', requireTenantPermission('order_destinations.view'), TenantOrderDestinationController.getAvailableMaster);
router.post('/order-destinations/import', requireTenantPermission('order_destinations.create'), TenantOrderDestinationController.importFromMaster);

router.get('/order-destinations', requireTenantPermission('order_destinations.view'), TenantOrderDestinationController.getAll);
router.get('/order-destinations/:id', requireTenantPermission('order_destinations.view'), TenantOrderDestinationController.getById);
router.post('/order-destinations', requireTenantPermission('order_destinations.create'), TenantOrderDestinationController.create);
router.put('/order-destinations/:id', requireTenantPermission('order_destinations.edit'), TenantOrderDestinationController.update);
router.delete('/order-destinations/:id', requireTenantPermission('order_destinations.delete'), TenantOrderDestinationController.delete);

export default router;
