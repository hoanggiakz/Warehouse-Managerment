'use server';

import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/authorize';
import { CategorySchema, CategoryInput } from '@/lib/validations/category';
import { logAudit } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

export async function getCategories() {
  await requirePermission('categories:view');
  return prisma.category.findMany({
    include: {
      parent: true,
      children: true,
      _count: {
        select: { parts: true }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });
}

export async function createCategory(data: CategoryInput) {
  await requirePermission('categories:create');
  
  const parsed = CategorySchema.safeParse(data);
  if (!parsed.success) {
    return { error: 'Invalid input data' };
  }

  try {
    const existing = await prisma.category.findUnique({
      where: { name: parsed.data.name }
    });
    if (existing) {
      return { error: 'Category name already exists' };
    }

    const category = await prisma.category.create({
      data: parsed.data
    });

    await logAudit({
      action: 'CREATE_CATEGORY',
      entity: 'Category',
      entityId: category.id.toString(),
      metadata: { name: category.name }
    });

    revalidatePath('/categories');
    return { data: category };
  } catch (error) {
    console.error('Create category error:', error);
    return { error: 'Failed to create category' };
  }
}

export async function updateCategory(id: number, data: CategoryInput) {
  await requirePermission('categories:update');
  
  const parsed = CategorySchema.safeParse(data);
  if (!parsed.success) {
    return { error: 'Invalid input data' };
  }

  if (id === parsed.data.parentId) {
    return { error: 'Category cannot be its own parent' };
  }

  try {
    const category = await prisma.category.update({
      where: { id },
      data: parsed.data
    });

    await logAudit({
      action: 'UPDATE_CATEGORY',
      entity: 'Category',
      entityId: category.id.toString(),
      metadata: { name: category.name, changes: parsed.data }
    });

    revalidatePath('/categories');
    return { data: category };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { error: 'Category name already exists' };
      }
    }
    return { error: 'Failed to update category' };
  }
}

export async function deleteCategory(id: number) {
  await requirePermission('categories:delete');

  try {
    const category = await prisma.category.findUnique({
      where: { id }
    });

    if (!category) {
      return { error: 'Category not found' };
    }

    const partsCount = await prisma.part.count({ where: { categoryId: id } });
    const childrenCount = await prisma.category.count({ where: { parentId: id } });

    if (partsCount > 0) {
      return { error: 'Cannot delete category because parts are still associated with it.' };
    }
    if (childrenCount > 0) {
      return { error: 'Cannot delete category because it has sub-categories.' };
    }

    await prisma.category.delete({ where: { id } });

    await logAudit({
      action: 'DELETE_CATEGORY',
      entity: 'Category',
      entityId: id.toString(),
      metadata: { name: category.name }
    });

    revalidatePath('/categories');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to delete category' };
  }
}
