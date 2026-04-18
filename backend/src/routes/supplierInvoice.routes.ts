import { Router } from 'express';
import { SupplierInvoiceController } from '../controllers/supplierInvoiceController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/supplier-invoices', requireTenantPermission('supplier_invoices.view'), SupplierInvoiceController.getAll);
router.get('/supplier-invoices/:id', requireTenantPermission('supplier_invoices.view'), SupplierInvoiceController.getById);
router.post('/supplier-invoices', requireTenantPermission('supplier_invoices.create'), SupplierInvoiceController.create);
router.put('/supplier-invoices/:id', requireTenantPermission('supplier_invoices.edit'), SupplierInvoiceController.update);
router.delete('/supplier-invoices/:id', requireTenantPermission('supplier_invoices.delete'), SupplierInvoiceController.delete);

export default router;
