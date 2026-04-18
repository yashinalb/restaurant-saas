import { Router } from 'express';
import { QrInvoiceTokenController } from '../controllers/qrInvoiceTokenController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/qr-invoice-tokens', requireTenantPermission('qr_invoice_tokens.view'), QrInvoiceTokenController.getAll);
router.get('/qr-invoice-tokens/:id', requireTenantPermission('qr_invoice_tokens.view'), QrInvoiceTokenController.getById);
router.post('/qr-invoice-tokens', requireTenantPermission('qr_invoice_tokens.create'), QrInvoiceTokenController.create);
router.put('/qr-invoice-tokens/:id', requireTenantPermission('qr_invoice_tokens.edit'), QrInvoiceTokenController.update);
router.delete('/qr-invoice-tokens/:id', requireTenantPermission('qr_invoice_tokens.delete'), QrInvoiceTokenController.delete);

export default router;
