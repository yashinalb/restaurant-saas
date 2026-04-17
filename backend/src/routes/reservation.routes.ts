import { Router } from 'express';
import { ReservationController } from '../controllers/reservationController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/reservations', requireTenantPermission('reservations.view'), ReservationController.getAll);
router.get('/reservations/:id', requireTenantPermission('reservations.view'), ReservationController.getById);
router.post('/reservations', requireTenantPermission('reservations.create'), ReservationController.create);
router.put('/reservations/:id', requireTenantPermission('reservations.edit'), ReservationController.update);
router.delete('/reservations/:id', requireTenantPermission('reservations.cancel'), ReservationController.delete);

export default router;
