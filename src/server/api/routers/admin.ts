/**
 * Admin Router
 * 
 * tRPC router for admin operations with procedures:
 * - listUsers: List all users with pagination and filtering
 * - getUserDetails: Get detailed user information with todo statistics
 * - updateUserStatus: Suspend or activate user accounts
 * - deleteUser: Force delete user accounts
 * - getPlatformStats: Get aggregate platform statistics
 * - getAuditLogs: Query audit logs with pagination and filters
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { adminProcedure, router } from '@/server/trpc/procedures';
import { prisma } from '@/lib/prisma';
import { UserStatus, UserRole } from '@prisma/client';
import {
  createLog,
  getLogs,
  type AuditLogFilters,
  type AuditLogSortOptions,
  type AuditLogPagination,
} from '@/server/api/services/audit.service';
import { getTodoStats } from '@/server/api/services/todo.service';

// ============================================================================
// Validation Schemas
// ============================================================================

const listUsersInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'suspended', 'all']).default('all'),
  role: z.enum(['user', 'admin', 'all']).default('all'),
  sortBy: z.enum(['createdAt', 'lastLoginAt', 'email', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const getUserDetailsInputSchema = z.object({
  userId: z.string().uuid(),
});

const updateUserStatusInputSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['active', 'suspended']),
  reason: z.string().optional(),
});

const deleteUserInputSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().optional(),
  cascade: z.boolean().default(false),
});

const getAuditLogsInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build where clause for user queries
 */
function buildUserWhereClause(
  search?: string,
  status?: string,
  role?: string
) {
  const where: any = {};

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (status && status !== 'all') {
    where.isActive = status === 'active';
  }

  if (role && role !== 'all') {
    where.role = role;
  }

  return where;
}

/**
 * Log admin action
 */
async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId?: string,
  details?: string,
  metadata?: { ipAddress?: string | null; userAgent?: string | null }
) {
  await createLog({
    userId: adminId,
    action: `ADMIN_${action}`,
    entityType: targetType,
    entityId: targetId,
    details,
    ipAddress: metadata?.ipAddress,
    userAgent: metadata?.userAgent,
  });
}

// ============================================================================
// Admin Router
// ============================================================================

export const adminRouter = router({
  /**
   * List all users with pagination and filtering
   */
  listUsers: adminProcedure
    .input(listUsersInputSchema)
    .query(async ({ ctx, input }) => {
      const { page, limit, search, status, role, sortBy, sortOrder } = input;

      const where = buildUserWhereClause(search, status, role);

      const skip = (page - 1) * limit;

      // Build orderBy
      const orderBy: any = {};
      if (sortBy === 'lastLoginAt') {
        orderBy[sortBy] = { sort: sortOrder, nulls: 'last' };
      } else {
        orderBy[sortBy] = sortOrder;
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true,
            _count: {
              select: {
                todos: true,
                tags: true,
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      // Log the action
      await logAdminAction(
        ctx.user.id,
        'LIST_USERS',
        'USER',
        undefined,
        `Listed users: page ${page}, limit ${limit}, search: ${search || 'none'}`,
        { ipAddress: ctx.metadata.ipAddress, userAgent: ctx.metadata.userAgent }
      );

      return {
        users: users.map((user) => ({
          ...user,
          todoCount: user._count.todos,
          tagCount: user._count.tags,
          _count: undefined,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
      };
    }),

  /**
   * Get detailed user information with todo statistics
   */
  getUserDetails: adminProcedure
    .input(getUserDetailsInputSchema)
    .query(async ({ ctx, input }) => {
      const { userId } = input;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              todos: true,
              tags: true,
              auditLogs: true,
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Get todo statistics
      const todoStats = await getTodoStats(userId);

      // Get recent audit logs for this user
      const recentLogs = await prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          details: true,
          createdAt: true,
        },
      });

      // Log the action
      await logAdminAction(
        ctx.user.id,
        'GET_USER_DETAILS',
        'USER',
        userId,
        `Retrieved details for user ${user.email}`,
        { ipAddress: ctx.metadata.ipAddress, userAgent: ctx.metadata.userAgent }
      );

      return {
        user: {
          ...user,
          todoCount: user._count.todos,
          tagCount: user._count.tags,
          auditLogCount: user._count.auditLogs,
          _count: undefined,
        },
        todoStats,
        recentActivity: recentLogs,
      };
    }),

  /**
   * Update user status (suspend/activate)
   */
  updateUserStatus: adminProcedure
    .input(updateUserStatusInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId, status, reason } = input;

      // Prevent self-suspension
      if (userId === ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot suspend your own account',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, isActive: true, role: true },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Prevent suspending other admins
      if (user.role === 'admin' && status === 'suspended') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot suspend admin accounts',
        });
      }

      const isActive = status === 'active';

      // Only update if status is actually changing
      if (user.isActive === isActive) {
        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            isActive: user.isActive,
          },
          message: `User is already ${status}`,
        };
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { isActive },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          updatedAt: true,
        },
      });

      // Log the action
      await logAdminAction(
        ctx.user.id,
        'UPDATE_USER_STATUS',
        'USER',
        userId,
        `Changed user status to ${status}. Reason: ${reason || 'No reason provided'}`,
        { ipAddress: ctx.metadata.ipAddress, userAgent: ctx.metadata.userAgent }
      );

      return {
        success: true,
        user: updatedUser,
        message: `User ${status === 'active' ? 'activated' : 'suspended'} successfully`,
      };
    }),

  /**
   * Delete user account (force delete)
   */
  deleteUser: adminProcedure
    .input(deleteUserInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId, reason, cascade } = input;

      // Prevent self-deletion
      if (userId === ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot delete your own account',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Prevent deleting other admins
      if (user.role === 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot delete admin accounts',
        });
      }

      // Get counts before deletion for audit log
      const counts = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          _count: {
            select: {
              todos: true,
              tags: true,
            },
          },
        },
      });

      // Delete user (cascade will handle related records if configured)
      await prisma.user.delete({
        where: { id: userId },
      });

      // Log the action
      await logAdminAction(
        ctx.user.id,
        'DELETE_USER',
        'USER',
        userId,
        `Deleted user ${user.email}. Cascade: ${cascade}. Reason: ${reason || 'No reason provided'}. Deleted ${counts?._count.todos || 0} todos and ${counts?._count.tags || 0} tags.`,
        { ipAddress: ctx.metadata.ipAddress, userAgent: ctx.metadata.userAgent }
      );

      return {
        success: true,
        deletedUserId: userId,
        message: 'User deleted successfully',
      };
    }),

  /**
   * Get platform statistics
   */
  getPlatformStats: adminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      // User statistics
      totalUsers,
      activeUsers,
      suspendedUsers,
      adminUsers,
      newUsersLast30Days,
      newUsersLast7Days,

      // Todo statistics
      totalTodos,
      activeTodos,
      completedTodos,
      archivedTodos,
      overdueTodos,

      // Tag statistics
      totalTags,

      // Activity statistics
      totalAuditLogs,
      auditLogsLast30Days,
      auditLogsLast7Days,

      // User activity
      usersWithTodos,
      usersWithNoTodos,
    ] = await Promise.all([
      // User counts
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),

      // Todo counts
      prisma.todo.count(),
      prisma.todo.count({ where: { status: 'active' } }),
      prisma.todo.count({ where: { status: 'completed' } }),
      prisma.todo.count({ where: { status: 'archived' } }),
      prisma.todo.count({
        where: {
          status: { in: ['active', 'completed'] },
          dueDate: { lt: now },
        },
      }),

      // Tag counts
      prisma.tag.count(),

      // Audit log counts
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),

      // User activity
      prisma.user.count({ where: { todos: { some: {} } } }),
      prisma.user.count({ where: { todos: { none: {} } } }),
    ]);

    // Calculate averages
    const averageTodosPerUser = totalUsers > 0 ? totalTodos / totalUsers : 0;

    // Get todos by priority
    const todosByPriority = await prisma.todo.groupBy({
      by: ['priority'],
      _count: { priority: true },
    });

    // Get recent activity
    const recentActivity = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
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

    // Log the action
    await logAdminAction(
      ctx.user.id,
      'GET_PLATFORM_STATS',
      'ADMIN',
      undefined,
      'Retrieved platform statistics',
      { ipAddress: ctx.metadata.ipAddress, userAgent: ctx.metadata.userAgent }
    );

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        admins: adminUsers,
        newLast30Days: newUsersLast30Days,
        newLast7Days: newUsersLast7Days,
        withTodos: usersWithTodos,
        withoutTodos: usersWithNoTodos,
      },
      todos: {
        total: totalTodos,
        active: activeTodos,
        completed: completedTodos,
        archived: archivedTodos,
        overdue: overdueTodos,
        byPriority: todosByPriority.reduce((acc, item) => {
          acc[item.priority] = item._count.priority;
          return acc;
        }, {} as Record<string, number>),
        averagePerUser: Math.round(averageTodosPerUser * 100) / 100,
      },
      tags: {
        total: totalTags,
      },
      activity: {
        totalAuditLogs,
        last30Days: auditLogsLast30Days,
        last7Days: auditLogsLast7Days,
        recent: recentActivity,
      },
    };
  }),

  /**
   * Get audit logs with pagination and filters
   */
  getAuditLogs: adminProcedure
    .input(getAuditLogsInputSchema)
    .query(async ({ ctx, input }) => {
      const {
        page,
        limit,
        userId,
        action,
        entityType,
        dateFrom,
        dateTo,
        sortOrder,
      } = input;

      const filters: AuditLogFilters = {
        userId,
        action,
        entityType,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      };

      const sortOptions: AuditLogSortOptions = {
        sortBy: 'createdAt',
        sortOrder,
      };

      const pagination: AuditLogPagination = {
        page,
        limit,
      };

      const result = await getLogs(filters, sortOptions, pagination);

      // Log the action
      await logAdminAction(
        ctx.user.id,
        'GET_AUDIT_LOGS',
        'ADMIN',
        undefined,
        `Retrieved audit logs: page ${page}, limit ${limit}`,
        { ipAddress: ctx.metadata.ipAddress, userAgent: ctx.metadata.userAgent }
      );

      return result;
    }),
});

export type AdminRouter = typeof adminRouter;
