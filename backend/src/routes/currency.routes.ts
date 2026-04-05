import { Router } from 'express';
import { CurrencyController } from '../controllers/currencyController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/permissions.js';

const router = Router();

// All currency routes require authentication + super admin
router.use(authenticateToken, requireSuperAdmin);

// Currency CRUD
router.get('/currencies', CurrencyController.getAllCurrencies);
router.post('/currencies', CurrencyController.createCurrency);
router.get('/currencies/:id', CurrencyController.getCurrencyById);
router.put('/currencies/:id', CurrencyController.updateCurrency);
router.delete('/currencies/:id', CurrencyController.deleteCurrency);

// Update exchange rates in bulk
router.put('/currencies/exchange-rates', CurrencyController.updateExchangeRates);

export default router;
