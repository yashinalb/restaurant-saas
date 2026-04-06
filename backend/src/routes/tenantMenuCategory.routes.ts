import { Router } from 'express';
import { TenantMenuCategoryController } from '../controllers/tenantMenuCategoryController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();

router.use(authenticateToken, loadTenantContext);

// Import routes BEFORE :id routes to avoid conflict
router.get('/menu-categories/master/available', requireTenantPermission('menu_categories.view'), TenantMenuCategoryController.getAvailableMaster);
router.post('/menu-categories/import', requireTenantPermission('menu_categories.create'), TenantMenuCategoryController.importFromMaster);

router.get('/menu-categories', requireTenantPermission('menu_categories.view'), TenantMenuCategoryController.getAll);
router.get('/menu-categories/:id', requireTenantPermission('menu_categories.view'), TenantMenuCategoryController.getById);
router.post('/menu-categories', requireTenantPermission('menu_categories.create'), TenantMenuCategoryController.create);
router.put('/menu-categories/:id', requireTenantPermission('menu_categories.edit'), TenantMenuCategoryController.update);
router.delete('/menu-categories/:id', requireTenantPermission('menu_categories.delete'), TenantMenuCategoryController.delete);

export default router;
