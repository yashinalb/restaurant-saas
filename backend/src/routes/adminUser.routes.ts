import { Router } from 'express';
import { AdminUserController } from '../controllers/adminUserController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/permissions.js';

const router = Router();

// All routes require authentication + super admin
router.use(authenticateToken, requireSuperAdmin);

// Admin User CRUD
router.get('/admin-users', AdminUserController.getAllAdminUsers);
router.post('/admin-users', AdminUserController.createAdminUser);
router.get('/admin-users/:id', AdminUserController.getAdminUserById);
router.put('/admin-users/:id', AdminUserController.updateAdminUser);
router.delete('/admin-users/:id', AdminUserController.deleteAdminUser);

// Tenant Access Management
router.post('/admin-users/:id/grant-access', AdminUserController.grantTenantAccess);
router.delete('/admin-users/:id/revoke-access/:tenantId', AdminUserController.revokeTenantAccess);

// Permissions
router.get('/admin-users/:id/permissions/:tenantId', AdminUserController.getAdminPermissions);

router.put('/language-preference', authenticateToken, AdminUserController.updateOwnLanguage);

export default router;
