import { Router } from 'express';
import { StockIntakeController } from '../controllers/stockIntakeController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/stock-intakes', requireTenantPermission('stock_intakes.view'), StockIntakeController.getAll);
router.get('/stock-intakes/:id', requireTenantPermission('stock_intakes.view'), StockIntakeController.getById);
router.post('/stock-intakes', requireTenantPermission('stock_intakes.create'), StockIntakeController.create);
router.put('/stock-intakes/:id', requireTenantPermission('stock_intakes.edit'), StockIntakeController.update);
router.delete('/stock-intakes/:id', requireTenantPermission('stock_intakes.delete'), StockIntakeController.delete);

export default router;
