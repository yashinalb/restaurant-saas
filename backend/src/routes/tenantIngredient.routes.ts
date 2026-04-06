import { Router } from 'express';
import { TenantIngredientController } from '../controllers/tenantIngredientController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();

router.use(authenticateToken, loadTenantContext);

router.get('/ingredients/master/available', requireTenantPermission('ingredients.view'), TenantIngredientController.getAvailableMaster);
router.post('/ingredients/import', requireTenantPermission('ingredients.create'), TenantIngredientController.importFromMaster);

router.get('/ingredients', requireTenantPermission('ingredients.view'), TenantIngredientController.getAll);
router.get('/ingredients/:id', requireTenantPermission('ingredients.view'), TenantIngredientController.getById);
router.post('/ingredients', requireTenantPermission('ingredients.create'), TenantIngredientController.create);
router.put('/ingredients/:id', requireTenantPermission('ingredients.edit'), TenantIngredientController.update);
router.delete('/ingredients/:id', requireTenantPermission('ingredients.delete'), TenantIngredientController.delete);

export default router;
