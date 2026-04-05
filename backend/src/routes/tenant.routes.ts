import { Router } from 'express';
import { TenantController } from '../controllers/tenantController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/permissions.js';

const router = Router();

// All tenant routes require authentication + super admin
router.use(authenticateToken, requireSuperAdmin);

// Tenant CRUD
router.get('/tenants', TenantController.getAllTenants);
router.post('/tenants', TenantController.createTenant);
router.get('/tenants/:id', TenantController.getTenantById);
router.put('/tenants/:id', TenantController.updateTenant);
router.delete('/tenants/:id', TenantController.deleteTenant);

// Subscription status
router.get('/tenants/:id/subscription-status', TenantController.getTenantSubscriptionStatus);

// Languages management
router.get('/tenants/:id/languages', TenantController.getTenantLanguages);
router.put('/tenants/:id/languages', TenantController.updateTenantLanguages);

// Currencies management
router.get('/tenants/:id/currencies', TenantController.getTenantCurrencies);
router.put('/tenants/:id/currencies', TenantController.updateTenantCurrencies);





export default router;
