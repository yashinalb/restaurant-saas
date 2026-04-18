import { Router } from 'express';
import { ExpenseController } from '../controllers/expenseController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/expenses', requireTenantPermission('expenses.view'), ExpenseController.getAll);
router.get('/expenses/:id', requireTenantPermission('expenses.view'), ExpenseController.getById);
router.post('/expenses', requireTenantPermission('expenses.create'), ExpenseController.create);
router.put('/expenses/:id', requireTenantPermission('expenses.edit'), ExpenseController.update);
router.delete('/expenses/:id', requireTenantPermission('expenses.delete'), ExpenseController.delete);

router.post('/expenses/:id/payments', requireTenantPermission('expenses.edit'), ExpenseController.addPayment);
router.delete('/expenses/payments/:paymentId', requireTenantPermission('expenses.edit'), ExpenseController.deletePayment);

export default router;
