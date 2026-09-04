'use server';

import { prisma } from '@/lib/prisma';
import { requirePermission, requireActiveUser } from '@/lib/rbac/authorize';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { subDays } from 'date-fns';

export async function getAdminDashboardMetrics() {
  const session = await requirePermission(PERMISSIONS.USERS_VIEW);
  await requireActiveUser(session.id);

  const sevenDaysAgo = subDays(new Date(), 7);

  const [
    totalUsers,
    activeUsers,
    inactiveUsers,
    recentLoginsCount,
    rolesWithCount,
    recentSecurityEvents,
    totalAuditLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { status: 'INACTIVE' } }),
    prisma.user.count({
      where: {
        lastLogin: { gte: sevenDaysAgo },
      },
    }),
    prisma.role.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        _count: {
          select: { users: true },
        },
      },
      orderBy: { id: 'asc' },
    }),
    prisma.auditLog.findMany({
      where: {
        action: {
          in: [
            'USER_CREATED',
            'USER_UPDATED',
            'USER_ACTIVATED',
            'USER_DEACTIVATED',
            'USER_ROLE_CHANGED',
            'USER_PASSWORD_RESET',
            'USER_PASSWORD_CHANGED',
            'ROLE_CREATED',
            'ROLE_UPDATED',
            'ROLE_DELETED',
            'ROLE_PERMISSIONS_CHANGED',
            'LOGIN_SUCCESS',
          ],
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 15,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            role: { select: { name: true } },
          },
        },
      },
    }),
    prisma.auditLog.count(),
  ]);

  return {
    userMetrics: {
      total: totalUsers,
      active: activeUsers,
      inactive: inactiveUsers,
      recentLogins: recentLoginsCount,
    },
    roleMetrics: {
      totalRoles: rolesWithCount.length,
      roles: rolesWithCount.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        userCount: r._count.users,
      })),
    },
    securityActivity: {
      totalAuditLogs,
      recentEvents: recentSecurityEvents.map((e) => ({
        id: e.id,
        action: e.action,
        entity: e.entity,
        entityId: e.entityId,
        actor: e.user ? e.user.fullName : 'System',
        actorUsername: e.user ? e.user.username : 'system',
        actorRole: e.user?.role ? e.user.role.name : 'Unknown',
        timestamp: e.timestamp,
        ipAddress: e.ipAddress,
      })),
    },
  };
}
