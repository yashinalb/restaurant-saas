import { Router } from 'express';
import { AddonController } from '../controllers/addonController.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken, requireSuperAdmin);

router.get('/addons', AddonController.getAll);
router.get('/addons/:id', AddonController.getById);
router.post('/addons', AddonController.create);
router.put('/addons/:id', AddonController.update);
router.delete('/addons/:id', AddonController.delete);

export default router;
