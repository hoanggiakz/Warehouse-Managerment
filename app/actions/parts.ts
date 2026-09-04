'use server';

import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/authorize';
import { PartSchema, PartInput, WheelSpecificationSchema, TireSpecificationSchema, AccessorySpecificationSchema } from '@/lib/validations/part';
import { logAudit } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

async function validateSpecifications(categoryId: number, specs: any) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { parent: true }
  });

  if (!category) throw new Error('Category not found');

  const topLevelName = category.parent ? category.parent.name.toLowerCase() : category.name.toLowerCase();

  if (topLevelName.includes('wheel')) {
    const parsed = WheelSpecificationSchema.safeParse(specs);
    if (!parsed.success) throw new Error(`Invalid wheel specifications: ${parsed.error.errors.map(e => e.message).join(', ')}`);
    return parsed.data;
  }
  
  if (topLevelName.includes('tire')) {
    const parsed = TireSpecificationSchema.safeParse(specs);
    if (!parsed.success) throw new Error(`Invalid tire specifications: ${parsed.error.errors.map(e => e.message).join(', ')}`);
    return parsed.data;
  }

  // Accessories or others
  const parsed = AccessorySpecificationSchema.safeParse(specs);
  if (!parsed.success) throw new Error('Invalid accessory specifications');
  return parsed.data;
}

export async function getParts(page = 1, pageSize = 20, search = '', categoryId: number | string = '', supplierId: number | string = '', status = '') {
  await requirePermission('parts:view');
  
  const skip = (page - 1) * pageSize;
  const where: any = {};

  if (search) {
    where.OR = [
      { sku: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (categoryId && categoryId !== 'ALL') where.categoryId = Number(categoryId);
  if (supplierId && supplierId !== 'ALL') where.supplierId = Number(supplierId);
  if (status && status !== 'ALL') where.status = status;

  const [data, total] = await Promise.all([
    prisma.part.findMany({
      where,
      skip,
      take: pageSize,
      include: {
        category: true,
        supplier: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.part.count({ where })
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createPart(data: PartInput) {
  await requirePermission('parts:create');
  
  const parsed = PartSchema.safeParse(data);
  if (!parsed.success) {
    return { error: 'Invalid input data: ' + parsed.error.errors[0]?.message };
  }

  try {
    const specs = await validateSpecifications(parsed.data.categoryId, parsed.data.specifications);
    
    // Explicitly parse string floats into Prisma Decimals
    const part = await prisma.part.create({
      data: {
        ...parsed.data,
        specifications: specs,
        purchasePrice: new Prisma.Decimal(parsed.data.purchasePrice),
        salePrice: new Prisma.Decimal(parsed.data.salePrice),
      }
    });

    await logAudit({
      action: 'CREATE_PART',
      entity: 'Part',
      entityId: part.id.toString(),
      metadata: { sku: part.sku, name: part.name }
    });

    revalidatePath('/parts');
    return { data: part };
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { error: 'SKU already exists. Please enter a unique SKU.' };
      }
    }
    return { error: error.message || 'Failed to create part' };
  }
}

export async function updatePart(id: number, data: PartInput) {
  await requirePermission('parts:update');
  
  const parsed = PartSchema.safeParse(data);
  if (!parsed.success) {
    return { error: 'Invalid input data: ' + parsed.error.errors[0]?.message };
  }

  try {
    const specs = await validateSpecifications(parsed.data.categoryId, parsed.data.specifications);

    const part = await prisma.part.update({
      where: { id },
      data: {
        ...parsed.data,
        specifications: specs,
        purchasePrice: new Prisma.Decimal(parsed.data.purchasePrice),
        salePrice: new Prisma.Decimal(parsed.data.salePrice),
      }
    });

    await logAudit({
      action: 'UPDATE_PART',
      entity: 'Part',
      entityId: part.id.toString(),
      metadata: { sku: part.sku, name: part.name }
    });

    revalidatePath('/parts');
    return { data: part };
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { error: 'SKU already exists. Please enter a unique SKU.' };
      }
    }
    return { error: error.message || 'Failed to update part' };
  }
}

export async function deletePart(id: number) {
  await requirePermission('parts:delete');

  try {
    const part = await prisma.part.findUnique({
      where: { id }
    });

    if (!part) {
      return { error: 'Part not found' };
    }

    const inventories = await prisma.inventory.count({ where: { partId: id } });
    const importDetails = await prisma.importReceiptDetail.count({ where: { partId: id } });
    const exportDetails = await prisma.exportReceiptDetail.count({ where: { partId: id } });
    const qualityChecks = await prisma.qualityCheck.count({ where: { partId: id } });
    const stockCheckDetails = await prisma.stockCheckDetail.count({ where: { partId: id } });

    const hasReferences = inventories > 0 || importDetails > 0 || exportDetails > 0 || qualityChecks > 0 || stockCheckDetails > 0;
    
    if (hasReferences) {
      return { error: 'Cannot delete part. References exist in inventory or receipts. Please deactivate or discontinue instead.' };
    }

    await prisma.part.delete({ where: { id } });

    await logAudit({
      action: 'DELETE_PART',
      entity: 'Part',
      entityId: id.toString(),
      metadata: { sku: part.sku }
    });

    revalidatePath('/parts');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to delete part' };
  }
}
