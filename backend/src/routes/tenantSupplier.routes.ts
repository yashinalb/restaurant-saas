import { Router } from 'express';
import { TenantSupplierController } from '../controllers/tenantSupplierController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/suppliers', requireTenantPermission('suppliers.view'), TenantSupplierController.getAll);
router.get('/suppliers/:id', requireTenantPermission('suppliers.view'), TenantSupplierController.getById);
router.post('/suppliers', requireTenantPermission('suppliers.create'), TenantSupplierController.create);
router.put('/suppliers/:id', requireTenantPermission('suppliers.edit'), TenantSupplierController.update);
router.delete('/suppliers/:id', requireTenantPermission('suppliers.delete'), TenantSupplierController.delete);

export default router;
