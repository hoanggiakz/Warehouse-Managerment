'use server';

import { prisma } from '@/lib/prisma';
import { WarehouseSchema } from '@/lib/validations/warehouse';
import { requirePermission } from '@/lib/rbac/authorize';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { logAudit } from '@/lib/audit-logger';
import { WarehouseStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

export async function getWarehouses(page: number = 1, limit: number = 20, search: string = '', status: string = '') {
  await requirePermission(PERMISSIONS.WAREHOUSES_VIEW);

  const skip = (page - 1) * limit;

  const where: Prisma.WarehouseWhereInput = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(status && status !== 'ALL' && {
      status: status as WarehouseStatus,
    }),
  };

  const [data, total] = await Promise.all([
    prisma.warehouse.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { inventories: true },
        },
      },
    }),
    prisma.warehouse.count({ where }),
  ]);

  return {
    data,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getWarehouse(id: number) {
  await requirePermission(PERMISSIONS.WAREHOUSES_VIEW);

  return prisma.warehouse.findUnique({
    where: { id },
  });
}

export async function createWarehouse(data: unknown) {
  await requirePermission(PERMISSIONS.WAREHOUSES_CREATE);

  const parsed = WarehouseSchema.safeParse(data);
  
  if (!parsed.success) {
    return { error: 'Invalid data', issues: parsed.error.issues };
  }

  try {
    const existing = await prisma.warehouse.findUnique({
      where: { code: parsed.data.code },
    });

    if (existing) {
      return { error: 'Warehouse code must be unique' };
    }

    const warehouse = await prisma.warehouse.create({
      data: parsed.data,
    });

    await logAudit({
      action: 'CREATE_WAREHOUSE',
      entity: 'Warehouse',
      entityId: warehouse.id.toString(),
      metadata: { code: warehouse.code, name: warehouse.name }
    });

    return { success: true, data: warehouse };
  } catch (error) {
    console.error('Failed to create warehouse:', error);
    return { error: 'Failed to create warehouse' };
  }
}

export async function updateWarehouse(id: number, data: unknown) {
  await requirePermission(PERMISSIONS.WAREHOUSES_UPDATE);

  const parsed = WarehouseSchema.safeParse(data);
  
  if (!parsed.success) {
    return { error: 'Invalid data', issues: parsed.error.issues };
  }

  try {
    const existing = await prisma.warehouse.findFirst({
      where: { code: parsed.data.code, NOT: { id } },
    });

    if (existing) {
      return { error: 'Warehouse code must be unique' };
    }

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: parsed.data,
    });

    await logAudit({
      action: 'UPDATE_WAREHOUSE',
      entity: 'Warehouse',
      entityId: warehouse.id.toString(),
      metadata: { code: warehouse.code, changes: parsed.data }
    });

    return { success: true, data: warehouse };
  } catch (error) {
    console.error('Failed to update warehouse:', error);
    return { error: 'Failed to update warehouse' };
  }
}

export async function changeWarehouseStatus(id: number, status: WarehouseStatus) {
  await requirePermission(PERMISSIONS.WAREHOUSES_DELETE); // Using delete permission to represent ability to disable

  try {
    // If disabling, warn or check if inventory exists. In our case, the requirements 
    // say "If inventory exists: Show warning. Do not delete the warehouse."
    // We will just allow status change, but the UI warns first.

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: { status },
    });

    await logAudit({
      action: 'WAREHOUSE_STATUS_CHANGED',
      entity: 'Warehouse',
      entityId: warehouse.id.toString(),
      metadata: { newStatus: status }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to change warehouse status:', error);
    return { error: 'Failed to change warehouse status' };
  }
}
