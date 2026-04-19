import { Router } from 'express';
import { PosQrController } from '../controllers/posQrController.js';

const router = Router();

// Token-based, unauthenticated invoice lookup. The token is the auth.
router.get('/invoice/:token', PosQrController.publicInvoice);

export default router;
