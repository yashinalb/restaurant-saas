import { Router } from 'express';
import { LanguageController } from '../controllers/languageController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/permissions.js';

const router = Router();
router.get('/languages/active', authenticateToken, LanguageController.getActiveLanguages);

// All language routes require authentication + super admin
router.use(authenticateToken, requireSuperAdmin);

// Language CRUD
router.get('/languages', LanguageController.getAllLanguages);
router.post('/languages', LanguageController.createLanguage);
router.get('/languages/:id', LanguageController.getLanguageById);
router.put('/languages/:id', LanguageController.updateLanguage);
router.delete('/languages/:id', LanguageController.deleteLanguage);

// Reorder languages
router.put('/languages/reorder', LanguageController.reorderLanguages);

export default router;