/**
 * Jest Setup File
 *
 * Global test configuration and utilities:
 * - Mock configuration for external dependencies
 * - Database cleanup utilities
 * - Test helpers and utilities
 * - Global test lifecycle hooks
 */

const { jest } = require('@jest/globals');

// ============================================================================
// Global Test Timeout
// ============================================================================

jest.setTimeout(10000);

// ============================================================================
// Mock Configuration
// ============================================================================

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue('salt'),
}));

// Mock next-auth
jest.mock('next-auth', () => ({
  default: jest.fn(),
  getServerSession: jest.fn(),
}));

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn().mockReturnValue({
    data: null,
    status: 'unauthenticated',
  }),
  signIn: jest.fn().mockResolvedValue({ ok: true }),
  signOut: jest.fn().mockResolvedValue({ ok: true }),
  getSession: jest.fn().mockResolvedValue(null),
}));

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(-1),
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue('OK'),
  }));
});

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn().mockImplementation((queries) => Promise.all(queries)),
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
      groupBy: jest.fn(),
    },
    todo: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    tag: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    todoTag: {
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    reminder: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// Mock SSE server
jest.mock('@/lib/sse/server', () => ({
  broadcastTodoEvent: jest.fn(),
  broadcastSystemEvent: jest.fn(),
  addClient: jest.fn(),
  removeClient: jest.fn(),
}));

// Mock Next.js headers/cookies
jest.mock('next/headers', () => ({
  headers: jest.fn().mockReturnValue({
    get: jest.fn().mockReturnValue(null),
  }),
  cookies: jest.fn().mockReturnValue({
    get: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    delete: jest.fn(),
  }),
}));

// Mock Next.js request
jest.mock('next/server', () => ({
  NextRequest: class NextRequest {
    constructor(url, init = {}) {
      this.url = url;
      this.method = init.method || 'GET';
      this.headers = new Map(Object.entries(init.headers || {}));
      this.body = init.body;
    }
    json() {
      return Promise.resolve(this.body ? JSON.parse(this.body) : {});
    }
  },
  NextResponse: {
    json: jest.fn().mockImplementation((body, init) => ({
      status: init?.status || 200,
      json: () => Promise.resolve(body),
    })),
  },
}));

// ============================================================================
// Test Data Factories
// ============================================================================

/**
 * Create a mock user object
 */
function createMockUser(overrides = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
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
    ...overrides,
  };
}

/**
 * Create a mock todo object
 */
function createMockTodo(overrides = {}) {
  return {
    id: 'todo-123',
    userId: 'user-123',
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
    reminders: [],
    ...overrides,
  };
}

/**
 * Create a mock tag object
 */
function createMockTag(overrides = {}) {
  return {
    id: 'tag-123',
    userId: 'user-123',
    name: 'Test Tag',
    color: '#3b82f6',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock session object
 */
function createMockSession(overrides = {}) {
  return {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      ...overrides.user,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock tRPC context
 */
function createMockContext(overrides = {}) {
  return {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      ...overrides.user,
    },
    prisma: require('@/lib/prisma').prisma,
    req: {
      headers: {},
      ...overrides.req,
    },
    ...overrides,
  };
}

// ============================================================================
// Global Test Utilities
// ============================================================================

/**
 * Reset all mocks before each test
 */
function resetAllMocks() {
  jest.clearAllMocks();
}

/**
 * Setup mock return values for Prisma
 */
function setupPrismaMock(model, method, returnValue) {
  const { prisma } = require('@/lib/prisma');
  if (prisma[model] && prisma[model][method]) {
    prisma[model][method].mockResolvedValue(returnValue);
  }
}

/**
 * Setup mock rejection for Prisma
 */
function setupPrismaMockRejection(model, method, error) {
  const { prisma } = require('@/lib/prisma');
  if (prisma[model] && prisma[model][method]) {
    prisma[model][method].mockRejectedValue(error);
  }
}

// ============================================================================
// Global Test Lifecycle Hooks
// ============================================================================

beforeEach(() => {
  // Reset all mocks before each test
  resetAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllTimers();
});

afterAll(async () => {
  // Disconnect Prisma after all tests
  const { prisma } = require('@/lib/prisma');
  if (prisma.$disconnect) {
    await prisma.$disconnect();
  }
});

// ============================================================================
// Global Test Helpers
// ============================================================================

global.createMockUser = createMockUser;
global.createMockTodo = createMockTodo;
global.createMockTag = createMockTag;
global.createMockSession = createMockSession;
global.createMockContext = createMockContext;
global.setupPrismaMock = setupPrismaMock;
global.setupPrismaMockRejection = setupPrismaMockRejection;
global.resetAllMocks = resetAllMocks;

// ============================================================================
// Console Suppression in Tests (optional)
// ============================================================================

// Suppress console.error and console.warn in tests unless DEBUG_TESTS is set
if (!process.env.DEBUG_TESTS) {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  beforeAll(() => {
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });
}

// ============================================================================
// Export for use in test files
// ============================================================================

module.exports = {
  createMockUser,
  createMockTodo,
  createMockTag,
  createMockSession,
  createMockContext,
  setupPrismaMock,
  setupPrismaMockRejection,
  resetAllMocks,
};
