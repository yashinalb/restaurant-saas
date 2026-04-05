import { Router } from 'express';
import { NavigationMenuController } from '../controllers/navigationMenuController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/permissions.js';

const router = Router();

// All routes require authentication + super admin
router.use(authenticateToken, requireSuperAdmin);

// Navigation Menu CRUD
router.get('/navigation-menus', NavigationMenuController.getAllMenus);
router.post('/navigation-menus', NavigationMenuController.createMenu);
router.get('/navigation-menus/:id', NavigationMenuController.getMenuById);
router.put('/navigation-menus/:id', NavigationMenuController.updateMenu);
router.delete('/navigation-menus/:id', NavigationMenuController.deleteMenu);

// Navigation Items Management
router.get('/navigation-menus/:id/items', NavigationMenuController.getMenuItems);
router.post('/navigation-menus/:id/items', NavigationMenuController.createItem);
router.put('/navigation-menus/:id/items/reorder', NavigationMenuController.reorderItems);

// Individual Navigation Item Operations
router.get('/navigation-items/:id', NavigationMenuController.getItemById);
router.put('/navigation-items/:id', NavigationMenuController.updateItem);
router.delete('/navigation-items/:id', NavigationMenuController.deleteItem);

export default router;