import { Router } from 'express';
import { TenantCustomerController } from '../controllers/tenantCustomerController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/customers', requireTenantPermission('customers.view'), TenantCustomerController.getAll);
router.get('/customers/:id', requireTenantPermission('customers.view'), TenantCustomerController.getById);
router.post('/customers', requireTenantPermission('customers.manage'), TenantCustomerController.create);
router.put('/customers/:id', requireTenantPermission('customers.manage'), TenantCustomerController.update);
router.delete('/customers/:id', requireTenantPermission('customers.manage'), TenantCustomerController.delete);

export default router;
