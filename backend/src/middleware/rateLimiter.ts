// src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

// Redis client for distributed rate limiting (optional but recommended for production)
const redis = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL)
  : null;

/**
 * Global API rate limiter
 * Limits all requests to prevent API abuse
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  // Use Redis if available, otherwise use memory store
  ...(redis && {
    store: new RedisStore({
      // @ts-ignore - The types between ioredis and rate-limit-redis slightly differ, but this works at runtime
      sendCommand: (...args: string[]) => redis.call(...args),
      prefix: 'rl:global:',
    }),
  }),
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per window
  skipSuccessfulRequests: true, // Don't count successful requests
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  // Use Redis if available
  ...(redis && {
    store: new RedisStore({
      // @ts-ignore
      sendCommand: (...args: string[]) => redis.call(...args),
      prefix: 'rl:auth:',
    }),
  }),
});

/**
 * Moderate rate limiter for data modification endpoints
 */
export const writeRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 write requests per minute
  message: 'Too many write requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  ...(redis && {
    store: new RedisStore({
      // @ts-ignore
      sendCommand: (...args: string[]) => redis.call(...args),
      prefix: 'rl:write:',
    }),
  }),
});

/**
 * Lenient rate limiter for read-only endpoints
 */
export const readRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 read requests per minute
  message: 'Too many read requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  ...(redis && {
    store: new RedisStore({
      // @ts-ignore
      sendCommand: (...args: string[]) => redis.call(...args),
      prefix: 'rl:read:',
    }),
  }),
});

/**
 * Custom rate limiter based on user ID (for authenticated routes)
 */
export const createUserRateLimiter = (maxRequests: number, windowMinutes: number) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    keyGenerator: (req: any) => {
      // Use admin ID if authenticated, otherwise use IP
      return req.admin?.id?.toString() || req.ip;
    },
    message: 'Too many requests from this account',
    standardHeaders: true,
    legacyHeaders: false,
    ...(redis && {
      store: new RedisStore({
        // @ts-ignore
        sendCommand: (...args: string[]) => redis.call(...args),
        prefix: 'rl:user:',
      }),
    }),
  });
};

// Export Redis client for other uses
export { redis };