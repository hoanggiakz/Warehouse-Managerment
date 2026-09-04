'use server';

import { prisma } from '@/lib/prisma';
import { ImportReceiptSchema } from '@/lib/validations/import-receipt';
import { requirePermission } from '@/lib/rbac/authorize';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { logAudit } from '@/lib/audit-logger';
import { ImportReceiptStatus, InventoryStatus, Prisma } from '@prisma/client';
import { getSession } from '@/lib/auth/session';

function calculateStatus(quantity: number, minStock: number, maxStock: number): InventoryStatus {
  if (quantity === 0) return 'OUT';
  if (quantity < minStock) return 'LOW';
  if (quantity > maxStock) return 'OVER';
  return 'NORMAL';
}

async function generateReceiptNumber() {
  const currentYear = new Date().getFullYear();
  const count = await prisma.importReceipt.count({
    where: {
      createdAt: {
        gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
        lt: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`),
      }
    }
  });
  
  const padded = String(count + 1).padStart(6, '0');
  return `IMP-${currentYear}-${padded}`;
}

export async function getImportReceipts(
  page: number = 1, 
  limit: number = 20, 
  search: string = '', 
  status: string = '', 
  warehouseId: string = ''
) {
  await requirePermission(PERMISSIONS.IMPORTS_VIEW);

  const skip = (page - 1) * limit;

  const where: Prisma.ImportReceiptWhereInput = {};

  if (search) {
    where.OR = [
      { receiptNumber: { contains: search, mode: 'insensitive' } },
      { supplier: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (status && status !== 'ALL') {
    where.status = status as ImportReceiptStatus;
  }

  if (warehouseId && warehouseId !== 'ALL') {
    where.warehouseId = Number(warehouseId);
  }

  const [data, total] = await Promise.all([
    prisma.importReceipt.findMany({
      where,
      include: {
        supplier: { select: { name: true } },
        warehouse: { select: { name: true, code: true } },
        creator: { select: { fullName: true } },
        _count: { select: { details: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.importReceipt.count({ where }),
  ]);

  return {
    data,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getImportReceipt(id: number) {
  await requirePermission(PERMISSIONS.IMPORTS_VIEW);

  return prisma.importReceipt.findUnique({
    where: { id },
    include: {
      supplier: true,
      warehouse: true,
      creator: true,
      details: {
        include: {
          part: {
            include: {
              category: true
            }
          }
        }
      }
    }
  });
}

export async function createImportDraft(data: unknown) {
  const session = await requirePermission(PERMISSIONS.IMPORTS_CREATE);

  const parsed = ImportReceiptSchema.safeParse(data);
  
  if (!parsed.success) {
    return { error: 'Invalid data', issues: parsed.error.issues };
  }

  try {
    const { supplierId, warehouseId, poNumber, deliveryNote, notes, details } = parsed.data;

    // Verify warehouse is active
    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) return { error: 'Warehouse not found' };
    if (warehouse.status !== 'ACTIVE') return { error: 'Cannot import into an inactive warehouse' };

    let totalAmount = new Prisma.Decimal(0);
    const detailData = details.map(d => {
      const totalPrice = new Prisma.Decimal(d.quantity).mul(new Prisma.Decimal(d.unitPrice));
      totalAmount = totalAmount.add(totalPrice);
      return {
        partId: d.partId,
        quantity: d.quantity,
        unitPrice: new Prisma.Decimal(d.unitPrice),
        totalPrice,
        notes: d.notes,
      };
    });

    const receiptNumber = await generateReceiptNumber();

    const receipt = await prisma.importReceipt.create({
      data: {
        receiptNumber,
        supplierId,
        warehouseId,
        userId: session.id,
        poNumber,
        deliveryNote,
        notes,
        totalAmount,
        status: 'DRAFT',
        details: {
          create: detailData
        }
      },
    });

    await logAudit({
      action: 'IMPORT_DRAFT_CREATED', 
      entity: 'ImportReceipt', 
      entityId: receipt.id.toString(), 
      metadata: { receiptNumber: receipt.receiptNumber }
    });

    return { success: true, data: receipt };
  } catch (error: any) {
    return { error: error.message || 'Failed to create import draft' };
  }
}

export async function updateImportDraft(id: number, data: unknown) {
  const session = await requirePermission(PERMISSIONS.IMPORTS_CREATE);

  const existing = await prisma.importReceipt.findUnique({ where: { id } });
  if (!existing) return { error: 'Receipt not found' };
  if (existing.status !== 'DRAFT') return { error: 'Only DRAFT receipts can be edited' };

  const parsed = ImportReceiptSchema.safeParse(data);
  
  if (!parsed.success) {
    return { error: 'Invalid data', issues: parsed.error.issues };
  }

  try {
    const { supplierId, warehouseId, poNumber, deliveryNote, notes, details } = parsed.data;

    // Verify warehouse is active
    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) return { error: 'Warehouse not found' };
    if (warehouse.status !== 'ACTIVE') return { error: 'Cannot import into an inactive warehouse' };

    let totalAmount = new Prisma.Decimal(0);
    const detailData = details.map(d => {
      const totalPrice = new Prisma.Decimal(d.quantity).mul(new Prisma.Decimal(d.unitPrice));
      totalAmount = totalAmount.add(totalPrice);
      return {
        partId: d.partId,
        quantity: d.quantity,
        unitPrice: new Prisma.Decimal(d.unitPrice),
        totalPrice,
        notes: d.notes,
      };
    });

    const receipt = await prisma.$transaction(async (tx) => {
      await tx.importReceiptDetail.deleteMany({ where: { importId: id } });
      
      return tx.importReceipt.update({
        where: { id },
        data: {
          supplierId,
          warehouseId,
          poNumber,
          deliveryNote,
          notes,
          totalAmount,
          details: {
            create: detailData
          }
        },
      });
    });

    await logAudit({ action: 'IMPORT_UPDATED', entity: 'ImportReceipt', entityId: receipt.id.toString() });

    return { success: true, data: receipt };
  } catch (error: any) {
    return { error: error.message || 'Failed to update import draft' };
  }
}

export async function submitImportReceipt(id: number) {
  const session = await requirePermission(PERMISSIONS.IMPORTS_CREATE);

  try {
    const existing = await prisma.importReceipt.findUnique({ where: { id } });
    if (!existing) return { error: 'Receipt not found' };
    if (existing.status !== 'DRAFT') return { error: 'Only DRAFT receipts can be submitted' };

    const receipt = await prisma.importReceipt.update({
      where: { id },
      data: { status: 'PENDING' }
    });

    await logAudit({
      action: 'IMPORT_SUBMITTED',
      entity: 'ImportReceipt',
      entityId: id.toString(),
      metadata: { receiptNumber: receipt.receiptNumber }
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to submit receipt' };
  }
}

export async function cancelImportReceipt(id: number) {
  const session = await requirePermission(PERMISSIONS.IMPORTS_CANCEL);

  try {
    const existing = await prisma.importReceipt.findUnique({ where: { id } });
    if (!existing) return { error: 'Receipt not found' };
    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      return { error: 'Receipt cannot be cancelled from its current status' };
    }

    const receipt = await prisma.importReceipt.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    await logAudit({
      action: 'IMPORT_CANCELLED',
      entity: 'ImportReceipt',
      entityId: id.toString(),
      metadata: { receiptNumber: receipt.receiptNumber }
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to cancel receipt' };
  }
}

export async function completeImportReceipt(id: number) {
  const session = await requirePermission(PERMISSIONS.IMPORTS_COMPLETE);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const receipt = await tx.importReceipt.findUnique({
        where: { id },
        include: { details: true, supplier: true, warehouse: true }
      });

      if (!receipt) throw new Error('Receipt not found');
      if (receipt.status !== 'PENDING') throw new Error('Only PENDING receipts can be completed');
      if (receipt.warehouse.status !== 'ACTIVE') throw new Error('Warehouse is not ACTIVE');

      let totalAddedQty = 0;

      // Process each detail line
      for (const detail of receipt.details) {
        const part = await tx.part.findUnique({ where: { id: detail.partId } });
        if (!part) throw new Error(`Part ${detail.partId} not found`);

        const existingInventory = await tx.inventory.findUnique({
          where: {
            partId_warehouseId: {
              partId: detail.partId,
              warehouseId: receipt.warehouseId
            }
          }
        });

        const newQuantity = (existingInventory?.quantity || 0) + detail.quantity;
        const status = calculateStatus(
          newQuantity,
          existingInventory?.minStock || part.minStock,
          existingInventory?.maxStock || part.maxStock
        );

        if (existingInventory) {
          await tx.inventory.update({
            where: { id: existingInventory.id },
            data: { quantity: newQuantity, status }
          });
        } else {
          await tx.inventory.create({
            data: {
              partId: detail.partId,
              warehouseId: receipt.warehouseId,
              quantity: newQuantity,
              minStock: part.minStock,
              maxStock: part.maxStock,
              status
            }
          });
        }
        totalAddedQty += detail.quantity;
      }

      // Update Warehouse Occupancy
      if (totalAddedQty > 0) {
        await tx.warehouse.update({
          where: { id: receipt.warehouseId },
          data: {
            currentOccupancy: { increment: totalAddedQty }
          }
        });
      }

      // Complete Receipt
      const updatedReceipt = await tx.importReceipt.update({
        where: { id },
        data: { status: 'COMPLETED' }
      });

      await logAudit({
        action: 'IMPORT_COMPLETED',
        entity: 'ImportReceipt',
        entityId: id.toString(),
        metadata: {
          receiptNumber: receipt.receiptNumber,
          warehouse: receipt.warehouse.code,
          numberOfItems: receipt.details.length,
          totalAmount: receipt.totalAmount.toNumber()
        }
      });

      return updatedReceipt;
    });

    return { success: true, data: result };
  } catch (error: any) {
    return { error: error.message || 'Failed to complete import receipt' };
  }
}
