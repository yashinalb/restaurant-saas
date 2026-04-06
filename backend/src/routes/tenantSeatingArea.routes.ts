import { Router } from 'express';
import { TenantSeatingAreaController } from '../controllers/tenantSeatingAreaController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/seating-areas', requireTenantPermission('seating_areas.view'), TenantSeatingAreaController.getAll);
router.get('/seating-areas/:id', requireTenantPermission('seating_areas.view'), TenantSeatingAreaController.getById);
router.post('/seating-areas', requireTenantPermission('seating_areas.create'), TenantSeatingAreaController.create);
router.put('/seating-areas/:id', requireTenantPermission('seating_areas.edit'), TenantSeatingAreaController.update);
router.delete('/seating-areas/:id', requireTenantPermission('seating_areas.delete'), TenantSeatingAreaController.delete);

export default router;
