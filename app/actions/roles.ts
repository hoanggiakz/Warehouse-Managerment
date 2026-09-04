'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, requirePermission, requireActiveUser, AuthError } from '@/lib/rbac/authorize';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { logAudit } from '@/lib/audit-logger';
import {
  CreateRoleSchema,
  CreateRoleInput,
  UpdateRoleSchema,
  UpdateRoleInput,
  UpdateRolePermissionsSchema,
  UpdateRolePermissionsInput,
  isSystemRole,
  SYSTEM_ROLES,
} from '@/lib/validations/roles';

function parsePermissions(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Get all roles with user count and parsed permissions.
 */
export async function getRoles() {
  const session = await requirePermission(PERMISSIONS.ROLES_VIEW);
  await requireActiveUser(session.id);

  const roles = await prisma.role.findMany({
    orderBy: { id: 'asc' },
    include: {
      _count: {
        select: { users: true },
      },
    },
  });

  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: isSystemRole(role.name),
    userCount: role._count.users,
    permissions: parsePermissions(role.permissions),
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  }));
}

/**
 * Get role by ID with its assigned users and parsed permissions.
 */
export async function getRoleById(id: number) {
  const session = await requirePermission(PERMISSIONS.ROLES_VIEW);
  await requireActiveUser(session.id);

  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          status: true,
          lastLogin: true,
        },
      },
    },
  });

  if (!role) {
    throw new Error('Role not found.');
  }

  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: isSystemRole(role.name),
    permissions: parsePermissions(role.permissions),
    users: role.users,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

/**
 * Create a new custom role.
 */
export async function createRole(input: CreateRoleInput) {
  const session = await requirePermission(PERMISSIONS.ROLES_CREATE);
  await requireActiveUser(session.id);

  const data = CreateRoleSchema.parse(input);

  const existing = await prisma.role.findUnique({
    where: { name: data.name },
  });
  if (existing) {
    throw new Error(`Role name "${data.name}" already exists.`);
  }

  const created = await prisma.$transaction(async (tx) => {
    const role = await tx.role.create({
      data: {
        name: data.name,
        description: data.description || null,
        permissions: data.permissions,
      },
    });

    await logAudit({
      action: 'ROLE_CREATED',
      entity: 'Role',
      entityId: role.id.toString(),
      metadata: { name: role.name, permissionsCount: data.permissions.length },
      userId: session.id,
      tx,
    });

    return role;
  });

  revalidatePath('/roles');
  revalidatePath('/admin');
  return {
    ...created,
    permissions: parsePermissions(created.permissions),
  };
}

/**
 * Update an existing role.
 */
export async function updateRole(input: UpdateRoleInput) {
  const session = await requirePermission(PERMISSIONS.ROLES_UPDATE);
  await requireActiveUser(session.id);

  const data = UpdateRoleSchema.parse(input);

  const targetRole = await prisma.role.findUnique({
    where: { id: data.id },
  });
  if (!targetRole) {
    throw new Error('Role not found.');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const role = await tx.role.update({
      where: { id: data.id },
      data: {
        description: data.description !== undefined ? data.description : targetRole.description,
        ...(data.permissions !== undefined ? { permissions: data.permissions } : {}),
      },
    });

    await logAudit({
      action: 'ROLE_UPDATED',
      entity: 'Role',
      entityId: role.id.toString(),
      metadata: { name: role.name },
      userId: session.id,
      tx,
    });

    return role;
  });

  revalidatePath('/roles');
  revalidatePath(`/roles/${data.id}`);
  revalidatePath('/admin');
  return {
    ...updated,
    permissions: parsePermissions(updated.permissions),
  };
}

/**
 * Delete a role.
 * Cannot delete system roles.
 * Cannot delete roles with assigned users.
 */
export async function deleteRole(id: number) {
  const session = await requirePermission(PERMISSIONS.ROLES_DELETE);
  await requireActiveUser(session.id);

  const targetRole = await prisma.role.findUnique({
    where: { id },
    include: {
      _count: {
        select: { users: true },
      },
    },
  });

  if (!targetRole) {
    throw new Error('Role not found.');
  }

  // System role protection
  if (isSystemRole(targetRole.name)) {
    throw new Error(`Cannot delete system role "${targetRole.name}".`);
  }

  // Assigned users protection
  if (targetRole._count.users > 0) {
    throw new Error(`Cannot delete role "${targetRole.name}" because it is currently assigned to ${targetRole._count.users} user(s).`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.role.delete({
      where: { id },
    });

    await logAudit({
      action: 'ROLE_DELETED',
      entity: 'Role',
      entityId: id.toString(),
      metadata: { name: targetRole.name },
      userId: session.id,
      tx,
    });
  });

  revalidatePath('/roles');
  revalidatePath('/admin');
  return { success: true, message: `Role "${targetRole.name}" deleted successfully.` };
}

/**
 * Update role permissions matrix.
 * BR-ADMIN-006: Unauthorized users cannot modify Administrator permissions.
 */
export async function updateRolePermissions(input: UpdateRolePermissionsInput) {
  const session = await requirePermission(PERMISSIONS.ROLES_PERMISSIONS_UPDATE);
  await requireActiveUser(session.id);

  const data = UpdateRolePermissionsSchema.parse(input);

  const targetRole = await prisma.role.findUnique({
    where: { id: data.roleId },
  });
  if (!targetRole) {
    throw new Error('Role not found.');
  }

  // BR-ADMIN-006: Only Administrator can modify Administrator role permissions
  if (targetRole.name === 'Administrator' && session.role !== 'Administrator') {
    throw new AuthError('Forbidden: Unauthorized users cannot modify Administrator permissions.', 403);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const role = await tx.role.update({
      where: { id: data.roleId },
      data: {
        permissions: data.permissions,
      },
    });

    await logAudit({
      action: 'ROLE_PERMISSIONS_CHANGED',
      entity: 'Role',
      entityId: data.roleId.toString(),
      metadata: {
        roleName: targetRole.name,
        permissionCount: data.permissions.length,
      },
      userId: session.id,
      tx,
    });

    return role;
  });

  revalidatePath(`/roles/${data.roleId}`);
  revalidatePath('/roles');
  return {
    success: true,
    permissions: parsePermissions(updated.permissions),
  };
}
