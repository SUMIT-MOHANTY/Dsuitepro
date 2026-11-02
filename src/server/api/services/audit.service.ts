/**
 * Audit Service
 * 
 * Business logic service for audit logging with:
 * - Create audit logs for actions
 * - Query audit logs with filtering and pagination
 * - Get logs by user
 */

import { prisma } from '@/lib/prisma';
import { type Prisma } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface CreateAuditLogData {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface AuditLogSortOptions {
  sortBy: 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface AuditLogPagination {
  page: number;
  limit: number;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Create a new audit log entry
 */
export async function createLog(data: CreateAuditLogData) {
  const auditLog = await prisma.auditLog.create({
    data: {
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      details: data.details,
      ipAddress: data.ipAddress,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  return auditLog;
}

/**
 * Get audit logs with filtering, sorting, and pagination
 */
export async function getLogs(
  filters: AuditLogFilters,
  sortOptions: AuditLogSortOptions,
  pagination: AuditLogPagination
) {
  const { sortBy, sortOrder } = sortOptions;
  const { page, limit } = pagination;

  const where = buildAuditLogWhereClause(filters);

  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Get audit logs for a specific user
 */
export async function getLogsByUser(
  userId: string,
  sortOptions: AuditLogSortOptions,
  pagination: AuditLogPagination
) {
  return getLogs(
    { userId },
    sortOptions,
    pagination
  );
}

/**
 * Get a single audit log by ID
 */
export async function getLogById(logId: string) {
  const log = await prisma.auditLog.findUnique({
    where: { id: logId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  return log;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build where clause for audit log queries
 */
function buildAuditLogWhereClause(
  filters: AuditLogFilters
): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.action) {
    where.action = filters.action;
  }

  if (filters.entityType) {
    where.entityType = filters.entityType;
  }

  if (filters.entityId) {
    where.entityId = filters.entityId;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
    if (filters.dateTo) where.createdAt.lte = filters.dateTo;
  }

  return where;
}

/**
 * Log an admin action automatically
 * This is a convenience method for logging admin mutations
 */
export async function logAdminAction(
  adminUserId: string,
  action: string,
  targetType: string,
  targetId?: string,
  details?: string,
  metadata?: { ipAddress?: string | null; userAgent?: string | null }
) {
  return createLog({
    userId: adminUserId,
    action: `ADMIN_${action}`,
    entityType: targetType,
    entityId: targetId,
    details,
    ipAddress: metadata?.ipAddress,
    userAgent: metadata?.userAgent,
  });
}

/**
 * Log a user action
 */
export async function logUserAction(
  userId: string,
  action: string,
  targetType: string,
  targetId?: string,
  details?: string,
  metadata?: { ipAddress?: string | null; userAgent?: string | null }
) {
  return createLog({
    userId,
    action: `USER_${action}`,
    entityType: targetType,
    entityId: targetId,
    details,
    ipAddress: metadata?.ipAddress,
    userAgent: metadata?.userAgent,
  });
}

/**
 * Get recent audit logs (for dashboard)
 */
export async function getRecentLogs(limit: number = 10) {
  const logs = await prisma.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  return logs;
}

/**
 * Get audit log statistics
 */
export async function getAuditStats(dateFrom?: Date, dateTo?: Date) {
  const where: Prisma.AuditLogWhereInput = {};
  
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = dateFrom;
    if (dateTo) where.createdAt.lte = dateTo;
  }

  const [
    totalLogs,
    actionCounts,
    entityTypeCounts,
    recentLogs
  ] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: { action: true },
    }),
    prisma.auditLog.groupBy({
      by: ['entityType'],
      where,
      _count: { entityType: true },
    }),
    prisma.auditLog.findMany({
      where,
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    }),
  ]);

  return {
    totalLogs,
    actionCounts: actionCounts.reduce((acc, item) => {
      acc[item.action] = item._count.action;
      return acc;
    }, {} as Record<string, number>),
    entityTypeCounts: entityTypeCounts.reduce((acc, item) => {
      acc[item.entityType] = item._count.entityType;
      return acc;
    }, {} as Record<string, number>),
    recentLogs,
  };
}
