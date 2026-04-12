import { Router } from 'express';
import { TenantBannerController } from '../controllers/tenantBannerController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();

router.use(authenticateToken, loadTenantContext);

router.get('/banners', requireTenantPermission('banners.view'), TenantBannerController.getAll);
router.get('/banners/:id', requireTenantPermission('banners.view'), TenantBannerController.getById);
router.post('/banners', requireTenantPermission('banners.manage'), TenantBannerController.create);
router.put('/banners/:id', requireTenantPermission('banners.manage'), TenantBannerController.update);
router.delete('/banners/:id', requireTenantPermission('banners.manage'), TenantBannerController.delete);
router.patch('/banners/:id/toggle-active', requireTenantPermission('banners.manage'), TenantBannerController.toggleActive);

export default router;
