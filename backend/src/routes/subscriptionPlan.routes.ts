import { Router } from 'express';
import { SubscriptionPlanController } from '../controllers/subscriptionPlanController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/permissions.js';

const router = Router();

// All subscription plan routes require authentication + super admin
router.use(authenticateToken, requireSuperAdmin);

// Subscription Plan CRUD
router.get('/subscription-plans', SubscriptionPlanController.getAllPlans);
router.post('/subscription-plans', SubscriptionPlanController.createPlan);
router.get('/subscription-plans/:id', SubscriptionPlanController.getPlanById);
router.put('/subscription-plans/:id', SubscriptionPlanController.updatePlan);
router.delete('/subscription-plans/:id', SubscriptionPlanController.deletePlan);

// Tenant Type Management
router.get('/subscription-plans/:id/tenant-types', SubscriptionPlanController.getPlanTenantTypes);
router.put('/subscription-plans/:id/tenant-types', SubscriptionPlanController.updatePlanTenantTypes);

// Get plans for a specific tenant type
router.get('/tenant-types/:id/subscription-plans', SubscriptionPlanController.getPlansForTenantType);

export default router;
