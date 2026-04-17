import { Router } from 'express';
import { TenantPaymentTypeController } from '../controllers/tenantPaymentTypeController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/payment-types/master/available', requireTenantPermission('payment_types.view'), TenantPaymentTypeController.getAvailableMaster);
router.post('/payment-types/import', requireTenantPermission('payment_types.create'), TenantPaymentTypeController.importFromMaster);

router.get('/payment-types', requireTenantPermission('payment_types.view'), TenantPaymentTypeController.getAll);
router.get('/payment-types/:id', requireTenantPermission('payment_types.view'), TenantPaymentTypeController.getById);
router.post('/payment-types', requireTenantPermission('payment_types.create'), TenantPaymentTypeController.create);
router.put('/payment-types/:id', requireTenantPermission('payment_types.edit'), TenantPaymentTypeController.update);
router.delete('/payment-types/:id', requireTenantPermission('payment_types.delete'), TenantPaymentTypeController.delete);

export default router;
