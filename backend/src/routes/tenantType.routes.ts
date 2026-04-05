import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/permissions.js';
import { TenantTypeController } from '../controllers/tenantTypeController.js';

const router = express.Router();

// All tenant type routes require super admin
router.use(authenticateToken, requireSuperAdmin);

// GET /api/admin/tenant-types - Get all tenant types
router.get('/tenant-types/', TenantTypeController.getAllTenantTypes);

// GET /api/admin/tenant-types/code/:code - Get tenant type by code
router.get('/tenant-types/code/:code', TenantTypeController.getTenantTypeByCode);

// GET /api/admin/tenant-types/:id - Get tenant type by ID
router.get('/tenant-types/:id', TenantTypeController.getTenantTypeById);

// POST /api/admin/tenant-types - Create new tenant type
router.post('/tenant-types', TenantTypeController.createTenantType);

// PUT /api/admin/tenant-types/:id - Update tenant type
router.put('/tenant-types/:id', TenantTypeController.updateTenantType);

// DELETE /api/admin/tenant-types/:id - Delete tenant type
router.delete('/tenant-types/:id', TenantTypeController.deleteTenantType);

export default router;
