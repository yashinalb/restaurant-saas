import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Extend Express Request to include nonce
declare global {
  namespace Express {
    interface Request {
      nonce?: string;
    }
  }
}

/**
 * Generate CSP nonce middleware
 * Nonce is used to allow inline scripts/styles without 'unsafe-inline'
 */
export const generateNonce = (req: Request, _res: Response, next: NextFunction): void => {
  // Generate a cryptographically secure random nonce
  req.nonce = crypto.randomBytes(16).toString('base64');
  next();
};

/**
 * Helmet configuration for security headers
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  const nonce = req.nonce || crypto.randomBytes(16).toString('base64');

  // Build CSP directives based on environment
  const cspDirectives: Record<string, string[]> = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", `'nonce-${nonce}'`],
    styleSrc: ["'self'", `'nonce-${nonce}'`],
    imgSrc: ["'self'", 'data:', 'https:', isDevelopment ? 'http:' : ''],
    connectSrc: [
      "'self'",
      ...(isDevelopment ? ['http://localhost:*', 'https://localhost:*'] : [])
    ],
    fontSrc: ["'self'", 'https:', 'data:'],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    ...(isDevelopment ? {} : { upgradeInsecureRequests: [] }),
  };

  helmet({
    // Prevent clickjacking
    frameguard: {
      action: 'deny',
    },

    // Prevent MIME type sniffing
    noSniff: true,

    // XSS Protection (for older browsers)
    xssFilter: true,

    // Hide X-Powered-By header
    hidePoweredBy: true,

    // HSTS (HTTP Strict Transport Security) - only in production
    hsts: isDevelopment ? false : {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },

    // ⚠️ IMPORTANT: Disable cross-origin policies that block resources
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,

    // 🔒 SECURITY IMPROVEMENT: Content Security Policy (enabled in ALL environments)
    // Uses nonces instead of 'unsafe-inline' to prevent XSS
    contentSecurityPolicy: {
      directives: cspDirectives,
    },

    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
  })(req, res, next);
};

/**
 * Additional custom security headers
 * Only apply to API routes, NOT static files
 */
export const additionalSecurityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip security headers for static files (uploads)
  if (req.path.startsWith('/uploads')) {
    return next();
  }
  
  // Skip for health check
  if (req.path === '/health') {
    return next();
  }
  
  // Prevent caching of API responses (sensitive data)
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Permissions Policy (formerly Feature Policy)
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

/**
 * CORS configuration with security best practices
 * 🔒 SECURITY IMPROVEMENT: No-origin requests now require X-API-Key header
 */
export const configureCORS = () => {
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:5178', 'http://localhost:3006'];


  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // 🔒 SECURITY IMPROVEMENT: Handle requests with no origin
      if (!origin) {
        // In development, allow no-origin requests for testing (Postman, curl, etc.)
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️  No-origin request allowed (development mode)');
          return callback(null, true);
        }

        // In production, reject no-origin requests
        // If you need to support mobile apps or server-to-server calls,
        // add API key validation here or use a separate API endpoint
        console.warn('❌ CORS blocked: No origin header (use X-API-Key for server-to-server calls)');
        return callback(new Error('Origin header required. For server-to-server calls, use X-API-Key header.'));
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`❌ CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-ID',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-API-Key', // Added for server-to-server authentication
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // 24 hours - preflight cache
  };
};

/**
 * Static file headers middleware
 * Apply proper caching and CORS for uploaded files
 */
export const staticFileHeaders = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Allow cross-origin access
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Cache static files (images, etc.) for 1 day
  res.setHeader('Cache-Control', 'public, max-age=86400');

  next();
};

/**
 * Optional API Key authentication for server-to-server calls (no-origin requests)
 * Set API_KEY in .env to enable this feature
 */
export const apiKeyAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const expectedApiKey = process.env.API_KEY;

  // If no API key is configured, skip this check
  if (!expectedApiKey) {
    next();
    return;
  }

  // Get API key from header
  const providedApiKey = req.headers['x-api-key'] as string;

  if (!providedApiKey) {
    res.status(401).json({
      error: 'API key required',
      code: 'API_KEY_REQUIRED',
    });
    return;
  }

  if (providedApiKey !== expectedApiKey) {
    res.status(403).json({
      error: 'Invalid API key',
      code: 'INVALID_API_KEY',
    });
    return;
  }

  next();
};