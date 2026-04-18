import { Router } from 'express';
import { PosSessionController } from '../controllers/posSessionController.js';
import { PosFloorController } from '../controllers/posFloorController.js';
import { PosOrderController } from '../controllers/posOrderController.js';
import { PosMenuController } from '../controllers/posMenuController.js';
import { PosItemOptionsController } from '../controllers/posItemOptionsController.js';
import { PosMoveItemsController } from '../controllers/posMoveItemsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

// Waiter PIN login/logout + active session lookup. All require pos.access.
router.get('/pos/session', requireTenantPermission('pos.access'), PosSessionController.getActiveSession);
router.post('/pos/login', requireTenantPermission('pos.access'), PosSessionController.login);
router.post('/pos/session/:id/logout', requireTenantPermission('pos.access'), PosSessionController.logout);

// Floor plan
router.get('/pos/seating-areas', requireTenantPermission('pos.access'), PosFloorController.getSeatingAreas);
router.get('/pos/floor', requireTenantPermission('pos.access'), PosFloorController.getFloor);
router.post('/pos/tables/:id/merge', requireTenantPermission('pos.take_order'), PosFloorController.merge);
router.post('/pos/tables/:id/unmerge', requireTenantPermission('pos.take_order'), PosFloorController.unmerge);

// Orders
router.post('/pos/orders/start', requireTenantPermission('pos.take_order'), PosOrderController.start);
router.post('/pos/orders/:id/quick-add', requireTenantPermission('pos.take_order'), PosMenuController.quickAdd);

// Menu browsing
router.get('/pos/menu/categories', requireTenantPermission('pos.access'), PosMenuController.getCategories);
router.get('/pos/menu/items', requireTenantPermission('pos.access'), PosMenuController.getItems);
router.get('/pos/menu/items/:id/options', requireTenantPermission('pos.access'), PosItemOptionsController.getOptions);
router.post('/pos/orders/:id/add-item', requireTenantPermission('pos.take_order'), PosItemOptionsController.addItem);

// Move items between orders
router.get('/pos/orders/active', requireTenantPermission('pos.take_order'), PosMoveItemsController.listActiveOrders);
router.post('/pos/orders/:id/move-items', requireTenantPermission('pos.take_order'), PosMoveItemsController.move);

export default router;
