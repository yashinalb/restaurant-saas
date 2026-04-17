import { Router } from 'express';
import { OrderController } from '../controllers/orderController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/orders', requireTenantPermission('orders.view'), OrderController.getAll);
router.get('/orders/:id', requireTenantPermission('orders.view'), OrderController.getById);
router.post('/orders', requireTenantPermission('orders.create'), OrderController.create);
router.put('/orders/:id', requireTenantPermission('orders.edit'), OrderController.update);
router.delete('/orders/:id', requireTenantPermission('orders.void'), OrderController.delete);

export default router;
