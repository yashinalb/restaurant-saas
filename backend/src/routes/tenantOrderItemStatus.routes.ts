import { Router } from 'express';
import { TenantOrderItemStatusController } from '../controllers/tenantOrderItemStatusController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/order-item-statuses/master/available', requireTenantPermission('order_item_statuses.view'), TenantOrderItemStatusController.getAvailableMaster);
router.post('/order-item-statuses/import', requireTenantPermission('order_item_statuses.create'), TenantOrderItemStatusController.importFromMaster);

router.get('/order-item-statuses', requireTenantPermission('order_item_statuses.view'), TenantOrderItemStatusController.getAll);
router.get('/order-item-statuses/:id', requireTenantPermission('order_item_statuses.view'), TenantOrderItemStatusController.getById);
router.post('/order-item-statuses', requireTenantPermission('order_item_statuses.create'), TenantOrderItemStatusController.create);
router.put('/order-item-statuses/:id', requireTenantPermission('order_item_statuses.edit'), TenantOrderItemStatusController.update);
router.delete('/order-item-statuses/:id', requireTenantPermission('order_item_statuses.delete'), TenantOrderItemStatusController.delete);

export default router;
