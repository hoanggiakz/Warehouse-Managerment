import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

import { Prisma } from '@prisma/client';

interface LogOptions {
  action: string;
  entity: string;
  entityId?: string;
  metadata?: any;
  userId?: number;
  tx?: Prisma.TransactionClient;
}

export async function logAudit({ action, entity, entityId, metadata, userId, tx }: LogOptions) {
  try {
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const session = await getSession();
      resolvedUserId = session?.id;
    }
    
    if (!resolvedUserId) {
      console.warn('Audit log skipped: No active session or userId');
      return;
    }

    const client = tx || prisma;

    await client.auditLog.create({
      data: {
        userId: resolvedUserId,
        action,
        entity,
        entityId: entityId || 'unknown',
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        ipAddress: 'server-action',
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    if (tx) {
      // If inside a transaction, re-throw to allow transaction rollback
      throw error;
    }
    // We do not throw here outside transaction to prevent business logic from failing if logging fails.
  }
}
