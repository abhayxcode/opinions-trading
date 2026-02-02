import { Request, Response, NextFunction } from 'express';
import { client } from '../services/redis';

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyPrefix?: string;    // Redis key prefix
  message?: string;      // Custom error message
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,   // 1 minute
  maxRequests: 100,      // 100 requests per minute
  keyPrefix: 'ratelimit',
  message: 'Too many requests, please try again later',
};

/**
 * Get client identifier for rate limiting
 * Uses userId if authenticated, otherwise falls back to IP address
 */
const getClientIdentifier = (req: Request): string => {
  if (req.auth?.userId) {
    return `user:${req.auth.userId}`;
  }

  // Get IP address, handling proxies
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim())
    : req.ip || req.socket.remoteAddress || 'unknown';

  return `ip:${ip}`;
};

/**
 * Create a rate limiter middleware using Redis sliding window algorithm
 */
export const createRateLimiter = (config: Partial<RateLimitConfig> = {}) => {
  const { windowMs, maxRequests, keyPrefix, message } = { ...DEFAULT_CONFIG, ...config };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientId = getClientIdentifier(req);
    const key = `${keyPrefix}:${clientId}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Use Redis transaction for atomic operations
      const multi = client.multi();

      // Remove old entries outside the window
      multi.zRemRangeByScore(key, 0, windowStart);

      // Count requests in current window
      multi.zCard(key);

      // Add current request
      multi.zAdd(key, { score: now, value: `${now}:${Math.random()}` });

      // Set expiry on the key
      multi.expire(key, Math.ceil(windowMs / 1000));

      const results = await multi.exec();
      const requestCount = results[1] as number;

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requestCount - 1));
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));

      if (requestCount >= maxRequests) {
        const retryAfter = Math.ceil(windowMs / 1000);
        res.setHeader('Retry-After', retryAfter);
        res.status(429).json({
          error: message,
          retryAfter,
        });
        return;
      }

      next();
    } catch (error) {
      // If Redis fails, allow the request but log the error
      console.error('Rate limiter error:', error);
      next();
    }
  };
};

/**
 * Pre-configured rate limiters for different use cases
 */

// General API rate limiter: 100 requests per minute
export const generalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyPrefix: 'ratelimit:general',
});

// Auth endpoints: 10 requests per minute (stricter to prevent brute force)
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'ratelimit:auth',
  message: 'Too many authentication attempts, please try again later',
});

// Order endpoints: 30 requests per minute
export const orderRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  keyPrefix: 'ratelimit:order',
  message: 'Too many order requests, please slow down',
});

// Admin endpoints: 50 requests per minute
export const adminRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 50,
  keyPrefix: 'ratelimit:admin',
});
