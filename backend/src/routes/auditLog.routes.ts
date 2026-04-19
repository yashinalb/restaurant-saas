import { Router } from 'express';
import { AuditLogController } from '../controllers/auditLogController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();
router.use(authenticateToken, loadTenantContext);

router.get('/audit-logs', requireTenantPermission('audit_logs.view'), AuditLogController.getAll);
router.get('/audit-logs/actions', requireTenantPermission('audit_logs.view'), AuditLogController.getActions);

export default router;
