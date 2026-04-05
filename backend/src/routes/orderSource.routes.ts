import { Router } from 'express';
import { OrderSourceController } from '../controllers/orderSourceController.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken, requireSuperAdmin);

router.get('/order-sources', OrderSourceController.getAll);
router.get('/order-sources/:id', OrderSourceController.getById);
router.post('/order-sources', OrderSourceController.create);
router.put('/order-sources/:id', OrderSourceController.update);
router.delete('/order-sources/:id', OrderSourceController.delete);

export default router;
