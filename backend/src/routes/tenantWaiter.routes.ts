import { Router } from 'express';
import { TenantWaiterController } from '../controllers/tenantWaiterController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/waiters', requireTenantPermission('waiters.view'), TenantWaiterController.getAll);
router.get('/waiters/:id', requireTenantPermission('waiters.view'), TenantWaiterController.getById);
router.post('/waiters', requireTenantPermission('waiters.manage'), TenantWaiterController.create);
router.put('/waiters/:id', requireTenantPermission('waiters.manage'), TenantWaiterController.update);
router.delete('/waiters/:id', requireTenantPermission('waiters.manage'), TenantWaiterController.delete);

export default router;
