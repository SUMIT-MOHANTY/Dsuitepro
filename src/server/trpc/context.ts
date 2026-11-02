/**
 * tRPC Context Factory
 * 
 * Creates the context for each tRPC request with:
 * - Auth session extraction
 * - Prisma client injection
 * - Request metadata
 */

import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { type Session } from 'next-auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Context metadata from the request
 */
interface RequestMetadata {
  /** Client IP address */
  ipAddress: string | null;
  /** User agent string */
  userAgent: string | null;
  /** Request ID for tracing */
  requestId: string;
  /** Timestamp of request */
  timestamp: Date;
}

/**
 * tRPC Context shape
 */
export type Context = {
  /** Prisma database client */
  prisma: typeof prisma;
  /** Current user session (null if unauthenticated) */
  session: Session | null;
  /** Request metadata */
  metadata: RequestMetadata;
};

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extract client IP from request headers
 */
function getClientIp(req: CreateNextContextOptions['req']): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() || null;
  }
  
  if (typeof realIp === 'string') {
    return realIp;
  }
  
  return req.socket?.remoteAddress || null;
}

/**
 * Create tRPC context for incoming requests
 * 
 * @param opts - Next.js context options
 * @returns Context object with prisma, session, and metadata
 */
export async function createContext(opts: CreateNextContextOptions): Promise<Context> {
  const { req, res } = opts;
  
  // Extract session from NextAuth
  const session = await getServerSession(req, res, authOptions);
  
  // Build request metadata
  const metadata: RequestMetadata = {
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'] || null,
    requestId: generateRequestId(),
    timestamp: new Date(),
  };
  
  return {
    prisma,
    session,
    metadata,
  };
}

/**
 * Create context for server-side calls (no HTTP request)
 * Useful for background jobs or server-to-server calls
 */
export function createServerContext(session?: Session): Context {
  return {
    prisma,
    session: session || null,
    metadata: {
      ipAddress: null,
      userAgent: 'server',
      requestId: generateRequestId(),
      timestamp: new Date(),
    },
  };
}

export type { Session };
