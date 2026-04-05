import { Request, Response } from 'express';
import { AuthService } from '../services/authService.js';
import { AuthRequest } from '../middleware/auth.js';
import { emailService } from '../services/emailService.js';
import pool from '../config/database.js';
import argon2 from 'argon2';
import { RowDataPacket } from 'mysql2';
import crypto from 'crypto';
import { validatePassword, getPasswordRequirements } from '../utils/passwordValidator.js';

export class AuthController {
  /**
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password required' });
        return;
      }

      // Get client metadata for security tracking
      const metadata = {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      };

      const result = await AuthService.login(email, password, metadata);

      // Set refresh token in HTTP-only cookie (more secure than localStorage)
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        message: 'Login successful',
        data: {
          admin: result.admin,
          accessToken: result.accessToken,
          // Don't send refresh token in body if using cookies
          // refreshToken: result.refreshToken,
        }
      });
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Return generic error message to prevent user enumeration
      const statusCode = error.message.includes('locked') ? 423 : 401;
      res.status(statusCode).json({ 
        error: error.message || 'Authentication failed' 
      });
    }
  }

  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      // Get refresh token from cookie or body
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        res.status(401).json({ error: 'Refresh token required' });
        return;
      }

      // Get client metadata
      const metadata = {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      };

      const result = await AuthService.refreshAccessToken(refreshToken, metadata);

      // Set new refresh token in cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        message: 'Token refreshed successfully',
        data: {
          accessToken: result.accessToken,
        }
      });
    } catch (error: any) {
      console.error('Refresh token error:', error);
      
      // Clear invalid refresh token cookie
      res.clearCookie('refreshToken');
      
      res.status(401).json({ 
        error: 'Invalid or expired refresh token' 
      });
    }
  }

  /**
   * GET /api/auth/me
   */
  static async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.admin) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const profile = await AuthService.getProfile(req.admin.id);
      const tenants = await AuthService.getAdminTenants(
        req.admin.id,
        req.admin.is_super_admin
      );

      res.json({
        data: {
          admin: profile,
          tenants
        }
      });
    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }

  /**
   * POST /api/auth/logout
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (refreshToken) {
        await AuthService.logout(refreshToken);
      }

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      res.json({ message: 'Logged out successfully' });
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  /**
   * POST /api/auth/logout-all
   * Logout from all devices
   */
  static async logoutAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.admin) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      await AuthService.logoutAll(req.admin.id);

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      res.json({ message: 'Logged out from all devices successfully' });
    } catch (error: any) {
      console.error('Logout all error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  /**
   * GET /api/auth/sessions
   * Get all active sessions
   */
  static async getSessions(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.admin) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const sessions = await AuthService.getActiveSessions(req.admin.id);

      res.json({ data: sessions });
    } catch (error: any) {
      console.error('Get sessions error:', error);
      res.status(500).json({ error: 'Failed to get sessions' });
    }
  }

  /**
   * DELETE /api/auth/sessions/:sessionId
   * Revoke specific session
   */
  static async revokeSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.admin) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        res.status(400).json({ error: 'Invalid session ID' });
        return;
      }

      await AuthService.revokeSession(req.admin.id, sessionId);

      res.json({ message: 'Session revoked successfully' });
    } catch (error: any) {
      console.error('Revoke session error:', error);
      res.status(500).json({ error: 'Failed to revoke session' });
    }
  }

  /**
   * POST /api/auth/forgot-password
   * Request password reset
   */
 static async forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    //console.log('🔍 Forgot password request for:', email);

    // Find user by email
    const [users] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, is_active FROM admin_users WHERE email = ?',
      [email]
    );

   // console.log('👤 Users found:', users.length);

    // Always return success (security: don't reveal if email exists)
    if (users.length === 0) {
      console.log('❌ No user found with email:', email);
      res.json({ 
        message: 'If an account exists with this email, a password reset link has been sent.' 
      });
      return;
    }

    const user = users[0];

    // Check if account is active
    if (!user.is_active) {
  //    console.log('⚠️ User account is inactive:', email);
      res.json({ 
        message: 'If an account exists with this email, a password reset link has been sent.' 
      });
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Token expires in 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

 //   console.log('💾 Saving reset token to database...');

    // Save hashed token to database
    await pool.query(
      `UPDATE admin_users 
       SET password_reset_token = ?, password_reset_expires = ? 
       WHERE id = ?`,
      [hashedToken, expiresAt, user.id]
    );

  //  console.log('📧 Sending password reset email...');

    // Send email with unhashed token
    await emailService.sendPasswordResetEmail(email, resetToken);

 //   console.log('✅ Password reset email sent successfully');

    res.json({ 
      message: 'If an account exists with this email, a password reset link has been sent.' 
    });
  } catch (error: any) {
    console.error('❌ Forgot password error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to process password reset request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

  /**
   * POST /api/auth/reset-password
   * Reset password using token
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({ error: 'Token and new password are required' });
        return;
      }

      // 🔒 SECURITY IMPROVEMENT: Validate password strength with comprehensive rules
      const validation = validatePassword(newPassword);
      if (!validation.isValid) {
        res.status(400).json({
          error: 'Password does not meet security requirements',
          validationErrors: validation.errors,
          requirements: getPasswordRequirements()
        });
        return;
      }

      // Hash the token to match database
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      // Find user with valid token
      const [users] = await pool.query<RowDataPacket[]>(
        `SELECT id, email FROM admin_users 
         WHERE password_reset_token = ? 
         AND password_reset_expires > NOW() 
         AND is_active = 1`,
        [hashedToken]
      );

      if (users.length === 0) {
        res.status(400).json({ 
          error: 'Invalid or expired reset token',
          code: 'INVALID_RESET_TOKEN'
        });
        return;
      }

      const user = users[0];

      // Hash new password
      const passwordHash = await argon2.hash(newPassword);

      // Update password and clear reset token
      await pool.query(
        `UPDATE admin_users 
         SET password_hash = ?, 
             password_reset_token = NULL, 
             password_reset_expires = NULL 
         WHERE id = ?`,
        [passwordHash, user.id]
      );

      res.json({ message: 'Password reset successfully' });
    } catch (error: any) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }

  /**
   * GET /api/auth/password-requirements
   * Get password requirements for client-side validation
   */
  static async getPasswordRequirements(_req: Request, res: Response): Promise<void> {
    try {
      const requirements = getPasswordRequirements();
      res.json({
        data: requirements,
        message: `Password requirements:
• At least 12 characters long
• At least one uppercase letter (A-Z)
• At least one lowercase letter (a-z)
• At least one number (0-9)
• At least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?\\)
• Not a common password
• No sequential or repeated characters`
      });
    } catch (error: any) {
      console.error('Get password requirements error:', error);
      res.status(500).json({ error: 'Failed to get password requirements' });
    }
  }

  /**
   * POST /api/auth/verify-email
   * Verify email address using token
   */
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ error: 'Verification token is required' });
        return;
      }

      // Hash the token to match database
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      // Find valid verification token
      const [tokens] = await pool.query<RowDataPacket[]>(
        `SELECT evt.*, au.email, au.first_name, au.email_verified_at
         FROM email_verification_tokens evt
         JOIN admin_users au ON evt.admin_user_id = au.id
         WHERE evt.token_hash = ?
         AND evt.expires_at > NOW()
         AND evt.used_at IS NULL
         AND au.is_active = 1`,
        [hashedToken]
      );

      if (tokens.length === 0) {
        res.status(400).json({
          error: 'Invalid or expired verification token',
          code: 'INVALID_VERIFICATION_TOKEN'
        });
        return;
      }

      const tokenData = tokens[0];

      // Check if already verified
      if (tokenData.email_verified_at) {
        res.status(400).json({
          error: 'Email already verified',
          code: 'ALREADY_VERIFIED'
        });
        return;
      }

      // Mark email as verified
      await pool.query(
        `UPDATE admin_users
         SET email_verified_at = NOW()
         WHERE id = ?`,
        [tokenData.admin_user_id]
      );

      // Mark token as used
      await pool.query(
        `UPDATE email_verification_tokens
         SET used_at = NOW()
         WHERE id = ?`,
        [tokenData.id]
      );

      // Send verification success email
      await emailService.sendVerificationSuccessEmail(
        tokenData.email,
        tokenData.first_name || 'User'
      );

      res.json({
        message: 'Email verified successfully. You can now log in.',
        data: {
          email: tokenData.email
        }
      });
    } catch (error: any) {
      console.error('Verify email error:', error);
      res.status(500).json({ error: 'Failed to verify email' });
    }
  }

  /**
   * POST /api/auth/resend-verification
   * Resend email verification link
   */
  static async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      // Find user by email
      const [users] = await pool.query<RowDataPacket[]>(
        `SELECT id, email, first_name, is_active, email_verified_at, is_super_admin
         FROM admin_users
         WHERE email = ?`,
        [email]
      );

      // Always return success (security: don't reveal if email exists)
      if (users.length === 0) {
        res.json({
          message: 'If an account exists with this email and is not verified, a verification link has been sent.'
        });
        return;
      }

      const user = users[0];

      // Check if account is active
      if (!user.is_active) {
        res.json({
          message: 'If an account exists with this email and is not verified, a verification link has been sent.'
        });
        return;
      }

      // Check if already verified
      if (user.email_verified_at) {
        res.status(400).json({
          error: 'Email already verified',
          code: 'ALREADY_VERIFIED'
        });
        return;
      }

      // Super admins don't need verification
      if (user.is_super_admin) {
        res.json({
          message: 'If an account exists with this email and is not verified, a verification link has been sent.'
        });
        return;
      }

      // Invalidate any existing tokens for this user
      await pool.query(
        `UPDATE email_verification_tokens
         SET used_at = NOW()
         WHERE admin_user_id = ? AND used_at IS NULL`,
        [user.id]
      );

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');

      // Token expires in 24 hours
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Get client metadata
      const metadata = {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      };

      // Save new verification token
      await pool.query(
        `INSERT INTO email_verification_tokens
         (admin_user_id, token_hash, expires_at, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?)`,
        [user.id, hashedToken, expiresAt, metadata.ipAddress, metadata.userAgent]
      );

      // Send verification email
      await emailService.sendEmailVerification(
        user.email,
        user.first_name || 'User',
        verificationToken
      );

      res.json({
        message: 'Verification email sent successfully. Please check your inbox.'
      });
    } catch (error: any) {
      console.error('Resend verification error:', error);
      res.status(500).json({ error: 'Failed to resend verification email' });
    }
  }
}