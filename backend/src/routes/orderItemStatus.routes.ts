import { Router } from 'express';
import { OrderItemStatusController } from '../controllers/orderItemStatusController.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken, requireSuperAdmin);

router.get('/order-item-statuses', OrderItemStatusController.getAll);
router.get('/order-item-statuses/:id', OrderItemStatusController.getById);
router.post('/order-item-statuses', OrderItemStatusController.create);
router.put('/order-item-statuses/:id', OrderItemStatusController.update);
router.delete('/order-item-statuses/:id', OrderItemStatusController.delete);

export default router;
