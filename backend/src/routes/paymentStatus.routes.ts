import { Router } from 'express';
import { PaymentStatusController } from '../controllers/paymentStatusController.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken, requireSuperAdmin);

router.get('/payment-statuses', PaymentStatusController.getAll);
router.get('/payment-statuses/:id', PaymentStatusController.getById);
router.post('/payment-statuses', PaymentStatusController.create);
router.put('/payment-statuses/:id', PaymentStatusController.update);
router.delete('/payment-statuses/:id', PaymentStatusController.delete);

export default router;
