import { Router } from 'express';
import { TenantExpenseSourceController } from '../controllers/tenantExpenseSourceController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/expense-sources', requireTenantPermission('tenant_expense_sources.view'), TenantExpenseSourceController.getAll);
router.get('/expense-sources/:id', requireTenantPermission('tenant_expense_sources.view'), TenantExpenseSourceController.getById);
router.post('/expense-sources', requireTenantPermission('tenant_expense_sources.create'), TenantExpenseSourceController.create);
router.put('/expense-sources/:id', requireTenantPermission('tenant_expense_sources.edit'), TenantExpenseSourceController.update);
router.delete('/expense-sources/:id', requireTenantPermission('tenant_expense_sources.delete'), TenantExpenseSourceController.delete);

export default router;
