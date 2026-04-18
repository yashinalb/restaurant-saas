import { Router } from 'express';
import { KdsOrderController } from '../controllers/kdsOrderController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/kds-orders', requireTenantPermission('kds_orders.view'), KdsOrderController.getAll);
router.get('/kds-orders/:id', requireTenantPermission('kds_orders.view'), KdsOrderController.getById);
router.post('/kds-orders', requireTenantPermission('kds_orders.create'), KdsOrderController.create);
router.put('/kds-orders/:id', requireTenantPermission('kds_orders.edit'), KdsOrderController.update);
router.patch('/kds-orders/:id/status', requireTenantPermission('kds_orders.edit'), KdsOrderController.updateStatus);
router.delete('/kds-orders/:id', requireTenantPermission('kds_orders.delete'), KdsOrderController.delete);

export default router;
