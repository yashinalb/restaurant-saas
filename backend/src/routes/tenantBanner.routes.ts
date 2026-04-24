import { Router } from 'express';
import { TenantBannerController } from '../controllers/tenantBannerController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';
import { uploadBannerImage, uploadBannerMobileImage } from '../middleware/upload.js';

const router = Router();

router.use(authenticateToken, loadTenantContext);

// Stats / sort-order / upload endpoints — MUST precede /:id routes
router.get('/banners/stats', requireTenantPermission('banners.view'), TenantBannerController.getStats);
router.put('/banners/sort-order', requireTenantPermission('banners.manage'), TenantBannerController.updateSortOrder);

router.post(
  '/banners/upload-image',
  requireTenantPermission('banners.manage'),
  uploadBannerImage,
  TenantBannerController.uploadImage
);
router.post(
  '/banners/upload-mobile-image',
  requireTenantPermission('banners.manage'),
  uploadBannerMobileImage,
  TenantBannerController.uploadImage
);
router.delete('/banners/delete-image', requireTenantPermission('banners.manage'), TenantBannerController.deleteImage);

// CRUD
router.get('/banners', requireTenantPermission('banners.view'), TenantBannerController.getAll);
router.get('/banners/:id', requireTenantPermission('banners.view'), TenantBannerController.getById);
router.post('/banners', requireTenantPermission('banners.manage'), TenantBannerController.create);
router.put('/banners/:id', requireTenantPermission('banners.manage'), TenantBannerController.update);
router.delete('/banners/:id', requireTenantPermission('banners.manage'), TenantBannerController.delete);
router.patch('/banners/:id/toggle-active', requireTenantPermission('banners.manage'), TenantBannerController.toggleActive);
router.post('/banners/:id/duplicate', requireTenantPermission('banners.manage'), TenantBannerController.duplicate);

export default router;
