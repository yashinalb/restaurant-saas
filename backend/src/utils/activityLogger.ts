/**
 * Activity Logger Utility
 *
 * Logs security events and admin actions to the activity_logs table
 */

import pool from '../config/database.js';
import { ResultSetHeader } from 'mysql2';

export interface ActivityLogOptions {
  tenantId?: number | null;
  adminUserId?: number | null;
  action: string;
  entityType?: string | null;
  entityId?: number | null;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Log an activity to the database
 */
export async function logActivity(options: ActivityLogOptions): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO activity_logs
       (tenant_id, admin_user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        options.tenantId || null,
        options.adminUserId || null,
        options.action,
        options.entityType || null,
        options.entityId || null,
        options.oldValues ? JSON.stringify(options.oldValues) : null,
        options.newValues ? JSON.stringify(options.newValues) : null,
        options.ipAddress || null,
        options.userAgent || null,
      ]
    );
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - logging failure shouldn't break the main operation
  }
}

/**
 * Log security events (authentication, authorization, suspicious activity)
 */
export async function logSecurityEvent(
  adminUserId: number | null,
  event: string,
  details: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logActivity({
    adminUserId,
    action: `security.${event}`,
    entityType: 'security_event',
    newValues: details,
    ipAddress,
    userAgent,
  });
}

/**
 * Pre-defined security event loggers
 */

export async function logLoginAttempt(
  adminId: number | null,
  success: boolean,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logSecurityEvent(
    adminId,
    success ? 'login_success' : 'login_failed',
    { success, timestamp: new Date().toISOString() },
    ipAddress,
    userAgent
  );
}

export async function logAccountLockout(
  adminId: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logSecurityEvent(
    adminId,
    'account_lockout',
    { reason: 'Too many failed login attempts', timestamp: new Date().toISOString() },
    ipAddress,
    userAgent
  );
}

export async function logIPChange(
  adminId: number,
  oldIP: string,
  newIP: string,
  action: 'blocked' | 'allowed' | 'notified',
  userAgent?: string
): Promise<void> {
  await logSecurityEvent(
    adminId,
    'ip_change_detected',
    {
      oldIP,
      newIP,
      action,
      timestamp: new Date().toISOString(),
    },
    newIP,
    userAgent
  );
}

export async function logTokenRefresh(
  adminId: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logSecurityEvent(
    adminId,
    'token_refresh',
    { timestamp: new Date().toISOString() },
    ipAddress,
    userAgent
  );
}

export async function logPasswordReset(
  adminId: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logSecurityEvent(
    adminId,
    'password_reset',
    { timestamp: new Date().toISOString() },
    ipAddress,
    userAgent
  );
}

export async function logPasswordChange(
  adminId: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logSecurityEvent(
    adminId,
    'password_change',
    { timestamp: new Date().toISOString() },
    ipAddress,
    userAgent
  );
}
