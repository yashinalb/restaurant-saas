import { Router } from 'express';
import { DailyReportSnapshotController } from '../controllers/dailyReportSnapshotController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

// Most-specific first
router.post('/daily-reports/generate', requireTenantPermission('daily_reports.create'), DailyReportSnapshotController.generate);

router.get('/daily-reports', requireTenantPermission('daily_reports.view'), DailyReportSnapshotController.getAll);
router.get('/daily-reports/:id', requireTenantPermission('daily_reports.view'), DailyReportSnapshotController.getById);
router.post('/daily-reports', requireTenantPermission('daily_reports.create'), DailyReportSnapshotController.create);
router.put('/daily-reports/:id', requireTenantPermission('daily_reports.edit'), DailyReportSnapshotController.update);
router.delete('/daily-reports/:id', requireTenantPermission('daily_reports.delete'), DailyReportSnapshotController.delete);

export default router;
