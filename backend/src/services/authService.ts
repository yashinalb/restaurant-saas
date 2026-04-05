import argon2 from 'argon2';
import pool from '../config/database.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { AdminUser } from '../types/index.js';
import crypto from 'crypto';
import { RowDataPacket } from 'mysql2';
import { logIPChange, logTokenRefresh } from '../utils/activityLogger.js';
import { emailService } from './emailService.js';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

/**
 * 🔒 SECURITY: IP Change Detection Policy
 * - "log" (default in dev): Only log the IP change, allow refresh
 * - "block" (default in production): Revoke token and require re-login
 * - "notify": Send email notification and allow refresh
 */
type IPChangePolicy = 'log' | 'block' | 'notify';

function getIPChangePolicy(): IPChangePolicy {
  const policy = process.env.IP_CHANGE_POLICY?.toLowerCase();

  // Default to 'block' in production for maximum security
  if (!policy) {
    return process.env.NODE_ENV === 'production' ? 'block' : 'log';
  }

  if (policy === 'log' || policy === 'block' || policy === 'notify') {
    return policy;
  }

  console.warn(`Invalid IP_CHANGE_POLICY: ${policy}. Defaulting to 'log'`);
  return 'log';
}

interface LoginMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export class AuthService {
  /**
   * Check if account is locked due to failed login attempts
   */
  private static async isAccountLocked(email: string): Promise<boolean> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT failed_login_attempts, last_failed_login_at 
       FROM admin_users 
       WHERE email = ?`,
      [email]
    );

    if (rows.length === 0) return false;

    const user = rows[0];
    const attempts = user.failed_login_attempts || 0;
    const lastFailed = user.last_failed_login_at;

    if (attempts >= MAX_LOGIN_ATTEMPTS && lastFailed) {
      const lockoutEnd = new Date(lastFailed);
      lockoutEnd.setMinutes(lockoutEnd.getMinutes() + LOCKOUT_DURATION_MINUTES);

      if (new Date() < lockoutEnd) {
        return true;
      }
    }

    return false;
  }

  /**
   * Increment failed login attempts
   */
  private static async incrementFailedAttempts(email: string): Promise<void> {
    await pool.query(
      `UPDATE admin_users 
       SET failed_login_attempts = failed_login_attempts + 1,
           last_failed_login_at = NOW()
       WHERE email = ?`,
      [email]
    );
  }

  /**
   * Reset failed login attempts on successful login
   */
  private static async resetFailedAttempts(adminId: bigint): Promise<void> {
    await pool.query(
      `UPDATE admin_users 
       SET failed_login_attempts = 0,
           last_failed_login_at = NULL
       WHERE id = ?`,
      [adminId]
    );
  }

  /**
   * Login admin user with enhanced security
   */
  static async login(
    email: string,
    password: string,
    metadata: LoginMetadata = {}
  ): Promise<{
    admin: Omit<AdminUser, 'password_hash'>;
    accessToken: string;
    refreshToken: string;
  }> {
    // Check if account is locked
    if (await this.isAccountLocked(email)) {
      throw new Error('Account temporarily locked due to multiple failed login attempts');
    }

    // Get admin by email
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM admin_users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      // Don't reveal if email exists
      throw new Error('Invalid credentials');
    }

    const admin = rows[0] as AdminUser;

    // Check if account is active
    if (!admin.is_active) {
      throw new Error('Account is disabled');
    }

    // Verify password with timing-safe comparison
    let validPassword = false;
    try {
      validPassword = await argon2.verify(admin.password_hash, password);
    } catch (error) {
      console.error('Password verification error:', error);
      validPassword = false;
    }

    if (!validPassword) {
      await this.incrementFailedAttempts(email);
      throw new Error('Invalid credentials');
    }

    // Reset failed attempts on successful login
    await this.resetFailedAttempts(admin.id);

    // Check if email is verified (unless super admin)
    if (!admin.is_super_admin && !admin.email_verified_at) {
      throw new Error('Email not verified. Please check your email for verification link.');
    }

    // Update last login
    await pool.query(
      'UPDATE admin_users SET last_login_at = NOW() WHERE id = ?',
      [admin.id]
    );

    // Generate tokens
    const payload = {
      adminId: admin.id,
      email: admin.email,
      isSuperAdmin: admin.is_super_admin,
      // Add token ID for revocation capability
      jti: crypto.randomUUID(),
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store refresh token hash with metadata
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await pool.query(
      `INSERT INTO admin_refresh_tokens 
       (admin_user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), ?, ?)`,
      [
        admin.id,
        tokenHash,
        metadata.ipAddress || null,
        metadata.userAgent || null
      ]
    );

    // Clean up old refresh tokens (optional)
    await pool.query(
      `DELETE FROM admin_refresh_tokens 
       WHERE admin_user_id = ? 
       AND (expires_at < NOW() OR revoked_at IS NOT NULL)`,
      [admin.id]
    );

    // Remove password hash before sending
    const { password_hash, ...adminWithoutPassword } = admin;

    return {
      admin: adminWithoutPassword,
      accessToken,
      refreshToken
    };
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(
    refreshToken: string,
    metadata: LoginMetadata = {}
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Check if refresh token exists and is valid
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM admin_refresh_tokens 
       WHERE token_hash = ? 
       AND admin_user_id = ?
       AND expires_at > NOW()
       AND revoked_at IS NULL`,
      [tokenHash, payload.adminId]
    );

    if (rows.length === 0) {
      throw new Error('Invalid or expired refresh token');
    }

    // 🔒 SECURITY IMPROVEMENT: IP Change Detection with configurable policy
    const storedToken = rows[0];
    if (metadata.ipAddress && storedToken.ip_address) {
      if (metadata.ipAddress !== storedToken.ip_address) {
        const policy = getIPChangePolicy();
        const oldIP = storedToken.ip_address;
        const newIP = metadata.ipAddress;

        // Get admin details for email notification
        const [adminRows] = await pool.query<RowDataPacket[]>(
          'SELECT email, first_name FROM admin_users WHERE id = ?',
          [payload.adminId]
        );

        const admin = adminRows[0];

        if (policy === 'block') {
          // BLOCK: Revoke the refresh token and require re-login
          console.warn('🔒 IP change detected - BLOCKING refresh token', {
            adminId: payload.adminId,
            email: admin?.email,
            oldIP,
            newIP,
          });

          // Revoke the current token
          await pool.query(
            'UPDATE admin_refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?',
            [tokenHash]
          );

          // Log security event
          await logIPChange(
            Number(payload.adminId),
            oldIP,
            newIP,
            'blocked',
            metadata.userAgent
          );

          // Throw error to require re-login
          throw new Error(
            'Security alert: IP address change detected. Please log in again to verify your identity.'
          );
        } else if (policy === 'notify') {
          // NOTIFY: Send email notification but allow refresh
          console.warn('⚠️  IP change detected - NOTIFYING user', {
            adminId: payload.adminId,
            email: admin?.email,
            oldIP,
            newIP,
          });

          // Send email notification (async, don't wait)
          if (admin) {
            emailService
              .sendIPChangeNotification(
                admin.email,
                admin.first_name || 'User',
                oldIP,
                newIP,
                new Date(),
                metadata.userAgent
              )
              .catch((error) => {
                console.error('Failed to send IP change notification email:', error);
              });
          }

          // Log security event
          await logIPChange(
            Number(payload.adminId),
            oldIP,
            newIP,
            'notified',
            metadata.userAgent
          );

          // Allow refresh to continue
        } else {
          // LOG: Just log the IP change (default for development)
          console.warn('📋 IP change detected - LOGGING only', {
            adminId: payload.adminId,
            email: admin?.email,
            oldIP,
            newIP,
          });

          // Log security event
          await logIPChange(
            Number(payload.adminId),
            oldIP,
            newIP,
            'allowed',
            metadata.userAgent
          );

          // Allow refresh to continue
        }
      }
    }

    // Log successful token refresh
    await logTokenRefresh(Number(payload.adminId), metadata.ipAddress, metadata.userAgent);

    // Generate new tokens (token rotation)
    const newPayload = {
      adminId: payload.adminId,
      email: payload.email,
      isSuperAdmin: payload.isSuperAdmin,
      jti: crypto.randomUUID(),
    };

    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    // Revoke old refresh token
    await pool.query(
      'UPDATE admin_refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?',
      [tokenHash]
    );

    // Store new refresh token
    const newTokenHash = crypto
      .createHash('sha256')
      .update(newRefreshToken)
      .digest('hex');

    await pool.query(
      `INSERT INTO admin_refresh_tokens 
       (admin_user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), ?, ?)`,
      [
        payload.adminId,
        newTokenHash,
        metadata.ipAddress || null,
        metadata.userAgent || null
      ]
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Get admin profile
   */
  static async getProfile(adminId: bigint): Promise<Omit<AdminUser, 'password_hash'>> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
      au.*,
      l.code as preferred_language_code,
      l.name as preferred_language_name
    FROM admin_users au
    LEFT JOIN languages l ON au.preferred_language_id = l.id
    WHERE au.id = ? AND au.is_active = 1`,
      [adminId]
    );

    if (rows.length === 0) {
      throw new Error('Admin not found');
    }

    const { password_hash, ...admin } = rows[0];
    return admin as Omit<AdminUser, 'password_hash'>;
  }

  /**
   * Get admin's accessible tenants
   */
  static async getAdminTenants(adminId: bigint, isSuperAdmin: boolean): Promise<any[]> {
    if (isSuperAdmin) {
      const [tenants] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM tenants WHERE is_active = 1 ORDER BY name'
      );
      return tenants;
    }

    const [tenants] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, r.name as role_name, r.display_name as role_display_name
       FROM tenants t
       JOIN admin_tenant_access ata ON t.id = ata.tenant_id
       JOIN roles r ON ata.role_id = r.id
       WHERE ata.admin_user_id = ? AND t.is_active = 1
       ORDER BY t.name`,
      [adminId]
    );

    return tenants;
  }

  /**
   * Logout (revoke refresh token)
   */
  static async logout(refreshToken: string): Promise<void> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await pool.query(
      'UPDATE admin_refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?',
      [tokenHash]
    );
  }

  /**
   * Logout from all devices (revoke all refresh tokens)
   */
  static async logoutAll(adminId: bigint): Promise<void> {
    await pool.query(
      'UPDATE admin_refresh_tokens SET revoked_at = NOW() WHERE admin_user_id = ?',
      [adminId]
    );
  }

  /**
   * Get active sessions for admin
   */
  static async getActiveSessions(adminId: bigint): Promise<any[]> {
    const [sessions] = await pool.query<RowDataPacket[]>(
      `SELECT id, ip_address, user_agent, created_at, expires_at
       FROM admin_refresh_tokens
       WHERE admin_user_id = ?
       AND expires_at > NOW()
       AND revoked_at IS NULL
       ORDER BY created_at DESC`,
      [adminId]
    );

    return sessions;
  }

  /**
   * Revoke specific session
   */
  static async revokeSession(adminId: bigint, sessionId: number): Promise<void> {
    await pool.query(
      `UPDATE admin_refresh_tokens 
       SET revoked_at = NOW() 
       WHERE id = ? AND admin_user_id = ?`,
      [sessionId, adminId]
    );
  }
}