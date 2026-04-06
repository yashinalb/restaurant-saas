import { Router } from 'express';
import { IngredientController } from '../controllers/ingredientController.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken, requireSuperAdmin);

router.get('/ingredients', IngredientController.getAll);
router.get('/ingredients/:id', IngredientController.getById);
router.post('/ingredients', IngredientController.create);
router.put('/ingredients/:id', IngredientController.update);
router.delete('/ingredients/:id', IngredientController.delete);

export default router;
