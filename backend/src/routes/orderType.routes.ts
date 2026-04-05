import { Router } from 'express';
import { OrderTypeController } from '../controllers/orderTypeController.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken, requireSuperAdmin);

router.get('/order-types', OrderTypeController.getAll);
router.get('/order-types/:id', OrderTypeController.getById);
router.post('/order-types', OrderTypeController.create);
router.put('/order-types/:id', OrderTypeController.update);
router.delete('/order-types/:id', OrderTypeController.delete);

export default router;
