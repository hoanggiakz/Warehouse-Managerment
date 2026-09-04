import { getSession } from '../auth/session';
import { SessionPayload } from '../auth/types';
import { hasPermission } from './permissions';
import { prisma } from '@/lib/prisma';

export class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Requires the user to be authenticated.
 * Throws an AuthError if not authenticated.
 * Returns the current session payload.
 */
export async function requireAuth(options?: { verifyActive?: boolean }): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new AuthError('Unauthorized', 401);
  }

  if (options?.verifyActive) {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { status: true },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new AuthError('Account is deactivated or does not exist.', 403);
    }
  }

  return session;
}

/**
 * Requires the user to have a specific permission.
 * Throws an AuthError if not authenticated or unauthorized.
 */
export async function requirePermission(permission: string, options?: { verifyActive?: boolean }): Promise<SessionPayload> {
  const session = await requireAuth(options);
  
  if (!hasPermission(session.permissions, permission)) {
    throw new AuthError('Forbidden: Insufficient permissions', 403);
  }
  
  return session;
}

/**
 * Verifies that a specific user ID is active in the database.
 */
export async function requireActiveUser(userId: number): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });
  if (!user || user.status !== 'ACTIVE') {
    throw new AuthError('Account is deactivated or does not exist.', 403);
  }
}

