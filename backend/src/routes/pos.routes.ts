import { Router } from 'express';
import { PosSessionController } from '../controllers/posSessionController.js';
import { PosFloorController } from '../controllers/posFloorController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

// Waiter PIN login/logout + active session lookup. All require pos.access.
router.get('/pos/session', requireTenantPermission('pos.access'), PosSessionController.getActiveSession);
router.post('/pos/login', requireTenantPermission('pos.access'), PosSessionController.login);
router.post('/pos/session/:id/logout', requireTenantPermission('pos.access'), PosSessionController.logout);

// Floor plan
router.get('/pos/seating-areas', requireTenantPermission('pos.access'), PosFloorController.getSeatingAreas);
router.get('/pos/floor', requireTenantPermission('pos.access'), PosFloorController.getFloor);
router.post('/pos/tables/:id/merge', requireTenantPermission('pos.take_order'), PosFloorController.merge);
router.post('/pos/tables/:id/unmerge', requireTenantPermission('pos.take_order'), PosFloorController.unmerge);

export default router;
