import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import pool from '../config/database.js';
import { AdminUser } from '../types/index.js';

export interface AuthRequest extends Request {
  admin?: AdminUser;
}

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    
    // Get admin user from database
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM admin_users WHERE id = ? AND is_active = 1',
      [payload.adminId]
    );

    if (rows.length === 0) {
      // User doesn't exist or is inactive - force logout
      res.status(403).json({
        error: 'Account is no longer active',
        code: 'ACCOUNT_INACTIVE'
      });
      return;
    }

    const admin = rows[0] as AdminUser;

    // Check if email is verified (unless super admin)
    if (!admin.is_super_admin && !admin.email_verified_at) {
      res.status(403).json({
        error: 'Email not verified. Please verify your email address to access the system.',
        code: 'EMAIL_NOT_VERIFIED'
      });
      return;
    }

    req.admin = admin;
    next();
  } catch (error: any) {
    // Token expired - allow refresh attempt
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ 
        error: 'Access token expired',
        code: 'TOKEN_EXPIRED'
      });
      return;
    }
    
    // Invalid token - force logout
    res.status(403).json({ 
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
}

export function requireSuperAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.admin?.is_super_admin) {
    res.status(403).json({ 
      error: 'Super admin access required',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
    return;
  }
  next();
}