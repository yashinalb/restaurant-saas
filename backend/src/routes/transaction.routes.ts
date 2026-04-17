import { Router } from 'express';
import { TransactionController } from '../controllers/transactionController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/transactions', requireTenantPermission('transactions.view'), TransactionController.getAll);
router.get('/transactions/:id', requireTenantPermission('transactions.view'), TransactionController.getById);
router.post('/transactions', requireTenantPermission('transactions.create'), TransactionController.create);
router.put('/transactions/:id', requireTenantPermission('transactions.edit'), TransactionController.update);
router.delete('/transactions/:id', requireTenantPermission('transactions.delete'), TransactionController.delete);

export default router;
