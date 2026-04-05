import { Router } from 'express';
import { StoreController } from '../controllers/storeController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();

// All routes require authentication + tenant context
router.use(authenticateToken, loadTenantContext);

router.get('/stores', requireTenantPermission('stores.view'), StoreController.getAll);
router.get('/stores/:id', requireTenantPermission('stores.view'), StoreController.getById);
router.post('/stores', requireTenantPermission('stores.manage'), StoreController.create);
router.put('/stores/:id', requireTenantPermission('stores.manage'), StoreController.update);
router.delete('/stores/:id', requireTenantPermission('stores.manage'), StoreController.delete);

export default router;
