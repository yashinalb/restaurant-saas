import { Router } from 'express';
import { TenantAdminUserController } from '../controllers/tenantAdminUserController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();

// All routes require authentication + tenant context
router.use(authenticateToken, loadTenantContext);

// ✅ MOST SPECIFIC ROUTES FIRST (before :id routes)

// Get available roles (no special permission needed, just authenticated in tenant)
router.get('/users/roles', TenantAdminUserController.getAvailableRoles);

// Invitations management (BEFORE /users/:id)
router.get('/users/invitations', requireTenantPermission('tenant_users.view'), TenantAdminUserController.getPendingInvitations);
router.post('/users/invite', requireTenantPermission('tenant_users.invite'), TenantAdminUserController.inviteUser);
router.delete('/users/invitations/:id', requireTenantPermission('tenant_users.invite'), TenantAdminUserController.cancelInvitation);

// ✅ THEN GENERIC ROUTES WITH :id (these catch everything else)

// View users
router.get('/users', requireTenantPermission('tenant_users.view'), TenantAdminUserController.getTenantUsers);
router.get('/users/:id', requireTenantPermission('tenant_users.view'), TenantAdminUserController.getTenantUserById);

// Update user
router.put('/users/:id', requireTenantPermission('tenant_users.edit'), TenantAdminUserController.updateTenantUser);
router.put('/users/:id/role', requireTenantPermission('tenant_users.edit'), TenantAdminUserController.updateUserRole);

// Delete user
router.delete('/users/:id', requireTenantPermission('tenant_users.delete'), TenantAdminUserController.removeUser);

export default router;