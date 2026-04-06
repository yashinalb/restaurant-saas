import { Router } from 'express';
import { MenuCategoryController } from '../controllers/menuCategoryController.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken, requireSuperAdmin);

router.get('/menu-categories', MenuCategoryController.getAll);
router.get('/menu-categories/:id', MenuCategoryController.getById);
router.post('/menu-categories', MenuCategoryController.create);
router.put('/menu-categories/:id', MenuCategoryController.update);
router.delete('/menu-categories/:id', MenuCategoryController.delete);

export default router;
