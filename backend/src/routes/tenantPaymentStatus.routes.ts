import { Router } from 'express';
import { TenantPaymentStatusController } from '../controllers/tenantPaymentStatusController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/payment-statuses/master/available', requireTenantPermission('payment_statuses.view'), TenantPaymentStatusController.getAvailableMaster);
router.post('/payment-statuses/import', requireTenantPermission('payment_statuses.create'), TenantPaymentStatusController.importFromMaster);

router.get('/payment-statuses', requireTenantPermission('payment_statuses.view'), TenantPaymentStatusController.getAll);
router.get('/payment-statuses/:id', requireTenantPermission('payment_statuses.view'), TenantPaymentStatusController.getById);
router.post('/payment-statuses', requireTenantPermission('payment_statuses.create'), TenantPaymentStatusController.create);
router.put('/payment-statuses/:id', requireTenantPermission('payment_statuses.edit'), TenantPaymentStatusController.update);
router.delete('/payment-statuses/:id', requireTenantPermission('payment_statuses.delete'), TenantPaymentStatusController.delete);

export default router;
