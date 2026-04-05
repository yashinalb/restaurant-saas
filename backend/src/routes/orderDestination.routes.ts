import { Router } from 'express';
import { OrderDestinationController } from '../controllers/orderDestinationController.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken, requireSuperAdmin);

router.get('/order-destinations', OrderDestinationController.getAll);
router.get('/order-destinations/:id', OrderDestinationController.getById);
router.post('/order-destinations', OrderDestinationController.create);
router.put('/order-destinations/:id', OrderDestinationController.update);
router.delete('/order-destinations/:id', OrderDestinationController.delete);

export default router;
