/**
 * Audit Log Middleware
 * 
 * Express-compatible middleware for automatic action logging on admin mutations.
 * Captures action type, actor, target, timestamp, IP, and user agent.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createLog, type CreateAuditLogData } from '@/server/api/services/audit.service';

// ============================================================================
// Types
// ============================================================================

export interface AuditLogMiddlewareOptions {
  /** Entity type being modified (e.g., 'USER', 'TODO', 'TAG') */
  entityType: string;
  /** Action being performed (e.g., 'CREATE', 'UPDATE', 'DELETE') */
  action: string;
  /** Function to extract entity ID from request/response */
  getEntityId?: (req: NextRequest, res?: NextResponse) => string | undefined;
  /** Function to extract additional details */
  getDetails?: (req: NextRequest, res?: NextResponse) => string | undefined;
  /** Whether to log before the action (pre) or after (post) */
  timing: 'pre' | 'post';
}

export interface AuditContext {
  userId?: string;
  ipAddress: string | null;
  userAgent: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

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
  
  // For Next.js, we can't easily get the socket remote address
  // This would require additional server configuration
  return null;
}

/**
 * Extract user agent from request
 */
export function getUserAgent(req: NextRequest): string | null {
  return req.headers.get('user-agent');
}

/**
 * Extract user ID from request (assumes JWT/session is parsed upstream)
 */
export function getUserId(req: NextRequest): string | undefined {
  // This assumes the request has been processed by auth middleware
  // and the user ID is stored in a custom header or the request object
  const userId = req.headers.get('x-user-id');
  return userId || undefined;
}

/**
 * Build audit context from request
 */
export function buildAuditContext(req: NextRequest): AuditContext {
  return {
    userId: getUserId(req),
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
  };
}

// ============================================================================
// Middleware Functions
// ============================================================================

/**
 * Create audit log entry
 */
export async function logAuditEntry(
  options: Omit<CreateAuditLogData, 'ipAddress' | 'userAgent'> & Partial<Pick<CreateAuditLogData, 'ipAddress' | 'userAgent'>>
): Promise<void> {
  try {
    await createLog({
      userId: options.userId,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      details: options.details,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    });
  } catch (error) {
    // Log to console but don't fail the request
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Middleware wrapper for API routes that logs actions
 * 
 * Usage:
 * ```typescript
 * export async function POST(req: NextRequest) {
 *   return withAuditLog(
 *     { entityType: 'USER', action: 'CREATE', timing: 'post' },
 *     async (req) => {
 *       // Your handler logic here
 *       return NextResponse.json({ id: 'user-123' });
 *     }
 *   )(req);
 * }
 * ```
 */
export function withAuditLog(
  options: AuditLogMiddlewareOptions,
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const context = buildAuditContext(req);
    
    if (options.timing === 'pre') {
      // Log before action
      await logAuditEntry({
        userId: context.userId,
        action: options.action,
        entityType: options.entityType,
        entityId: options.getEntityId?.(req),
        details: options.getDetails?.(req),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    }
    
    // Execute the handler
    const response = await handler(req);
    
    if (options.timing === 'post') {
      // Log after action (can include response data)
      await logAuditEntry({
        userId: context.userId,
        action: options.action,
        entityType: options.entityType,
        entityId: options.getEntityId?.(req, response),
        details: options.getDetails?.(req, response),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    }
    
    return response;
  };
}

/**
 * Higher-order function to wrap an API handler with audit logging
 * 
 * Usage:
 * ```typescript
 * const auditConfig: AuditLogConfig = {
 *   entityType: 'USER',
 *   action: 'UPDATE_STATUS',
 *   getEntityId: (req) => req.url.split('/').pop(),
 *   timing: 'post'
 * };
 * 
 * export const PATCH = withAudit(auditConfig, async (req) => {
 *   // Handler logic
 * });
 * ```
 */
export function withAudit(
  config: Omit<AuditLogMiddlewareOptions, 'timing'> & { timing?: 'pre' | 'post' },
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  const fullConfig: AuditLogMiddlewareOptions = {
    ...config,
    timing: config.timing ?? 'post',
  };
  
  return withAuditLog(fullConfig, handler);
}

// ============================================================================
// Pre-configured Audit Loggers
// ============================================================================

/**
 * Create an audit logger for user management actions
 */
export function createUserAuditLogger(action: string) {
  return (handler: (req: NextRequest) => Promise<NextResponse> | NextResponse) => {
    return withAudit(
      {
        entityType: 'USER',
        action: `USER_${action}`,
        getEntityId: (req: NextRequest) => {
          const url = req.url;
          const segments = url.split('/');
          return segments[segments.length - 1];
        },
        timing: 'post',
      },
      handler
    );
  };
}

/**
 * Create an audit logger for admin actions
 */
export function createAdminAuditLogger(action: string) {
  return (handler: (req: NextRequest) => Promise<NextResponse> | NextResponse) => {
    return withAudit(
      {
        entityType: 'ADMIN',
        action: `ADMIN_${action}`,
        timing: 'post',
      },
      handler
    );
  };
}

// ============================================================================
// Express-Compatible Middleware (for use with Express-style middleware chains)
// ============================================================================

/**
 * Express-compatible middleware factory for audit logging
 * 
 * Note: This is designed to work with Next.js API routes that use
 * a similar middleware pattern. For pure Express apps, adapt accordingly.
 */
export function createAuditMiddleware(
  options: Omit<AuditLogMiddlewareOptions, 'timing'> & { timing?: 'pre' | 'post' }
) {
  const fullOptions: AuditLogMiddlewareOptions = {
    ...options,
    timing: options.timing ?? 'post',
  };
  
  return async function auditMiddleware(
    req: NextRequest,
    next: () => Promise<NextResponse> | NextResponse
  ): Promise<NextResponse> {
    const context = buildAuditContext(req);
    
    if (fullOptions.timing === 'pre') {
      await logAuditEntry({
        userId: context.userId,
        action: fullOptions.action,
        entityType: fullOptions.entityType,
        entityId: fullOptions.getEntityId?.(req),
        details: fullOptions.getDetails?.(req),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    }
    
    const response = await next();
    
    if (fullOptions.timing === 'post') {
      await logAuditEntry({
        userId: context.userId,
        action: fullOptions.action,
        entityType: fullOptions.entityType,
        entityId: fullOptions.getEntityId?.(req, response),
        details: fullOptions.getDetails?.(req, response),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    }
    
    return response;
  };
}

// ============================================================================
// Convenience Exports
// ============================================================================

export const auditLoggers = {
  user: {
    list: createUserAuditLogger('LIST'),
    get: createUserAuditLogger('GET'),
    create: createUserAuditLogger('CREATE'),
    update: createUserAuditLogger('UPDATE'),
    delete: createUserAuditLogger('DELETE'),
    updateStatus: createUserAuditLogger('UPDATE_STATUS'),
  },
  admin: {
    listUsers: createAdminAuditLogger('LIST_USERS'),
    getUserDetails: createAdminAuditLogger('GET_USER_DETAILS'),
    updateUserStatus: createAdminAuditLogger('UPDATE_USER_STATUS'),
    deleteUser: createAdminAuditLogger('DELETE_USER'),
    getPlatformStats: createAdminAuditLogger('GET_PLATFORM_STATS'),
    getAuditLogs: createAdminAuditLogger('GET_AUDIT_LOGS'),
  },
};
