import { Router } from 'express';
import { TenantInventoryProductController } from '../controllers/tenantInventoryProductController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/inventory-products', requireTenantPermission('inventory_products.view'), TenantInventoryProductController.getAll);
router.get('/inventory-products/:id', requireTenantPermission('inventory_products.view'), TenantInventoryProductController.getById);
router.post('/inventory-products', requireTenantPermission('inventory_products.create'), TenantInventoryProductController.create);
router.put('/inventory-products/:id', requireTenantPermission('inventory_products.edit'), TenantInventoryProductController.update);
router.delete('/inventory-products/:id', requireTenantPermission('inventory_products.delete'), TenantInventoryProductController.delete);

export default router;
