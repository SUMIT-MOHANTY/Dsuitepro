/**
 * Unit Tests: Todo Service
 *
 * Tests for todo service business logic with mocked Prisma:
 * - CRUD operations (create, update, delete)
 * - Filtering and search
 * - Active todo limit checking
 * - Tag validation
 * - Bulk operations
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  getTodos,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
  toggleTodoComplete,
  archiveTodo,
  bulkUpdateTodos,
  getTodoStats,
  checkActiveTodoLimit,
  validateTagIds,
  buildTodoWhereClause,
  sortByPriority,
  MAX_ACTIVE_TODOS,
} from '@/server/api/services/todo.service';
import { TRPCError } from '@trpc/server';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    todo: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    tag: {
      findMany: jest.fn(),
    },
    todoTag: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const { prisma } = require('@/lib/prisma');

describe('Todo Service', () => {
  const mockUserId = 'user-123';
  const mockTodoId = 'todo-123';
  const mockTagId = 'tag-123';

  const mockTodo = {
    id: mockTodoId,
    userId: mockUserId,
    title: 'Test Todo',
    description: 'Test description',
    status: 'active',
    priority: 'medium',
    dueDate: null,
    completedAt: null,
    category: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    todoTags: [],
  };

  const mockTag = {
    id: mockTagId,
    userId: mockUserId,
    name: 'Test Tag',
    color: '#3b82f6',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // checkActiveTodoLimit Tests
  // ============================================================================

  describe('checkActiveTodoLimit', () => {
    it('should not throw when under limit', async () => {
      prisma.todo.count.mockResolvedValue(MAX_ACTIVE_TODOS - 1);

      await expect(checkActiveTodoLimit(mockUserId)).resolves.not.toThrow();
    });

    it('should throw TRPCError when at limit', async () => {
      prisma.todo.count.mockResolvedValue(MAX_ACTIVE_TODOS);

      await expect(checkActiveTodoLimit(mockUserId)).rejects.toThrow(TRPCError);
      await expect(checkActiveTodoLimit(mockUserId)).rejects.toThrow(
        `You have reached the maximum limit of ${MAX_ACTIVE_TODOS} active todos`
      );
    });

    it('should throw TRPCError when over limit', async () => {
      prisma.todo.count.mockResolvedValue(MAX_ACTIVE_TODOS + 1);

      await expect(checkActiveTodoLimit(mockUserId)).rejects.toThrow(TRPCError);
    });
  });

  // ============================================================================
  // validateTagIds Tests
  // ============================================================================

  describe('validateTagIds', () => {
    it('should not throw for valid tag IDs', async () => {
      prisma.tag.findMany.mockResolvedValue([{ id: mockTagId }]);

      await expect(validateTagIds(mockUserId, [mockTagId])).resolves.not.toThrow();
    });

    it('should throw TRPCError for invalid tag IDs', async () => {
      prisma.tag.findMany.mockResolvedValue([{ id: 'other-tag' }]);

      await expect(validateTagIds(mockUserId, [mockTagId])).rejects.toThrow(TRPCError);
      await expect(validateTagIds(mockUserId, [mockTagId])).rejects.toThrow('Invalid tag IDs');
    });

    it('should handle multiple invalid tag IDs', async () => {
      prisma.tag.findMany.mockResolvedValue([]);

      await expect(validateTagIds(mockUserId, ['tag-1', 'tag-2'])).rejects.toThrow(
        'Invalid tag IDs: tag-1, tag-2'
      );
    });
  });

  // ============================================================================
  // buildTodoWhereClause Tests
  // ============================================================================

  describe('buildTodoWhereClause', () => {
    it('should build basic where clause with userId', () => {
      const where = buildTodoWhereClause(mockUserId, {});
      expect(where).toEqual({ userId: mockUserId });
    });

    it('should add status filter', () => {
      const where = buildTodoWhereClause(mockUserId, { status: 'active' });
      expect(where).toEqual({ userId: mockUserId, status: 'active' });
    });

    it('should add priority filter', () => {
      const where = buildTodoWhereClause(mockUserId, { priority: 'high' });
      expect(where).toEqual({ userId: mockUserId, priority: 'high' });
    });

    it('should add search filter with OR condition', () => {
      const where = buildTodoWhereClause(mockUserId, { search: 'test' });
      expect(where).toEqual({
        userId: mockUserId,
        OR: [
          { title: { contains: 'test', mode: 'insensitive' } },
          { description: { contains: 'test', mode: 'insensitive' } },
        ],
      });
    });

    it('should add tagIds filter', () => {
      const where = buildTodoWhereClause(mockUserId, { tagIds: ['tag-1', 'tag-2'] });
      expect(where).toEqual({
        userId: mockUserId,
        todoTags: {
          some: {
            tagId: { in: ['tag-1', 'tag-2'] },
          },
        },
      });
    });

    it('should add due date range filter', () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-12-31');
      const where = buildTodoWhereClause(mockUserId, {
        dueDateFrom: fromDate,
        dueDateTo: toDate,
      });
      expect(where).toEqual({
        userId: mockUserId,
        dueDate: {
          gte: fromDate,
          lte: toDate,
        },
      });
    });

    it('should combine multiple filters', () => {
      const where = buildTodoWhereClause(mockUserId, {
        status: 'active',
        priority: 'high',
        search: 'urgent',
      });
      expect(where).toEqual({
        userId: mockUserId,
        status: 'active',
        priority: 'high',
        OR: [
          { title: { contains: 'urgent', mode: 'insensitive' } },
          { description: { contains: 'urgent', mode: 'insensitive' } },
        ],
      });
    });
  });

  // ============================================================================
  // sortByPriority Tests
  // ============================================================================

  describe('sortByPriority', () => {
    const todos = [
      { ...mockTodo, id: '1', priority: 'low' },
      { ...mockTodo, id: '2', priority: 'urgent' },
      { ...mockTodo, id: '3', priority: 'medium' },
      { ...mockTodo, id: '4', priority: 'high' },
    ];

    it('should sort by priority descending', () => {
      const sorted = sortByPriority(todos, 'desc');
      expect(sorted.map((t) => t.priority)).toEqual(['urgent', 'high', 'medium', 'low']);
    });

    it('should sort by priority ascending', () => {
      const sorted = sortByPriority(todos, 'asc');
      expect(sorted.map((t) => t.priority)).toEqual(['low', 'medium', 'high', 'urgent']);
    });

    it('should not mutate original array', () => {
      const original = [...todos];
      sortByPriority(todos, 'desc');
      expect(todos).toEqual(original);
    });
  });

  // ============================================================================
  // getTodos Tests
  // ============================================================================

  describe('getTodos', () => {
    beforeEach(() => {
      prisma.todo.findMany.mockResolvedValue([mockTodo]);
      prisma.todo.count.mockResolvedValue(1);
    });

    it('should return todos with pagination', async () => {
      const result = await getTodos(
        mockUserId,
        {},
        { sortBy: 'createdAt', sortOrder: 'desc' },
        { page: 1, limit: 20 }
      );

      expect(result.todos).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });

    it('should calculate pagination correctly', async () => {
      prisma.todo.count.mockResolvedValue(50);

      const result = await getTodos(
        mockUserId,
        {},
        { sortBy: 'createdAt', sortOrder: 'desc' },
        { page: 2, limit: 20 }
      );

      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 50,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true,
      });
    });

    it('should apply filters', async () => {
      await getTodos(
        mockUserId,
        { status: 'active', priority: 'high' },
        { sortBy: 'createdAt', sortOrder: 'desc' },
        { page: 1, limit: 20 }
      );

      expect(prisma.todo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            status: 'active',
            priority: 'high',
          }),
        })
      );
    });
  });

  // ============================================================================
  // getTodoById Tests
  // ============================================================================

  describe('getTodoById', () => {
    it('should return todo when found', async () => {
      prisma.todo.findFirst.mockResolvedValue(mockTodo);

      const result = await getTodoById(mockUserId, mockTodoId);

      expect(result).toEqual(mockTodo);
      expect(prisma.todo.findFirst).toHaveBeenCalledWith({
        where: { id: mockTodoId, userId: mockUserId },
        include: {
          todoTags: {
            include: {
              tag: true,
            },
          },
          reminders: true,
        },
      });
    });

    it('should throw TRPCError when todo not found', async () => {
      prisma.todo.findFirst.mockResolvedValue(null);

      await expect(getTodoById(mockUserId, mockTodoId)).rejects.toThrow(TRPCError);
      await expect(getTodoById(mockUserId, mockTodoId)).rejects.toThrow('Todo not found');
    });
  });

  // ============================================================================
  // createTodo Tests
  // ============================================================================

  describe('createTodo', () => {
    const createData = {
      title: 'New Todo',
      description: 'Description',
      priority: 'high' as const,
      dueDate: new Date('2024-12-31'),
      tagIds: [mockTagId],
      category: 'work',
    };

    beforeEach(() => {
      prisma.todo.count.mockResolvedValue(0);
      prisma.tag.findMany.mockResolvedValue([{ id: mockTagId }]);
      prisma.todo.create.mockResolvedValue({
        ...mockTodo,
        ...createData,
        todoTags: [{ tag: mockTag }],
      });
    });

    it('should create todo successfully', async () => {
      const result = await createTodo(mockUserId, createData);

      expect(prisma.todo.create).toHaveBeenCalled();
      expect(result.title).toBe('New Todo');
    });

    it('should check active todo limit', async () => {
      await createTodo(mockUserId, createData);

      expect(prisma.todo.count).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          status: { in: ['active', 'completed'] },
        },
      });
    });

    it('should skip limit check when option is set', async () => {
      await createTodo(mockUserId, createData, { skipLimitCheck: true });

      expect(prisma.todo.count).not.toHaveBeenCalled();
    });

    it('should validate tag IDs', async () => {
      await createTodo(mockUserId, createData);

      expect(prisma.tag.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        select: { id: true },
      });
    });

    it('should throw when over active limit', async () => {
      prisma.todo.count.mockResolvedValue(MAX_ACTIVE_TODOS);

      await expect(createTodo(mockUserId, createData)).rejects.toThrow(TRPCError);
    });
  });

  // ============================================================================
  // updateTodo Tests
  // ============================================================================

  describe('updateTodo', () => {
    const updateData = {
      title: 'Updated Title',
      description: 'Updated description',
    };

    beforeEach(() => {
      prisma.todo.findFirst.mockResolvedValue({
        ...mockTodo,
        todoTags: [],
      });
      prisma.todo.update.mockResolvedValue({
        ...mockTodo,
        ...updateData,
        todoTags: [],
      });
    });

    it('should update todo successfully', async () => {
      const result = await updateTodo(mockUserId, mockTodoId, updateData);

      expect(prisma.todo.update).toHaveBeenCalled();
      expect(result.title).toBe('Updated Title');
    });

    it('should throw when todo not found', async () => {
      prisma.todo.findFirst.mockResolvedValue(null);

      await expect(updateTodo(mockUserId, mockTodoId, updateData)).rejects.toThrow(
        'Todo not found'
      );
    });

    it('should handle tag updates', async () => {
      prisma.tag.findMany.mockResolvedValue([{ id: mockTagId }]);

      await updateTodo(mockUserId, mockTodoId, { tagIds: [mockTagId] });

      expect(prisma.todoTag.deleteMany).toHaveBeenCalledWith({
        where: { todoId: mockTodoId },
      });
    });

    it('should increment version on update', async () => {
      await updateTodo(mockUserId, mockTodoId, updateData);

      expect(prisma.todo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            version: { increment: 1 },
          }),
        })
      );
    });
  });

  // ============================================================================
  // deleteTodo Tests
  // ============================================================================

  describe('deleteTodo', () => {
    beforeEach(() => {
      prisma.todo.findFirst.mockResolvedValue(mockTodo);
      prisma.todo.delete.mockResolvedValue(mockTodo);
    });

    it('should delete todo successfully', async () => {
      const result = await deleteTodo(mockUserId, mockTodoId);

      expect(result).toEqual({ success: true, id: mockTodoId });
      expect(prisma.todo.delete).toHaveBeenCalledWith({
        where: { id: mockTodoId },
      });
    });

    it('should throw when todo not found', async () => {
      prisma.todo.findFirst.mockResolvedValue(null);

      await expect(deleteTodo(mockUserId, mockTodoId)).rejects.toThrow('Todo not found');
    });
  });

  // ============================================================================
  // toggleTodoComplete Tests
  // ============================================================================

  describe('toggleTodoComplete', () => {
    beforeEach(() => {
      prisma.todo.findFirst.mockResolvedValue(mockTodo);
      prisma.todo.update.mockResolvedValue({
        ...mockTodo,
        status: 'completed',
        completedAt: new Date(),
      });
    });

    it('should mark active todo as completed', async () => {
      const result = await toggleTodoComplete(mockUserId, mockTodoId);

      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeDefined();
    });

    it('should mark completed todo as active', async () => {
      prisma.todo.findFirst.mockResolvedValue({
        ...mockTodo,
        status: 'completed',
        completedAt: new Date(),
      });
      prisma.todo.update.mockResolvedValue({
        ...mockTodo,
        status: 'active',
        completedAt: null,
      });

      const result = await toggleTodoComplete(mockUserId, mockTodoId);

      expect(result.status).toBe('active');
      expect(result.completedAt).toBeNull();
    });

    it('should throw when todo not found', async () => {
      prisma.todo.findFirst.mockResolvedValue(null);

      await expect(toggleTodoComplete(mockUserId, mockTodoId)).rejects.toThrow('Todo not found');
    });
  });

  // ============================================================================
  // archiveTodo Tests
  // ============================================================================

  describe('archiveTodo', () => {
    beforeEach(() => {
      prisma.todo.findFirst.mockResolvedValue(mockTodo);
      prisma.todo.update.mockResolvedValue({
        ...mockTodo,
        status: 'archived',
      });
    });

    it('should archive todo successfully', async () => {
      const result = await archiveTodo(mockUserId, mockTodoId);

      expect(result.status).toBe('archived');
      expect(prisma.todo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'archived',
            version: { increment: 1 },
          }),
        })
      );
    });

    it('should throw when todo not found', async () => {
      prisma.todo.findFirst.mockResolvedValue(null);

      await expect(archiveTodo(mockUserId, mockTodoId)).rejects.toThrow('Todo not found');
    });
  });

  // ============================================================================
  // bulkUpdateTodos Tests
  // ============================================================================

  describe('bulkUpdateTodos', () => {
    const todoIds = ['todo-1', 'todo-2', 'todo-3'];
    const updates = { status: 'completed' as const, priority: 'high' as const };

    beforeEach(() => {
      prisma.todo.findMany.mockResolvedValue(todoIds.map((id) => ({ id })));
      prisma.$transaction.mockResolvedValue(
        todoIds.map((id) => ({ ...mockTodo, id, status: 'completed', priority: 'high' }))
      );
    });

    it('should update multiple todos', async () => {
      const result = await bulkUpdateTodos(mockUserId, todoIds, updates);

      expect(result.success).toBe(true);
      expect(result.count).toBe(3);
    });

    it('should throw for invalid todo IDs', async () => {
      prisma.todo.findMany.mockResolvedValue([{ id: 'todo-1' }]);

      await expect(bulkUpdateTodos(mockUserId, todoIds, updates)).rejects.toThrow(
        'Invalid todo IDs: todo-2, todo-3'
      );
    });

    it('should throw for empty todo IDs', async () => {
      await expect(bulkUpdateTodos(mockUserId, [], updates)).rejects.toThrow(TRPCError);
    });
  });

  // ============================================================================
  // getTodoStats Tests
  // ============================================================================

  describe('getTodoStats', () => {
    beforeEach(() => {
      prisma.todo.count.mockResolvedValue(0);
      prisma.todo.groupBy.mockResolvedValue([
        { priority: 'high', _count: { priority: 5 } },
        { priority: 'medium', _count: { priority: 3 } },
      ]);
    });

    it('should return todo statistics', async () => {
      prisma.todo.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5) // active
        .mockResolvedValueOnce(3) // completed
        .mockResolvedValueOnce(2) // archived
        .mockResolvedValueOnce(1); // overdue

      const result = await getTodoStats(mockUserId);

      expect(result).toEqual({
        total: 10,
        active: 5,
        completed: 3,
        archived: 2,
        byPriority: {
          high: 5,
          medium: 3,
        },
        overdue: 1,
      });
    });

    it('should handle empty stats', async () => {
      prisma.todo.count.mockResolvedValue(0);
      prisma.todo.groupBy.mockResolvedValue([]);

      const result = await getTodoStats(mockUserId);

      expect(result.total).toBe(0);
      expect(result.byPriority).toEqual({});
    });
  });
});
