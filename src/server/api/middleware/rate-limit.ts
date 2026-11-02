/**
 * Rate Limiting Middleware
 * 
 * Configurable rate limiting with in-memory store:
 * - 5 failed logins per IP per 15 minutes
 * - 100 API requests per user per minute
 * - Redis upgrade path documented
 */

import { type NextRequest, NextResponse } from 'next/server';
import { TRPCError } from '@trpc/server';

// ============================================================================
// Types
// ============================================================================

export interface RateLimitEntry {
  /** Number of requests made */
  count: number;
  /** Timestamp when the window resets */
  resetTime: number;
  /** Failed login attempts (for login-specific rate limiting) */
  failedAttempts?: number;
}

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Optional key prefix for different rate limit types */
  keyPrefix?: string;
  /** Whether to skip successful requests from counting */
  skipSuccess?: boolean;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** Timestamp when the window resets */
  resetTime: number;
  /** Total limit for the window */
  limit: number;
  /** Retry after seconds (if rate limited) */
  retryAfter?: number;
}

// ============================================================================
// In-Memory Store
// ============================================================================

/**
 * In-memory rate limit store
 * 
 * NOTE: In production, replace with Redis or similar distributed store.
 * This implementation works for single-server deployments but won't
 * share state across multiple server instances.
 * 
 * Redis Upgrade Path:
 * 1. Install Redis: npm install ioredis
 * 2. Create Redis client: import Redis from 'ioredis'; const redis = new Redis();
 * 3. Replace Map operations with Redis commands:
 *    - store.get(key) -> redis.get(key)
 *    - store.set(key, value) -> redis.setex(key, ttl, JSON.stringify(value))
 *    - store.delete(key) -> redis.del(key)
 * 4. Use Redis TTL for automatic expiration instead of manual cleanup
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Failed login attempts store (separate from general rate limiting)
 * Tracks failed login attempts per IP address
 */
const failedLoginStore = new Map<string, RateLimitEntry>();

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * Default rate limit: 100 requests per minute per user
 */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'api',
};

/**
 * Strict rate limit: 10 requests per minute (for sensitive operations)
 */
export const STRICT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'strict',
};

/**
 * Login rate limit: 5 failed attempts per 15 minutes per IP
 */
export const LOGIN_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyPrefix: 'login',
};

/**
 * Admin rate limit: 200 requests per minute (higher for admin users)
 */
export const ADMIN_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 200,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'admin',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a rate limit key from user ID or IP address
 */
function generateRateLimitKey(
  identifier: string,
  config: RateLimitConfig
): string {
  return `${config.keyPrefix}:${identifier}`;
}

/**
 * Extract client IP from request headers
 */
export function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || null;
  }
  
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

/**
 * Get user ID from request (if authenticated)
 */
function getUserId(req: NextRequest): string | null {
  // Check for user ID in headers (set by auth middleware)
  return req.headers.get('x-user-id');
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
  
  for (const [key, entry] of failedLoginStore.entries()) {
    if (now > entry.resetTime) {
      failedLoginStore.delete(key);
    }
  }
}

// ============================================================================
// Core Rate Limiting Functions
// ============================================================================

/**
 * Check rate limit for an identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): RateLimitResult {
  const key = generateRateLimitKey(identifier, config);
  const now = Date.now();
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // New window or expired entry
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, newEntry);
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime,
      limit: config.maxRequests,
    };
  }
  
  // Increment count
  entry.count++;
  
  if (entry.count > config.maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      limit: config.maxRequests,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
  }
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
    limit: config.maxRequests,
  };
}

/**
 * Check rate limit for a request
 * Uses user ID if available, otherwise falls back to IP
 */
export function checkRequestRateLimit(
  req: NextRequest,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): RateLimitResult & { identifier: string } {
  const userId = getUserId(req);
  const ip = getClientIp(req);
  
  // Prefer user ID for rate limiting, fall back to IP
  const identifier = userId || ip || 'anonymous';
  
  const result = checkRateLimit(identifier, config);
  
  return {
    ...result,
    identifier,
  };
}

/**
 * Record a failed login attempt
 */
export function recordFailedLogin(ip: string): RateLimitResult {
  const key = ip;
  const now = Date.now();
  const config = LOGIN_RATE_LIMIT;
  
  const entry = failedLoginStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // New window
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
      failedAttempts: 1,
    };
    failedLoginStore.set(key, newEntry);
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime,
      limit: config.maxRequests,
    };
  }
  
  // Increment failed attempts
  entry.count++;
  entry.failedAttempts = (entry.failedAttempts || 0) + 1;
  
  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      limit: config.maxRequests,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
  }
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
    limit: config.maxRequests,
  };
}

/**
 * Check if IP is rate limited for logins
 */
export function checkLoginRateLimit(ip: string): RateLimitResult {
  const key = ip;
  const now = Date.now();
  const config = LOGIN_RATE_LIMIT;
  
  const entry = failedLoginStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetTime: now + config.windowMs,
      limit: config.maxRequests,
    };
  }
  
  const remaining = Math.max(0, config.maxRequests - entry.count);
  
  if (remaining === 0) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      limit: config.maxRequests,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
  }
  
  return {
    allowed: true,
    remaining,
    resetTime: entry.resetTime,
    limit: config.maxRequests,
  };
}

/**
 * Reset failed login attempts for an IP (call after successful login)
 */
export function resetFailedLogins(ip: string): void {
  failedLoginStore.delete(ip);
}

// ============================================================================
// Middleware Functions
// ============================================================================

/**
 * Rate limiting middleware for Next.js API routes
 * 
 * Usage:
 * ```typescript
 * export async function GET(req: NextRequest) {
 *   const rateLimit = await rateLimitMiddleware(req);
 *   if (!rateLimit.allowed) {
 *     return NextResponse.json(
 *       { error: 'Rate limit exceeded' },
 *       { status: 429, headers: rateLimit.headers }
 *     );
 *   }
 *   // ... handler logic
 * }
 * ```
 */
export async function rateLimitMiddleware(
  req: NextRequest,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): Promise<RateLimitResult & { headers: Record<string, string> }> {
  const result = checkRequestRateLimit(req, config);
  
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': Math.max(0, result.remaining).toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  };
  
  if (!result.allowed && result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }
  
  return {
    ...result,
    headers,
  };
}

/**
 * Higher-order function to wrap a handler with rate limiting
 * 
 * Usage:
 * ```typescript
 * export const GET = withRateLimit(DEFAULT_RATE_LIMIT, async (req) => {
 *   // Handler logic
 *   return NextResponse.json({ data: 'success' });
 * });
 * ```
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const rateLimit = await rateLimitMiddleware(req, config);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.`,
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: rateLimit.headers,
        }
      );
    }
    
    const response = await handler(req);
    
    // Add rate limit headers to successful response
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  };
}

/**
 * Middleware for login endpoints with IP-based rate limiting
 * 
 * Usage:
 * ```typescript
 * export async function POST(req: NextRequest) {
 *   const ip = getClientIp(req) || 'unknown';
 *   
 *   // Check login rate limit
 *   const rateLimit = checkLoginRateLimit(ip);
 *   if (!rateLimit.allowed) {
 *     return NextResponse.json(
 *       { error: 'Too many failed login attempts' },
 *       { status: 429 }
 *     );
 *   }
 *   
 *   // Attempt login...
 *   const success = await attemptLogin(credentials);
 *   
 *   if (success) {
 *     resetFailedLogins(ip);
 *   } else {
 *     recordFailedLogin(ip);
 *   }
 * }
 * ```
 */
export function withLoginRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ip = getClientIp(req) || 'unknown';
    
    const rateLimit = checkLoginRateLimit(ip);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many failed login attempts',
          message: `Please try again in ${rateLimit.retryAfter} seconds.`,
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimit.retryAfter?.toString() || '900',
          },
        }
      );
    }
    
    return handler(req);
  };
}

// ============================================================================
// tRPC Integration
// ============================================================================

/**
 * Create a tRPC middleware for rate limiting
 * 
 * Usage in procedures.ts:
 * ```typescript
 * export const rateLimitedProcedure = t.procedure
 *   .use(createRateLimitMiddleware(DEFAULT_RATE_LIMIT));
 * ```
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return ({ ctx, path, next }: { ctx: { metadata?: { ipAddress?: string | null } }; path: string; next: () => Promise<any> }) => {
    const identifier = ctx.metadata?.ipAddress || 'anonymous';
    const result = checkRateLimit(identifier, config);
    
    if (!result.allowed) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
      });
    }
    
    return next();
  };
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Periodic cleanup of expired entries
 * Runs every minute
 */
setInterval(cleanupExpiredEntries, 60 * 1000);

/**
 * Get current store statistics (for monitoring)
 */
export function getRateLimitStats(): {
  totalEntries: number;
  failedLoginEntries: number;
} {
  return {
    totalEntries: rateLimitStore.size,
    failedLoginEntries: failedLoginStore.size,
  };
}

/**
 * Clear all rate limit entries (useful for testing)
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
  failedLoginStore.clear();
}
