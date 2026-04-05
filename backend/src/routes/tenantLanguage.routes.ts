// ADD THESE ROUTES TO YOUR EXISTING tenantBrand.routes.ts OR CREATE A NEW tenant.routes.ts

import { Router } from 'express';
import { TenantLanguageController } from '../controllers/tenantLanguageController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext } from '../middleware/tenantAuth.js';

const router = Router();

// All routes require authentication + tenant context
router.use(authenticateToken, loadTenantContext);

// Get tenant's configured languages (for form dropdowns)
router.get('/languages', TenantLanguageController.getTenantLanguages);

// Get tenant's configured currencies (for form dropdowns)
router.get('/currencies', TenantLanguageController.getTenantCurrencies);

export default router;
