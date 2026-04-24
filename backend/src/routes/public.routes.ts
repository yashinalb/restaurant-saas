import { Router } from 'express';
import { PosQrController } from '../controllers/posQrController.js';
import { TenantBannerController } from '../controllers/tenantBannerController.js';

const router = Router();

// Token-based, unauthenticated invoice lookup. The token is the auth.
router.get('/invoice/:token', PosQrController.publicInvoice);

// Storefront banners by type — tenant resolved from slug. No auth.
router.get('/:tenantSlug/banners/type/:type', TenantBannerController.getPublicByType);

// Storefront banner interaction tracking (impression / click). No auth.
router.post('/:tenantSlug/banners/:id/track', TenantBannerController.trackPublicInteraction);

export default router;
