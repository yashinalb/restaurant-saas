import { Router } from 'express';
import { PaymentTypeController } from '../controllers/paymentTypeController.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken, requireSuperAdmin);

router.get('/payment-types', PaymentTypeController.getAll);
router.get('/payment-types/:id', PaymentTypeController.getById);
router.post('/payment-types', PaymentTypeController.create);
router.put('/payment-types/:id', PaymentTypeController.update);
router.delete('/payment-types/:id', PaymentTypeController.delete);

export default router;
