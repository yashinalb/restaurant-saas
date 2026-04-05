import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { AdminUserController } from '../controllers/adminUserController.js';

const router = Router();

// Public routes (with rate limiting)
router.post('/login', authRateLimiter, AuthController.login);
router.post('/refresh', authRateLimiter, AuthController.refreshToken);
router.post('/logout', AuthController.logout);

// Password requirements (public, for client-side validation)
router.get('/password-requirements', AuthController.getPasswordRequirements);

// Protected routes
router.get('/me', authenticateToken, AuthController.getProfile);
router.post('/logout-all', authenticateToken, AuthController.logoutAll);
router.get('/sessions', authenticateToken, AuthController.getSessions);
router.delete('/sessions/:sessionId', authenticateToken, AuthController.revokeSession);

// Password reset routes
router.post('/forgot-password', authRateLimiter, AuthController.forgotPassword);
router.post('/reset-password', authRateLimiter, AuthController.resetPassword);

// Email verification routes (public, with rate limiting)
router.post('/verify-email', authRateLimiter, AuthController.verifyEmail);
router.post('/resend-verification', authRateLimiter, AuthController.resendVerification);

// ✅ ADD THIS - Language preference (authenticated users only)
router.put('/language-preference', authenticateToken, AdminUserController.updateOwnLanguage);

// ✅ ADD THIS - Public invitation acceptance (no auth required)
router.post('/accept-invitation', authRateLimiter, async (req, res) => {
  // Create a temporary controller method or handle inline
  try {
    const { token, password, first_name, last_name } = req.body;

    if (!token || !password || !first_name || !last_name) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    const result = await (await import('../services/tenantAdminUserService.js')).TenantAdminUserService.acceptInvitation({
      token,
      password,
      first_name,
      last_name,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Accept invitation error:', error);
    if (error.message.includes('Invalid or expired')) {
      res.status(400).json({ error: error.message });
    } else if (error.message.includes('Password does not meet security requirements')) {
      // Return detailed validation errors
      res.status(400).json({
        error: error.message,
        validationErrors: error.validationErrors || [],
        requirements: error.requirements || {}
      });
    } else if (error.message.includes('Password must')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to accept invitation' });
    }
  }
});

export default router;