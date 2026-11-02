/**
 * tRPC Root Router
 * 
 * Combines all sub-routers with proper type exports.
 * This is the main entry point for the tRPC API.
 */

import { router } from './procedures';
import { todosRouter } from '@/server/api/routers/todos';
import { usersRouter } from '@/server/api/routers/users';
import { tagsRouter } from '@/server/api/routers/tags';
import { adminRouter } from '@/server/api/routers/admin';

/**
 * Root router combining all domain routers
 */
export const appRouter = router({
  todos: todosRouter,
  users: usersRouter,
  tags: tagsRouter,
  admin: adminRouter,
});

/**
 * Type definition for the app router
 * Used for client-side type inference
 */
export type AppRouter = typeof appRouter;

/**
 * Type helpers for router outputs
 * Usage: type Todo = RouterOutputs['todos']['getById']
 */
export type RouterOutputs = {
  todos: {
    getAll: Awaited<ReturnType<typeof appRouter.todos.getAll>>;
    getById: Awaited<ReturnType<typeof appRouter.todos.getById>>;
    create: Awaited<ReturnType<typeof appRouter.todos.create>>;
    update: Awaited<ReturnType<typeof appRouter.todos.update>>;
    delete: Awaited<ReturnType<typeof appRouter.todos.delete>>;
    toggleComplete: Awaited<ReturnType<typeof appRouter.todos.toggleComplete>>;
    archive: Awaited<ReturnType<typeof appRouter.todos.archive>>;
    bulkUpdate: Awaited<ReturnType<typeof appRouter.todos.bulkUpdate>>;
  };
  users: {
    getProfile: Awaited<ReturnType<typeof appRouter.users.getProfile>>;
    updateProfile: Awaited<ReturnType<typeof appRouter.users.updateProfile>>;
    changePassword: Awaited<ReturnType<typeof appRouter.users.changePassword>>;
    deleteAccount: Awaited<ReturnType<typeof appRouter.users.deleteAccount>>;
    listUsers: Awaited<ReturnType<typeof appRouter.users.listUsers>>;
  };
  tags: {
    getAll: Awaited<ReturnType<typeof appRouter.tags.getAll>>;
    getById: Awaited<ReturnType<typeof appRouter.tags.getById>>;
    create: Awaited<ReturnType<typeof appRouter.tags.create>>;
    update: Awaited<ReturnType<typeof appRouter.tags.update>>;
    delete: Awaited<ReturnType<typeof appRouter.tags.delete>>;
  };
  admin: {
    listUsers: Awaited<ReturnType<typeof appRouter.admin.listUsers>>;
    getUserDetails: Awaited<ReturnType<typeof appRouter.admin.getUserDetails>>;
    updateUserStatus: Awaited<ReturnType<typeof appRouter.admin.updateUserStatus>>;
    deleteUser: Awaited<ReturnType<typeof appRouter.admin.deleteUser>>;
    getPlatformStats: Awaited<ReturnType<typeof appRouter.admin.getPlatformStats>>;
    getAuditLogs: Awaited<ReturnType<typeof appRouter.admin.getAuditLogs>>;
  };
};

/**
 * Type helpers for router inputs
 * Usage: type CreateTodoInput = RouterInputs['todos']['create']
 */
export type RouterInputs = {
  todos: {
    getAll: Parameters<typeof appRouter.todos.getAll>[0];
    getById: Parameters<typeof appRouter.todos.getById>[0];
    create: Parameters<typeof appRouter.todos.create>[0];
    update: Parameters<typeof appRouter.todos.update>[0];
    delete: Parameters<typeof appRouter.todos.delete>[0];
    toggleComplete: Parameters<typeof appRouter.todos.toggleComplete>[0];
    archive: Parameters<typeof appRouter.todos.archive>[0];
    bulkUpdate: Parameters<typeof appRouter.todos.bulkUpdate>[0];
  };
  users: {
    getProfile: Parameters<typeof appRouter.users.getProfile>[0];
    updateProfile: Parameters<typeof appRouter.users.updateProfile>[0];
    changePassword: Parameters<typeof appRouter.users.changePassword>[0];
    deleteAccount: Parameters<typeof appRouter.users.deleteAccount>[0];
    listUsers: Parameters<typeof appRouter.users.listUsers>[0];
  };
  tags: {
    getAll: Parameters<typeof appRouter.tags.getAll>[0];
    getById: Parameters<typeof appRouter.tags.getById>[0];
    create: Parameters<typeof appRouter.tags.create>[0];
    update: Parameters<typeof appRouter.tags.update>[0];
    delete: Parameters<typeof appRouter.tags.delete>[0];
  };
  admin: {
    listUsers: Parameters<typeof appRouter.admin.listUsers>[0];
    getUserDetails: Parameters<typeof appRouter.admin.getUserDetails>[0];
    updateUserStatus: Parameters<typeof appRouter.admin.updateUserStatus>[0];
    deleteUser: Parameters<typeof appRouter.admin.deleteUser>[0];
    getPlatformStats: Parameters<typeof appRouter.admin.getPlatformStats>[0];
    getAuditLogs: Parameters<typeof appRouter.admin.getAuditLogs>[0];
  };
};
