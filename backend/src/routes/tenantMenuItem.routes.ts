import { Router } from 'express';
import { TenantMenuItemController } from '../controllers/tenantMenuItemController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();

router.use(authenticateToken, loadTenantContext);

router.get('/menu-items', requireTenantPermission('menu_items.view'), TenantMenuItemController.getAll);
router.get('/menu-items/:id', requireTenantPermission('menu_items.view'), TenantMenuItemController.getById);
router.post('/menu-items', requireTenantPermission('menu_items.create'), TenantMenuItemController.create);
router.put('/menu-items/:id', requireTenantPermission('menu_items.edit'), TenantMenuItemController.update);
router.delete('/menu-items/:id', requireTenantPermission('menu_items.delete'), TenantMenuItemController.delete);

export default router;
