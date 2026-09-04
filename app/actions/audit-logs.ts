'use server';

import { prisma } from '@/lib/prisma';
import { requirePermission, requireActiveUser } from '@/lib/rbac/authorize';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { AuditLogFilterSchema, AuditLogFilterInput } from '@/lib/validations/audit-logs';
import { Prisma } from '@prisma/client';

function sanitizeMetadata(meta: any): any {
  if (!meta) return null;
  let parsed = meta;
  if (typeof meta === 'string') {
    try {
      parsed = JSON.parse(meta);
    } catch {
      return meta;
    }
  }

  if (typeof parsed === 'object' && parsed !== null) {
    const clone = { ...parsed };
    // Redact any sensitive keys
    const sensitiveKeys = ['password', 'passwordHash', 'token', 'secret', 'jwt'];
    for (const key of Object.keys(clone)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        clone[key] = '[REDACTED]';
      }
    }
    return clone;
  }

  return parsed;
}

/**
 * Query audit logs with pagination and filters.
 * AUDIT LOGS ARE READ ONLY. No update or delete operations are provided.
 */
export async function getAuditLogs(params?: Partial<AuditLogFilterInput>) {
  const session = await requirePermission(PERMISSIONS.AUDIT_LOGS_VIEW);
  await requireActiveUser(session.id);

  const validated = AuditLogFilterSchema.parse(params || {});
  const { page, limit, search, userId, action, entity, startDate, endDate } = validated;
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {};

  if (userId) {
    where.userId = userId;
  }

  if (action && action.trim()) {
    where.action = action.trim();
  }

  if (entity && entity.trim()) {
    where.entity = entity.trim();
  }

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) {
      where.timestamp.gte = new Date(startDate);
    }
    if (endDate) {
      // Set to end of day if just a date string
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.timestamp.lte = end;
    }
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { action: { contains: q, mode: 'insensitive' } },
      { entity: { contains: q, mode: 'insensitive' } },
      { entityId: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const sanitizedLogs = logs.map((log) => ({
    id: log.id,
    userId: log.userId,
    user: log.user,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    metadata: sanitizeMetadata(log.metadata),
    ipAddress: log.ipAddress,
    timestamp: log.timestamp,
  }));

  return {
    logs: sanitizedLogs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Get distinct actions and entities for filter dropdowns.
 */
export async function getAuditLogFilterOptions() {
  const session = await requirePermission(PERMISSIONS.AUDIT_LOGS_VIEW);
  await requireActiveUser(session.id);

  const [actions, entities] = await Promise.all([
    prisma.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    }),
    prisma.auditLog.findMany({
      select: { entity: true },
      distinct: ['entity'],
      orderBy: { entity: 'asc' },
    }),
  ]);

  return {
    actions: actions.map((a) => a.action),
    entities: entities.map((e) => e.entity),
  };
}
