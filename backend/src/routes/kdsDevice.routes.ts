import { Router } from 'express';
import { KdsDeviceController } from '../controllers/kdsDeviceController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';
import { authenticateKdsDevice } from '../middleware/kdsDeviceAuth.js';

const router = Router();

// ----- Tenant admin (requires kds.manage_device) -----
router.get(
  '/kds-devices',
  authenticateToken, loadTenantContext, requireTenantPermission('kds.manage_device'),
  KdsDeviceController.list
);
router.post(
  '/kds-devices/pairing-code',
  authenticateToken, loadTenantContext, requireTenantPermission('kds.manage_device'),
  KdsDeviceController.createPairingCode
);
router.delete(
  '/kds-devices/:id',
  authenticateToken, loadTenantContext, requireTenantPermission('kds.manage_device'),
  KdsDeviceController.revoke
);

export default router;

// ----- Device-authenticated endpoints (separate router for a different mount path) -----
export const kdsDeviceRuntimeRouter = Router();
kdsDeviceRuntimeRouter.get('/me', authenticateKdsDevice, KdsDeviceController.me);
kdsDeviceRuntimeRouter.get('/tickets', authenticateKdsDevice, KdsDeviceController.tickets);
kdsDeviceRuntimeRouter.post('/items/:itemId/bump', authenticateKdsDevice, KdsDeviceController.bump);
kdsDeviceRuntimeRouter.post('/items/:itemId/recall', authenticateKdsDevice, KdsDeviceController.recall);
kdsDeviceRuntimeRouter.post('/orders/:orderId/bump-all', authenticateKdsDevice, KdsDeviceController.bumpAll);
kdsDeviceRuntimeRouter.post('/unpair', authenticateKdsDevice, KdsDeviceController.unpairSelf);

// ----- Public pairing endpoint -----
export const kdsDevicePublicRouter = Router();
kdsDevicePublicRouter.post('/kds/pair', KdsDeviceController.pair);
