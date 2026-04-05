import { Router } from 'express';
import { PermissionController } from '../controllers/permissionController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext } from '../middleware/tenantAuth.js';

const router = Router();

// Get current user's permissions for current tenant
router.get(
  '/permissions',
  authenticateToken,
  loadTenantContext,
  PermissionController.getMyPermissions
);

export default router;
