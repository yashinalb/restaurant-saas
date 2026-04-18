import { Router } from 'express';
import { SupplierCreditController } from '../controllers/supplierCreditController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/supplier-credits', requireTenantPermission('supplier_credits.view'), SupplierCreditController.getAll);
router.get('/supplier-credits/:id', requireTenantPermission('supplier_credits.view'), SupplierCreditController.getById);
router.post('/supplier-credits', requireTenantPermission('supplier_credits.create'), SupplierCreditController.create);
router.put('/supplier-credits/:id', requireTenantPermission('supplier_credits.edit'), SupplierCreditController.update);
router.delete('/supplier-credits/:id', requireTenantPermission('supplier_credits.delete'), SupplierCreditController.delete);

// Payment sub-resources
router.post('/supplier-credits/:id/payments', requireTenantPermission('supplier_credits.edit'), SupplierCreditController.addPayment);
router.delete('/supplier-credits/payments/:paymentId', requireTenantPermission('supplier_credits.edit'), SupplierCreditController.deletePayment);

export default router;
