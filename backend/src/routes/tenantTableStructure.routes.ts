import { Router } from 'express';
import { TenantTableStructureController } from '../controllers/tenantTableStructureController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/tables', requireTenantPermission('tables.view'), TenantTableStructureController.getAll);
router.get('/tables/:id', requireTenantPermission('tables.view'), TenantTableStructureController.getById);
router.post('/tables', requireTenantPermission('tables.manage'), TenantTableStructureController.create);
router.put('/tables/:id', requireTenantPermission('tables.manage'), TenantTableStructureController.update);
router.delete('/tables/:id', requireTenantPermission('tables.manage'), TenantTableStructureController.delete);

export default router;
