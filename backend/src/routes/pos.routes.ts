import { Router } from 'express';
import { PosSessionController } from '../controllers/posSessionController.js';
import { PosFloorController } from '../controllers/posFloorController.js';
import { PosOrderController } from '../controllers/posOrderController.js';
import { PosMenuController } from '../controllers/posMenuController.js';
import { PosItemOptionsController } from '../controllers/posItemOptionsController.js';
import { PosMoveItemsController } from '../controllers/posMoveItemsController.js';
import { PosPaymentController } from '../controllers/posPaymentController.js';
import { PosReceiptController } from '../controllers/posReceiptController.js';
import { PosKitchenTicketController } from '../controllers/posKitchenTicketController.js';
import { PosFireController } from '../controllers/posFireController.js';
import { PosItemStatusController } from '../controllers/posItemStatusController.js';
import { PosShiftController } from '../controllers/posShiftController.js';
import { PosQrController } from '../controllers/posQrController.js';
import { PosReservationController } from '../controllers/posReservationController.js';
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

// Payment
router.post('/pos/orders/:id/pay', requireTenantPermission('pos.take_order'), PosPaymentController.pay);

// Receipt (re-print anytime)
router.get('/pos/orders/:id/receipt', requireTenantPermission('pos.access'), PosReceiptController.getReceipt);
router.post('/pos/orders/:id/print-receipt', requireTenantPermission('pos.access'), PosReceiptController.printThermal);

// Kitchen / bar tickets
router.get('/pos/orders/:id/kitchen-tickets', requireTenantPermission('pos.take_order'), PosKitchenTicketController.getTickets);
router.post('/pos/orders/:id/print-kitchen-tickets', requireTenantPermission('pos.take_order'), PosKitchenTicketController.printTickets);

// Fire: status transition + KDS broadcast + ticket print
router.post('/pos/orders/:id/fire', requireTenantPermission('pos.take_order'), PosFireController.fire);

// Per-item status machine (tap-to-serve, manual transitions, cancel → void)
router.patch('/pos/order-items/:itemId/status', requireTenantPermission('pos.take_order'), PosItemStatusController.patch);

// QR invoice token generation (waiter-side "Show QR")
router.post('/pos/orders/:id/qr', requireTenantPermission('pos.access'), PosQrController.generate);

// Reservations Quick View (44.17) — today's reservations drawer on the tables page
router.get('/pos/reservations/today', requireTenantPermission('pos.access'), PosReservationController.today);
router.post('/pos/reservations/:id/check-in', requireTenantPermission('pos.take_order'), PosReservationController.checkIn);

// Cash register shift (required before payments)
router.get('/pos/shift', requireTenantPermission('pos.access'), PosShiftController.getActive);
router.post('/pos/shift/open', requireTenantPermission('cash_sessions.create'), PosShiftController.open);
router.post('/pos/shift/close', requireTenantPermission('cash_sessions.edit'), PosShiftController.close);

export default router;
