import { Router } from 'express';
import { PosSessionController } from '../controllers/posSessionController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

// Waiter PIN login/logout + active session lookup. All require pos.access.
router.get('/pos/session', requireTenantPermission('pos.access'), PosSessionController.getActiveSession);
router.post('/pos/login', requireTenantPermission('pos.access'), PosSessionController.login);
router.post('/pos/session/:id/logout', requireTenantPermission('pos.access'), PosSessionController.logout);

export default router;
