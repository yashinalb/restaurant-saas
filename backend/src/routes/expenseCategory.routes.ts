import { Router } from 'express';
import { ExpenseCategoryController } from '../controllers/expenseCategoryController.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken, requireSuperAdmin);

router.get('/expense-categories', ExpenseCategoryController.getAll);
router.get('/expense-categories/:id', ExpenseCategoryController.getById);
router.post('/expense-categories', ExpenseCategoryController.create);
router.put('/expense-categories/:id', ExpenseCategoryController.update);
router.delete('/expense-categories/:id', ExpenseCategoryController.delete);

export default router;
