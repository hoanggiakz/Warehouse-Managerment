'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, requirePermission, requireActiveUser, AuthError } from '@/lib/rbac/authorize';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { logAudit } from '@/lib/audit-logger';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import {
  CreateUserSchema,
  CreateUserInput,
  UpdateUserSchema,
  UpdateUserInput,
  ChangePasswordSchema,
  ChangePasswordInput,
  ResetPasswordSchema,
  ResetPasswordInput,
  UserFilterSchema,
  UserFilterInput,
} from '@/lib/validations/users';
import { Prisma, UserStatus } from '@prisma/client';

const userSelectSafe = {
  id: true,
  username: true,
  email: true,
  fullName: true,
  roleId: true,
  department: true,
  status: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
  role: {
    select: {
      id: true,
      name: true,
      description: true,
    },
  },
};

/**
 * Get paginated, filtered user list.
 */
export async function getUsers(params?: Partial<UserFilterInput>) {
  const session = await requirePermission(PERMISSIONS.USERS_VIEW);
  await requireActiveUser(session.id);

  const validated = UserFilterSchema.parse(params || {});
  const { page, limit, search, roleId, status } = validated;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { username: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { fullName: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (roleId) {
    where.roleId = roleId;
  }

  if (status && status !== 'ALL') {
    where.status = status as UserStatus;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelectSafe,
      orderBy: { id: 'asc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Get user by ID along with role details and recent audit activity.
 */
export async function getUserById(id: number) {
  const session = await requirePermission(PERMISSIONS.USERS_VIEW);
  await requireActiveUser(session.id);

  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelectSafe,
  });

  if (!user) {
    throw new Error('User not found.');
  }

  const recentActivity = await prisma.auditLog.findMany({
    where: {
      OR: [
        { userId: id },
        { entity: 'User', entityId: id.toString() },
      ],
    },
    orderBy: { timestamp: 'desc' },
    take: 10,
    select: {
      id: true,
      action: true,
      entity: true,
      entityId: true,
      timestamp: true,
      metadata: true,
      ipAddress: true,
    },
  });

  return {
    ...user,
    recentActivity,
  };
}

/**
 * Create a new user account.
 */
export async function createUser(input: CreateUserInput) {
  const session = await requirePermission(PERMISSIONS.USERS_CREATE);
  await requireActiveUser(session.id);

  const data = CreateUserSchema.parse(input);

  // Check username uniqueness
  const existingUsername = await prisma.user.findUnique({
    where: { username: data.username },
  });
  if (existingUsername) {
    throw new Error(`Username "${data.username}" is already in use.`);
  }

  // Check email uniqueness
  const existingEmail = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existingEmail) {
    throw new Error(`Email "${data.email}" is already in use.`);
  }

  // Validate role exists
  const role = await prisma.role.findUnique({
    where: { id: data.roleId },
  });
  if (!role) {
    throw new Error('Role not found.');
  }

  // BR-ADMIN-005: Unauthorized users cannot assign Administrator role
  if (role.name === 'Administrator' && session.role !== 'Administrator') {
    throw new AuthError('Forbidden: Only Administrators can create another Administrator account.', 403);
  }

  const passwordHash = await hashPassword(data.password);

  const createdUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        roleId: data.roleId,
        department: data.department || null,
        status: data.status,
        passwordHash,
      },
      select: userSelectSafe,
    });

    await logAudit({
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user.id.toString(),
      metadata: {
        username: user.username,
        email: user.email,
        roleId: user.roleId,
        roleName: role.name,
        status: user.status,
      },
      userId: session.id,
      tx,
    });

    return user;
  });

  revalidatePath('/users');
  revalidatePath('/admin');
  return createdUser;
}

/**
 * Update user details (fullName, email, department, status, roleId).
 */
export async function updateUser(input: UpdateUserInput) {
  const session = await requirePermission(PERMISSIONS.USERS_UPDATE);
  await requireActiveUser(session.id);

  const data = UpdateUserSchema.parse(input);

  const targetUser = await prisma.user.findUnique({
    where: { id: data.id },
    include: { role: true },
  });
  if (!targetUser) {
    throw new Error('User not found.');
  }

  // Check email uniqueness if modified
  if (data.email !== targetUser.email) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail && existingEmail.id !== data.id) {
      throw new Error(`Email "${data.email}" is already in use.`);
    }
  }

  const newRole = await prisma.role.findUnique({
    where: { id: data.roleId },
  });
  if (!newRole) {
    throw new Error('Role not found.');
  }

  // Check role change safety
  if (data.roleId !== targetUser.roleId) {
    // BR-ADMIN-004: Prevent self-escalation
    if (session.id === targetUser.id && targetUser.role.name !== 'Administrator' && newRole.name === 'Administrator') {
      throw new AuthError('Cannot grant yourself Administrator privileges.', 403);
    }
    // BR-ADMIN-005: Unauthorized user cannot assign Administrator
    if (newRole.name === 'Administrator' && session.role !== 'Administrator') {
      throw new AuthError('Forbidden: Only Administrators can assign the Administrator role.', 403);
    }
    // BR-ADMIN-003: Final administrator role removal check
    if (targetUser.role.name === 'Administrator' && newRole.name !== 'Administrator') {
      const otherAdmins = await prisma.user.count({
        where: {
          role: { name: 'Administrator' },
          status: 'ACTIVE',
          id: { not: targetUser.id },
        },
      });
      if (otherAdmins === 0) {
        throw new Error('Cannot remove the final active administrator.');
      }
    }
  }

  // Check status change safety
  if (data.status === 'INACTIVE' && targetUser.status === 'ACTIVE') {
    if (targetUser.role.name === 'Administrator') {
      const activeAdmins = await prisma.user.count({
        where: {
          role: { name: 'Administrator' },
          status: 'ACTIVE',
          id: { not: targetUser.id },
        },
      });
      if (activeAdmins === 0) {
        throw new Error('Cannot deactivate the last active administrator.');
      }
    }
  }

  const updatedUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: data.id },
      data: {
        fullName: data.fullName,
        email: data.email,
        department: data.department || null,
        roleId: data.roleId,
        status: data.status,
      },
      select: userSelectSafe,
    });

    const changedFields: Record<string, any> = {};
    if (targetUser.fullName !== user.fullName) changedFields.fullName = user.fullName;
    if (targetUser.email !== user.email) changedFields.email = user.email;
    if (targetUser.department !== user.department) changedFields.department = user.department;
    if (targetUser.roleId !== user.roleId) {
      changedFields.oldRole = targetUser.role.name;
      changedFields.newRole = newRole.name;
    }
    if (targetUser.status !== user.status) {
      changedFields.oldStatus = targetUser.status;
      changedFields.newStatus = user.status;
    }

    await logAudit({
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: user.id.toString(),
      metadata: changedFields,
      userId: session.id,
      tx,
    });

    return user;
  });

  revalidatePath('/users');
  revalidatePath(`/users/${data.id}`);
  revalidatePath('/admin');
  return updatedUser;
}

/**
 * Activate a deactivated user.
 */
export async function activateUser(id: number) {
  const session = await requirePermission(PERMISSIONS.USERS_ACTIVATE);
  await requireActiveUser(session.id);

  const targetUser = await prisma.user.findUnique({
    where: { id },
    include: { role: true },
  });
  if (!targetUser) {
    throw new Error('User not found.');
  }

  if (targetUser.status === 'ACTIVE') {
    return { success: true, message: 'User is already active.' };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
      select: userSelectSafe,
    });

    await logAudit({
      action: 'USER_ACTIVATED',
      entity: 'User',
      entityId: id.toString(),
      metadata: { username: user.username, role: user.role.name },
      userId: session.id,
      tx,
    });

    return user;
  });

  revalidatePath('/users');
  revalidatePath(`/users/${id}`);
  revalidatePath('/admin');
  return updated;
}

/**
 * Deactivate an active user.
 * BR-ADMIN-001: The final active Administrator cannot be deactivated.
 */
export async function deactivateUser(id: number) {
  const session = await requirePermission(PERMISSIONS.USERS_DEACTIVATE);
  await requireActiveUser(session.id);

  const targetUser = await prisma.user.findUnique({
    where: { id },
    include: { role: true },
  });
  if (!targetUser) {
    throw new Error('User not found.');
  }

  if (targetUser.status === 'INACTIVE') {
    return { success: true, message: 'User is already inactive.' };
  }

  // BR-ADMIN-001: Cannot deactivate final active Administrator
  if (targetUser.role.name === 'Administrator') {
    const activeAdminsCount = await prisma.user.count({
      where: {
        role: { name: 'Administrator' },
        status: 'ACTIVE',
        id: { not: id },
      },
    });

    if (activeAdminsCount === 0) {
      throw new Error('Cannot deactivate the last active administrator.');
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
      select: userSelectSafe,
    });

    await logAudit({
      action: 'USER_DEACTIVATED',
      entity: 'User',
      entityId: id.toString(),
      metadata: { username: user.username, role: user.role.name },
      userId: session.id,
      tx,
    });

    return user;
  });

  revalidatePath('/users');
  revalidatePath(`/users/${id}`);
  revalidatePath('/admin');
  return updated;
}

/**
 * Change a user's role assignment.
 * BR-ADMIN-003: Cannot remove final Administrator role assignment.
 * BR-ADMIN-004: Cannot self-escalate to Administrator.
 * BR-ADMIN-005: Unauthorized users cannot assign Administrator role.
 */
export async function changeUserRole(userId: number, newRoleId: number) {
  const session = await requirePermission(PERMISSIONS.USERS_UPDATE);
  await requireActiveUser(session.id);

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (!targetUser) {
    throw new Error('User not found.');
  }

  const newRole = await prisma.role.findUnique({
    where: { id: newRoleId },
  });
  if (!newRole) {
    throw new Error('Role not found.');
  }

  if (targetUser.roleId === newRoleId) {
    return { success: true, message: 'User already has this role.' };
  }

  // BR-ADMIN-004: Self-escalation check
  if (session.id === targetUser.id && targetUser.role.name !== 'Administrator' && newRole.name === 'Administrator') {
    throw new AuthError('Cannot grant yourself Administrator privileges.', 403);
  }

  // BR-ADMIN-005: Unauthorized user assigning Administrator
  if (newRole.name === 'Administrator' && session.role !== 'Administrator') {
    throw new AuthError('Forbidden: Only Administrators can assign the Administrator role.', 403);
  }

  // BR-ADMIN-003: Final active Administrator role removal check
  if (targetUser.role.name === 'Administrator' && targetUser.status === 'ACTIVE' && newRole.name !== 'Administrator') {
    const activeAdminsCount = await prisma.user.count({
      where: {
        role: { name: 'Administrator' },
        status: 'ACTIVE',
        id: { not: userId },
      },
    });

    if (activeAdminsCount === 0) {
      throw new Error('Cannot remove the final administrator.');
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { roleId: newRoleId },
      select: userSelectSafe,
    });

    await logAudit({
      action: 'USER_ROLE_CHANGED',
      entity: 'User',
      entityId: userId.toString(),
      metadata: {
        oldRoleId: targetUser.roleId,
        oldRoleName: targetUser.role.name,
        newRoleId,
        newRoleName: newRole.name,
      },
      userId: session.id,
      tx,
    });

    return user;
  });

  revalidatePath('/users');
  revalidatePath(`/users/${userId}`);
  revalidatePath('/admin');
  return updated;
}

/**
 * Reset a user's password (Administrative operation).
 */
export async function resetUserPassword(input: ResetPasswordInput) {
  const session = await requirePermission(PERMISSIONS.USERS_RESET_PASSWORD);
  await requireActiveUser(session.id);

  const data = ResetPasswordSchema.parse(input);

  const targetUser = await prisma.user.findUnique({
    where: { id: data.userId },
  });
  if (!targetUser) {
    throw new Error('User not found.');
  }

  const newHash = await hashPassword(data.newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: data.userId },
      data: { passwordHash: newHash },
    });

    await logAudit({
      action: 'USER_PASSWORD_RESET',
      entity: 'User',
      entityId: data.userId.toString(),
      metadata: { targetUsername: targetUser.username },
      userId: session.id,
      tx,
    });
  });

  revalidatePath(`/users/${data.userId}`);
  return { success: true, message: 'Password has been successfully reset.' };
}

/**
 * Change current logged-in user's own password.
 */
export async function changeMyPassword(input: ChangePasswordInput) {
  const session = await requireAuth({ verifyActive: true });

  const data = ChangePasswordSchema.parse(input);

  const user = await prisma.user.findUnique({
    where: { id: session.id },
  });
  if (!user) {
    throw new Error('User not found.');
  }

  const isMatch = await verifyPassword(data.currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new Error('Current password is incorrect.');
  }

  const newHash = await hashPassword(data.newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.id },
      data: { passwordHash: newHash },
    });

    await logAudit({
      action: 'USER_PASSWORD_CHANGED',
      entity: 'User',
      entityId: session.id.toString(),
      metadata: { username: session.username },
      userId: session.id,
      tx,
    });
  });

  return { success: true, message: 'Password changed successfully.' };
}
