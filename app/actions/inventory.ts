'use server';

import { prisma } from '@/lib/prisma';
import { InventorySchema, StockAdjustmentSchema } from '@/lib/validations/inventory';
import { requirePermission } from '@/lib/rbac/authorize';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { logAudit } from '@/lib/audit-logger';
import { InventoryStatus, Prisma } from '@prisma/client';

export async function getInventory(
  page: number = 1, 
  limit: number = 20, 
  search: string = '', 
  warehouseId: string = '', 
  status: string = ''
) {
  await requirePermission(PERMISSIONS.INVENTORY_VIEW);

  const skip = (page - 1) * limit;

  const where: Prisma.InventoryWhereInput = {
    ...(search && {
      part: {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ]
      }
    }),
    ...(warehouseId && warehouseId !== 'ALL' && {
      warehouseId: parseInt(warehouseId, 10),
    }),
    ...(status && status !== 'ALL' && {
      status: status as InventoryStatus,
    }),
  };

  const [data, total] = await Promise.all([
    prisma.inventory.findMany({
      where,
      skip,
      take: limit,
      orderBy: { lastUpdated: 'desc' },
      include: {
        part: {
          include: { category: true, supplier: true }
        },
        warehouse: true,
      },
    }),
    prisma.inventory.count({ where }),
  ]);

  return {
    data,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

function calculateStatus(quantity: number, minStock: number, maxStock: number): InventoryStatus {
  if (quantity === 0) return 'OUT';
  if (quantity < minStock) return 'LOW';
  if (quantity > maxStock) return 'OVER';
  return 'NORMAL';
}

export async function createInventory(data: unknown) {
  await requirePermission(PERMISSIONS.INVENTORY_CREATE);

  const parsed = InventorySchema.safeParse(data);
  
  if (!parsed.success) {
    return { error: 'Invalid data', issues: parsed.error.issues };
  }

  try {
    const { partId, warehouseId, quantity, minStock, maxStock, location } = parsed.data;

    // Verify warehouse is active
    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) return { error: 'Warehouse not found' };
    if (warehouse.status !== 'ACTIVE') return { error: 'Cannot add inventory to an inactive warehouse' };

    // Check unique constraint
    const existing = await prisma.inventory.findUnique({
      where: {
        partId_warehouseId: { partId, warehouseId }
      }
    });

    if (existing) {
      return { error: 'Inventory record already exists for this part in this warehouse' };
    }

    const status = calculateStatus(quantity, minStock, maxStock);

    const result = await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.create({
        data: {
          partId,
          warehouseId,
          quantity,
          minStock,
          maxStock,
          location,
          status,
        },
      });

      if (quantity > 0) {
        await tx.warehouse.update({
          where: { id: warehouseId },
          data: {
            currentOccupancy: { increment: quantity }
          }
        });
      }

      return inventory;
    });

    await logAudit({
      action: 'INVENTORY_CREATED',
      entity: 'Inventory',
      entityId: result.id.toString(),
      metadata: { partId, warehouseId, quantity }
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to create inventory:', error);
    return { error: 'Failed to create inventory' };
  }
}

export async function adjustStock(data: unknown) {
  await requirePermission(PERMISSIONS.INVENTORY_ADJUST);

  const parsed = StockAdjustmentSchema.safeParse(data);
  
  if (!parsed.success) {
    return { error: 'Invalid adjustment data', issues: parsed.error.issues };
  }

  const { inventoryId, adjustmentQuantity, reason } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: { id: inventoryId },
        include: { warehouse: true }
      });

      if (!inventory) {
        throw new Error('Inventory not found');
      }

      if (inventory.warehouse.status !== 'ACTIVE') {
        throw new Error(`Cannot adjust stock in an ${inventory.warehouse.status.toLowerCase()} warehouse`);
      }

      const newQuantity = inventory.quantity + adjustmentQuantity;

      if (newQuantity < 0) {
        throw new Error('Insufficient stock: quantity cannot fall below 0');
      }

      const newStatus = calculateStatus(newQuantity, inventory.minStock, inventory.maxStock);

      const updatedInventory = await tx.inventory.update({
        where: { id: inventoryId },
        data: {
          quantity: newQuantity,
          status: newStatus,
        }
      });

      await tx.warehouse.update({
        where: { id: inventory.warehouseId },
        data: {
          currentOccupancy: { increment: adjustmentQuantity }
        }
      });

      return { oldQuantity: inventory.quantity, newQuantity, updatedInventory };
    });

    await logAudit({
      action: 'STOCK_ADJUSTED',
      entity: 'Inventory',
      entityId: inventoryId.toString(),
      metadata: { 
        adjustmentQuantity, 
        reason, 
        oldQuantity: result.oldQuantity, 
        newQuantity: result.newQuantity 
      }
    });

    return { success: true, data: result.updatedInventory };
  } catch (error: any) {
    console.error('Failed to adjust stock:', error);
    return { error: error.message || 'Failed to adjust stock' };
  }
}
