/**
 * Unit Tests: User Service
 *
 * Tests for user service business logic with mocked Prisma:
 * - User registration
 * - Password hashing with bcrypt
 * - Profile management (get, update)
 * - Password change
 * - Account deletion
 * - Admin user listing
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
  deleteUserAccount,
  listUsers,
  getUserStats,
  updateLastLogin,
  verifyUserPassword,
} from '@/server/api/services/user.service';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue('salt'),
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    todo: {
      count: jest.fn(),
    },
    tag: {
      count: jest.fn(),
    },
  },
}));

const { prisma } = require('@/lib/prisma');

describe('User Service', () => {
  const mockUserId = 'user-123';
  const mockEmail = 'test@example.com';
  const mockName = 'Test User';

  const mockUser = {
    id: mockUserId,
    email: mockEmail,
    name: mockName,
    passwordHash: 'hashed_password',
    emailVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    role: 'user',
    isActive: true,
    _count: {
      todos: 5,
      tags: 3,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // getUserProfile Tests
  // ============================================================================

  describe('getUserProfile', () => {
    it('should return user profile with stats', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await getUserProfile(mockUserId);

      expect(result).toEqual({
        ...mockUser,
        stats: {
          totalTodos: 5,
          totalTags: 3,
        },
        _count: undefined,
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          role: true,
          isActive: true,
          _count: {
            select: {
              todos: true,
              tags: true,
            },
          },
        },
      });
    });

    it('should throw TRPCError when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(getUserProfile(mockUserId)).rejects.toThrow(TRPCError);
      await expect(getUserProfile(mockUserId)).rejects.toThrow('User not found');
    });
  });

  // ============================================================================
  // updateUserProfile Tests
  // ============================================================================

  describe('updateUserProfile', () => {
    const updateData = {
      name: 'Updated Name',
      email: 'updated@example.com',
    };

    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        ...updateData,
      });
    });

    it('should update profile successfully', async () => {
      const result = await updateUserProfile(mockUserId, mockEmail, updateData);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          name: updateData.name,
          email: updateData.email,
        },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          role: true,
          isActive: true,
        },
      });
      expect(result.name).toBe('Updated Name');
      expect(result.email).toBe('updated@example.com');
    });

    it('should update only name when email unchanged', async () => {
      const nameOnlyUpdate = { name: 'Updated Name' };
      
      await updateUserProfile(mockUserId, mockEmail, nameOnlyUpdate);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: 'Updated Name' },
        })
      );
    });

    it('should update only email when provided', async () => {
      const emailOnlyUpdate = { email: 'new@example.com' };
      
      await updateUserProfile(mockUserId, mockEmail, emailOnlyUpdate);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { email: 'new@example.com' },
        })
      );
    });

    it('should throw when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'other-user' });

      await expect(
        updateUserProfile(mockUserId, mockEmail, { email: 'taken@example.com' })
      ).rejects.toThrow(TRPCError);
      await expect(
        updateUserProfile(mockUserId, mockEmail, { email: 'taken@example.com' })
      ).rejects.toThrow('Email address is already in use');
    });

    it('should not check email if unchanged', async () => {
      await updateUserProfile(mockUserId, mockEmail, { name: 'New Name' });

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // changeUserPassword Tests
  // ============================================================================

  describe('changeUserPassword', () => {
    const passwordData = {
      currentPassword: 'oldPassword123',
      newPassword: 'newPassword123',
    };

    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser });
    });

    it('should change password successfully', async () => {
      const result = await changeUserPassword(mockUserId, passwordData);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        passwordData.currentPassword,
        mockUser.passwordHash
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(passwordData.newPassword, 12);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { passwordHash: 'hashed_password' },
      });
      expect(result).toEqual({
        success: true,
        message: 'Password changed successfully',
      });
    });

    it('should throw when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(changeUserPassword(mockUserId, passwordData)).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw when current password is incorrect', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(changeUserPassword(mockUserId, passwordData)).rejects.toThrow(
        'Current password is incorrect'
      );
    });

    it('should hash new password with correct rounds', async () => {
      await changeUserPassword(mockUserId, passwordData);

      expect(bcrypt.hash).toHaveBeenCalledWith(passwordData.newPassword, 12);
    });
  });

  // ============================================================================
  // deleteUserAccount Tests
  // ============================================================================

  describe('deleteUserAccount', () => {
    const deleteData = {
      password: 'password123',
    };

    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.delete.mockResolvedValue(mockUser);
    });

    it('should delete account successfully', async () => {
      const result = await deleteUserAccount(mockUserId, deleteData);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        deleteData.password,
        mockUser.passwordHash
      );
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: mockUserId },
      });
      expect(result).toEqual({
        success: true,
        message: 'Account deleted successfully',
      });
    });

    it('should throw when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(deleteUserAccount(mockUserId, deleteData)).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw when password is incorrect', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(deleteUserAccount(mockUserId, deleteData)).rejects.toThrow(
        'Password is incorrect'
      );
    });

    it('should not delete if password verification fails', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      try {
        await deleteUserAccount(mockUserId, deleteData);
      } catch (e) {
        // Expected
      }

      expect(prisma.user.delete).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // listUsers Tests
  // ============================================================================

  describe('listUsers', () => {
    const mockUsers = [
      { ...mockUser, id: 'user-1', email: 'user1@example.com' },
      { ...mockUser, id: 'user-2', email: 'user2@example.com' },
    ];

    beforeEach(() => {
      prisma.user.findMany.mockResolvedValue(mockUsers);
      prisma.user.count.mockResolvedValue(2);
    });

    it('should return users with pagination', async () => {
      const result = await listUsers(
        {},
        { page: 1, limit: 20 }
      );

      expect(result.users).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });

    it('should apply search filter', async () => {
      await listUsers(
        { search: 'test' },
        { page: 1, limit: 20 }
      );

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'test', mode: 'insensitive' } },
              { email: { contains: 'test', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should apply role filter', async () => {
      await listUsers(
        { role: 'admin' },
        { page: 1, limit: 20 }
      );

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: 'admin',
          }),
        })
      );
    });

    it('should apply isActive filter', async () => {
      await listUsers(
        { isActive: true },
        { page: 1, limit: 20 }
      );

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it('should combine multiple filters', async () => {
      await listUsers(
        { search: 'test', role: 'user', isActive: true },
        { page: 1, limit: 20 }
      );

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'test', mode: 'insensitive' } },
              { email: { contains: 'test', mode: 'insensitive' } },
            ],
            role: 'user',
            isActive: true,
          }),
        })
      );
    });

    it('should calculate pagination correctly', async () => {
      prisma.user.count.mockResolvedValue(50);

      const result = await listUsers(
        {},
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

    it('should transform users with stats', async () => {
      const result = await listUsers(
        {},
        { page: 1, limit: 20 }
      );

      expect(result.users[0]).toHaveProperty('stats');
      expect(result.users[0].stats).toEqual({
        totalTodos: 5,
        totalTags: 3,
      });
      expect(result.users[0]).not.toHaveProperty('_count');
    });
  });

  // ============================================================================
  // getUserStats Tests
  // ============================================================================

  describe('getUserStats', () => {
    beforeEach(() => {
      prisma.user.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // active
        .mockResolvedValueOnce(20) // inactive
        .mockResolvedValueOnce(5) // admins
        .mockResolvedValueOnce(10); // recent
    });

    it('should return user statistics', async () => {
      const result = await getUserStats();

      expect(result).toEqual({
        total: 100,
        active: 80,
        inactive: 20,
        admins: 5,
        recent: 10,
      });
    });

    it('should query for recent users (last 30 days)', async () => {
      await getUserStats();

      expect(prisma.user.count).toHaveBeenLastCalledWith({
        where: {
          createdAt: {
            gte: expect.any(Date),
          },
        },
      });
    });
  });

  // ============================================================================
  // updateLastLogin Tests
  // ============================================================================

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      prisma.user.update.mockResolvedValue(mockUser);

      await updateLastLogin(mockUserId);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { lastLoginAt: expect.any(Date) },
      });
    });
  });

  // ============================================================================
  // verifyUserPassword Tests
  // ============================================================================

  describe('verifyUserPassword', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
    });

    it('should return true for correct password', async () => {
      const result = await verifyUserPassword(mockUserId, 'correctPassword');

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'correctPassword',
        mockUser.passwordHash
      );
    });

    it('should return false for incorrect password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      const result = await verifyUserPassword(mockUserId, 'wrongPassword');

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await verifyUserPassword(mockUserId, 'anyPassword');

      expect(result).toBe(false);
    });

    it('should not compare password when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await verifyUserPassword(mockUserId, 'anyPassword');

      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });
});
