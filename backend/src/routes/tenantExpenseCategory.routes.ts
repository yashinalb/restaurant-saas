import { Router } from 'express';
import { TenantExpenseCategoryController } from '../controllers/tenantExpenseCategoryController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

// Most-specific routes first
router.get('/expense-categories/master/available', requireTenantPermission('tenant_expense_categories.view'), TenantExpenseCategoryController.getAvailableMaster);
router.post('/expense-categories/import', requireTenantPermission('tenant_expense_categories.create'), TenantExpenseCategoryController.importFromMaster);

router.get('/expense-categories', requireTenantPermission('tenant_expense_categories.view'), TenantExpenseCategoryController.getAll);
router.get('/expense-categories/:id', requireTenantPermission('tenant_expense_categories.view'), TenantExpenseCategoryController.getById);
router.post('/expense-categories', requireTenantPermission('tenant_expense_categories.create'), TenantExpenseCategoryController.create);
router.put('/expense-categories/:id', requireTenantPermission('tenant_expense_categories.edit'), TenantExpenseCategoryController.update);
router.delete('/expense-categories/:id', requireTenantPermission('tenant_expense_categories.delete'), TenantExpenseCategoryController.delete);

export default router;
