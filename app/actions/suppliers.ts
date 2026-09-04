'use server';

import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/authorize';
import { SupplierSchema, SupplierInput } from '@/lib/validations/supplier';
import { logAudit } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

export async function getSuppliers(page = 1, pageSize = 20, search = '', status = '') {
  await requirePermission('suppliers:view');
  
  const skip = (page - 1) * pageSize;
  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { contactName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (status) {
    where.status = status;
  }

  const [data, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { name: 'asc' },
    }),
    prisma.supplier.count({ where })
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createSupplier(data: SupplierInput) {
  await requirePermission('suppliers:create');
  
  const parsed = SupplierSchema.safeParse(data);
  if (!parsed.success) {
    return { error: 'Invalid input data' };
  }

  try {
    const existing = await prisma.supplier.findUnique({
      where: { name: parsed.data.name }
    });
    if (existing) {
      return { error: 'Supplier name already exists' };
    }

    // Convert rating to Decimal format string safely if needed, but Prisma handles numbers for Decimal fields
    const supplier = await prisma.supplier.create({
      data: parsed.data
    });

    await logAudit({
      action: 'CREATE_SUPPLIER',
      entity: 'Supplier',
      entityId: supplier.id.toString(),
      metadata: { name: supplier.name }
    });

    revalidatePath('/suppliers');
    return { data: supplier };
  } catch (error) {
    console.error('Create supplier error:', error);
    return { error: 'Failed to create supplier' };
  }
}

export async function updateSupplier(id: number, data: SupplierInput) {
  await requirePermission('suppliers:update');
  
  const parsed = SupplierSchema.safeParse(data);
  if (!parsed.success) {
    return { error: 'Invalid input data' };
  }

  try {
    const supplier = await prisma.supplier.update({
      where: { id },
      data: parsed.data
    });

    await logAudit({
      action: 'UPDATE_SUPPLIER',
      entity: 'Supplier',
      entityId: supplier.id.toString(),
      metadata: { name: supplier.name, changes: parsed.data }
    });

    revalidatePath('/suppliers');
    return { data: supplier };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { error: 'Supplier name already exists' };
      }
    }
    return { error: 'Failed to update supplier' };
  }
}

export async function deleteSupplier(id: number) {
  await requirePermission('suppliers:delete');

  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id }
    });

    if (!supplier) {
      return { error: 'Supplier not found' };
    }

    const partsCount = await prisma.part.count({ where: { supplierId: id } });
    const receiptsCount = await prisma.importReceipt.count({ where: { supplierId: id } });

    if (partsCount > 0 || receiptsCount > 0) {
      return { error: 'Cannot delete supplier. References exist in parts or receipts. Please deactivate instead.' };
    }

    await prisma.supplier.delete({ where: { id } });

    await logAudit({
      action: 'DELETE_SUPPLIER',
      entity: 'Supplier',
      entityId: id.toString(),
      metadata: { name: supplier.name }
    });

    revalidatePath('/suppliers');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to delete supplier' };
  }
}
