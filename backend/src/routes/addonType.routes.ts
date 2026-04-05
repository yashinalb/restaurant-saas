import { Router } from 'express';
import { AddonTypeController } from '../controllers/addonTypeController.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken, requireSuperAdmin);

router.get('/addon-types', AddonTypeController.getAll);
router.get('/addon-types/:id', AddonTypeController.getById);
router.post('/addon-types', AddonTypeController.create);
router.put('/addon-types/:id', AddonTypeController.update);
router.delete('/addon-types/:id', AddonTypeController.delete);

export default router;
