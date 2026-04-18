import { Router } from 'express';
import { CashRegisterSessionController } from '../controllers/cashRegisterSessionController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/cash-sessions', requireTenantPermission('cash_sessions.view'), CashRegisterSessionController.getAll);
router.get('/cash-sessions/:id', requireTenantPermission('cash_sessions.view'), CashRegisterSessionController.getById);
router.post('/cash-sessions', requireTenantPermission('cash_sessions.create'), CashRegisterSessionController.create);
router.put('/cash-sessions/:id', requireTenantPermission('cash_sessions.edit'), CashRegisterSessionController.update);
router.post('/cash-sessions/:id/close', requireTenantPermission('cash_sessions.edit'), CashRegisterSessionController.close);
router.delete('/cash-sessions/:id', requireTenantPermission('cash_sessions.delete'), CashRegisterSessionController.delete);

export default router;
