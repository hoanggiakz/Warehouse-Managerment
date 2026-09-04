'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { ExportReceiptSchema } from '@/lib/validations/export-receipt';
import { requirePermission } from '@/lib/rbac/authorize';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { logAudit } from '@/lib/audit-logger';
import { ExportReceiptStatus, InventoryStatus, Prisma } from '@prisma/client';

function calculateStatus(quantity: number, minStock: number, maxStock: number): InventoryStatus {
  if (quantity === 0) return 'OUT';
  if (quantity < minStock) return 'LOW';
  if (quantity > maxStock) return 'OVER';
  return 'NORMAL';
}

async function generateReceiptNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const count = await prisma.exportReceipt.count({
    where: {
      createdAt: {
        gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
        lt: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`),
      },
    },
  });

  const padded = String(count + 1).padStart(6, '0');
  return `EXP-${currentYear}-${padded}`;
}

type ExportDetailItem = {
  partId: number;
  quantity: number;
  unitPrice: Prisma.Decimal;
  totalPrice: Prisma.Decimal;
  locationPicked: string | null;
};

export async function getExportReceipts(
  page: number = 1,
  limit: number = 20,
  search: string = '',
  status: string = '',
  warehouseId: string = ''
) {
  await requirePermission(PERMISSIONS.EXPORTS_VIEW);

  const skip = (page - 1) * limit;
  const where: Prisma.ExportReceiptWhereInput = {};

  if (search) {
    where.OR = [
      { receiptNumber: { contains: search, mode: 'insensitive' } },
      { requestDepartment: { contains: search, mode: 'insensitive' } },
      { reason: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (status && status !== 'ALL') {
    where.status = status as ExportReceiptStatus;
  }

  if (warehouseId && warehouseId !== 'ALL') {
    where.warehouseId = Number(warehouseId);
  }

  const [data, total] = await Promise.all([
    prisma.exportReceipt.findMany({
      where,
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        creator: { select: { id: true, fullName: true, username: true } },
        approver: { select: { id: true, fullName: true, username: true } },
        _count: { select: { details: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.exportReceipt.count({ where }),
  ]);

  return {
    data,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getExportReceiptById(id: number) {
  await requirePermission(PERMISSIONS.EXPORTS_VIEW);

  return prisma.exportReceipt.findUnique({
    where: { id },
    include: {
      warehouse: true,
      creator: true,
      approver: true,
      details: {
        include: {
          part: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  });
}

export async function getWarehouseStockForExport(warehouseId: number) {
  await requirePermission(PERMISSIONS.EXPORTS_VIEW);

  const inventories = await prisma.inventory.findMany({
    where: { warehouseId },
    select: {
      partId: true,
      quantity: true,
      location: true,
      status: true,
    },
  });

  const stockMap: Record<number, { quantity: number; location: string | null; status: InventoryStatus }> = {};
  for (const inv of inventories) {
    stockMap[inv.partId] = {
      quantity: inv.quantity,
      location: inv.location,
      status: inv.status,
    };
  }
  return stockMap;
}

export async function createExportReceipt(data: unknown) {
  const session = await requirePermission(PERMISSIONS.EXPORTS_CREATE);

  const parsed = ExportReceiptSchema.safeParse(data);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      error: firstIssue?.message || 'Dữ liệu không hợp lệ',
      issues: parsed.error.issues,
    };
  }

  try {
    const { warehouseId, requestDepartment, reason, exportDate, details } = parsed.data;

    // Validate warehouse existence and active status (BR-21)
    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) {
      return { error: 'Kho xuất hàng không tồn tại.' };
    }
    if (warehouse.status !== 'ACTIVE') {
      return { error: 'Không thể tạo phiếu xuất từ kho đang không hoạt động.' };
    }

    // Server-side financial calculations using Prisma.Decimal (BR-27, BR-28)
    let totalAmount = new Prisma.Decimal(0);
    const detailData: ExportDetailItem[] = [];

    for (const d of details) {
      if (d.quantity <= 0) {
        return { error: 'Số lượng xuất phải lớn hơn 0.' };
      }

      const part = await prisma.part.findUnique({ where: { id: d.partId } });
      if (!part) {
        return { error: `Phụ tùng ID ${d.partId} không tồn tại.` };
      }

      const unitPrice = new Prisma.Decimal(d.unitPrice ?? part.salePrice);
      const totalPrice = new Prisma.Decimal(d.quantity).mul(unitPrice);
      totalAmount = totalAmount.add(totalPrice);

      detailData.push({
        partId: d.partId,
        quantity: d.quantity,
        unitPrice,
        totalPrice,
        locationPicked: d.locationPicked || null,
      });
    }

    const receiptNumber = await generateReceiptNumber();

    const receipt = await prisma.exportReceipt.create({
      data: {
        receiptNumber,
        warehouseId,
        userId: session.id,
        requestDepartment: requestDepartment || null,
        reason: reason || null,
        exportDate: exportDate ? new Date(exportDate) : new Date(),
        totalAmount,
        status: 'DRAFT',
        details: {
          create: detailData,
        },
      },
    });

    await logAudit({
      action: 'EXPORT_DRAFT_CREATED',
      entity: 'ExportReceipt',
      entityId: receipt.id.toString(),
      userId: session.id,
      metadata: {
        receiptNumber: receipt.receiptNumber,
        warehouseId,
        itemCount: details.length,
        totalAmount: totalAmount.toNumber(),
      },
    });

    revalidatePath('/exports');
    return { success: true, data: receipt };
  } catch (error: any) {
    return { error: error.message || 'Không thể tạo phiếu xuất nháp.' };
  }
}

export const createExportDraft = createExportReceipt;

export async function updateExportReceipt(id: number, data: unknown) {
  const session = await requirePermission(PERMISSIONS.EXPORTS_CREATE);

  const existing = await prisma.exportReceipt.findUnique({ where: { id } });
  if (!existing) {
    return { error: 'Phiếu xuất không tồn tại.' };
  }

  // Business Rules: Only DRAFT can be modified (BR-22, BR-23, BR-24, BR-25)
  if (existing.status === 'COMPLETED') {
    return { error: 'Không thể sửa phiếu xuất đã hoàn tất.' };
  }
  if (existing.status === 'CANCELLED') {
    return { error: 'Không thể sửa phiếu xuất đã bị hủy.' };
  }
  if (existing.status !== 'DRAFT') {
    return { error: 'Chỉ có thể chỉnh sửa phiếu xuất ở trạng thái DRAFT.' };
  }

  const parsed = ExportReceiptSchema.safeParse(data);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      error: firstIssue?.message || 'Dữ liệu không hợp lệ',
      issues: parsed.error.issues,
    };
  }

  try {
    const { warehouseId, requestDepartment, reason, exportDate, details } = parsed.data;

    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) {
      return { error: 'Kho xuất hàng không tồn tại.' };
    }
    if (warehouse.status !== 'ACTIVE') {
      return { error: 'Kho xuất hàng đang không hoạt động.' };
    }

    let totalAmount = new Prisma.Decimal(0);
    const detailData: ExportDetailItem[] = [];

    for (const d of details) {
      if (d.quantity <= 0) {
        return { error: 'Số lượng xuất phải lớn hơn 0.' };
      }

      const part = await prisma.part.findUnique({ where: { id: d.partId } });
      if (!part) {
        return { error: `Phụ tùng ID ${d.partId} không tồn tại.` };
      }

      const unitPrice = new Prisma.Decimal(d.unitPrice ?? part.salePrice);
      const totalPrice = new Prisma.Decimal(d.quantity).mul(unitPrice);
      totalAmount = totalAmount.add(totalPrice);

      detailData.push({
        partId: d.partId,
        quantity: d.quantity,
        unitPrice,
        totalPrice,
        locationPicked: d.locationPicked || null,
      });
    }

    const receipt = await prisma.$transaction(async (tx) => {
      await tx.exportReceiptDetail.deleteMany({ where: { exportId: id } });

      return tx.exportReceipt.update({
        where: { id },
        data: {
          warehouseId,
          requestDepartment: requestDepartment || null,
          reason: reason || null,
          exportDate: exportDate ? new Date(exportDate) : new Date(),
          totalAmount,
          details: {
            create: detailData,
          },
        },
      });
    });

    await logAudit({
      action: 'EXPORT_UPDATED',
      entity: 'ExportReceipt',
      entityId: receipt.id.toString(),
      userId: session.id,
      metadata: {
        receiptNumber: receipt.receiptNumber,
        warehouseId,
        itemCount: details.length,
        totalAmount: totalAmount.toNumber(),
      },
    });

    revalidatePath('/exports');
    revalidatePath(`/exports/${id}`);
    return { success: true, data: receipt };
  } catch (error: any) {
    return { error: error.message || 'Không thể cập nhật phiếu xuất.' };
  }
}

export const updateExportDraft = updateExportReceipt;

export async function submitExportReceipt(id: number) {
  const session = await requirePermission(PERMISSIONS.EXPORTS_CREATE);

  try {
    const existing = await prisma.exportReceipt.findUnique({ where: { id } });
    if (!existing) {
      return { error: 'Phiếu xuất không tồn tại.' };
    }

    if (existing.status === 'COMPLETED') {
      return { error: 'Không thể nộp duyệt phiếu xuất đã hoàn tất.' };
    }
    if (existing.status === 'CANCELLED') {
      return { error: 'Không thể nộp duyệt phiếu xuất đã bị hủy.' };
    }
    if (existing.status !== 'DRAFT') {
      return { error: 'Chỉ có thể nộp duyệt phiếu xuất ở trạng thái DRAFT.' };
    }

    const receipt = await prisma.exportReceipt.update({
      where: { id },
      data: { status: 'PENDING' },
    });

    await logAudit({
      action: 'EXPORT_SUBMITTED',
      entity: 'ExportReceipt',
      entityId: id.toString(),
      userId: session.id,
      metadata: { receiptNumber: receipt.receiptNumber },
    });

    revalidatePath('/exports');
    revalidatePath(`/exports/${id}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Không thể nộp duyệt phiếu xuất.' };
  }
}

export async function cancelExportReceipt(id: number) {
  const session = await requirePermission(PERMISSIONS.EXPORTS_CANCEL);

  try {
    const existing = await prisma.exportReceipt.findUnique({ where: { id } });
    if (!existing) {
      return { error: 'Phiếu xuất không tồn tại.' };
    }

    // Business Rules: COMPLETED and CANCELLED cannot be cancelled (BR-22, BR-23)
    if (existing.status === 'COMPLETED') {
      return { error: 'Không thể hủy phiếu xuất đã hoàn tất.' };
    }
    if (existing.status === 'CANCELLED') {
      return { error: 'Phiếu xuất đã bị hủy từ trước.' };
    }

    const receipt = await prisma.exportReceipt.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await logAudit({
      action: 'EXPORT_CANCELLED',
      entity: 'ExportReceipt',
      entityId: id.toString(),
      userId: session.id,
      metadata: { receiptNumber: receipt.receiptNumber },
    });

    revalidatePath('/exports');
    revalidatePath(`/exports/${id}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Không thể hủy phiếu xuất.' };
  }
}

export async function completeExportReceipt(id: number) {
  const session = await requirePermission(PERMISSIONS.EXPORTS_COMPLETE);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Load export receipt with all details and warehouse
      const receipt = await tx.exportReceipt.findUnique({
        where: { id },
        include: {
          details: {
            include: {
              part: true,
            },
          },
          warehouse: true,
        },
      });

      if (!receipt) {
        throw new Error('Phiếu xuất không tồn tại.');
      }

      // 2. State validations (BR-22, BR-23)
      if (receipt.status === 'COMPLETED') {
        throw new Error('Không thể hoàn tất phiếu xuất đã hoàn tất.');
      }
      if (receipt.status === 'CANCELLED') {
        throw new Error('Không thể hoàn tất phiếu xuất đã bị hủy.');
      }
      if (receipt.status !== 'PENDING') {
        throw new Error('Chỉ có thể hoàn tất phiếu xuất ở trạng thái PENDING.');
      }

      // 4. Verify warehouse status === ACTIVE (BR-21)
      if (receipt.warehouse.status !== 'ACTIVE') {
        throw new Error('Kho đang không hoạt động.');
      }

      if (!receipt.details || receipt.details.length === 0) {
        throw new Error('Phiếu xuất phải có ít nhất một phụ tùng.');
      }

      let totalExportedQty = 0;
      const inventoryAuditRecords: any[] = [];

      // 5-9. Verify live stock and compute decrements
      for (const detail of receipt.details) {
        if (detail.quantity <= 0) {
          throw new Error('Số lượng xuất phải lớn hơn 0.');
        }

        // Live stock check inside transaction (BR-16)
        const existingInventory = await tx.inventory.findUnique({
          where: {
            partId_warehouseId: {
              partId: detail.partId,
              warehouseId: receipt.warehouseId,
            },
          },
        });

        const currentQuantity = existingInventory ? existingInventory.quantity : 0;

        // Insufficient inventory validation (BR-18, BR-19)
        if (currentQuantity < detail.quantity) {
          throw new Error(
            `Không đủ tồn kho để xuất phụ tùng "${detail.part.name}" (${detail.part.sku}). Tồn kho hiện có: ${currentQuantity}, Yêu cầu xuất: ${detail.quantity}.`
          );
        }

        const newQuantity = currentQuantity - detail.quantity;
        if (newQuantity < 0) {
          throw new Error('Không đủ tồn kho để xuất phụ tùng.');
        }

        const minStock = existingInventory?.minStock ?? detail.part.minStock;
        const maxStock = existingInventory?.maxStock ?? detail.part.maxStock;
        const newStatus = calculateStatus(newQuantity, minStock, maxStock);

        // 10. Update inventory atomically
        await tx.inventory.update({
          where: { id: existingInventory!.id },
          data: {
            quantity: newQuantity,
            status: newStatus,
          },
        });

        totalExportedQty += detail.quantity;
        inventoryAuditRecords.push({
          inventoryId: existingInventory!.id,
          partId: detail.partId,
          partSku: detail.part.sku,
          partName: detail.part.name,
          exportedQuantity: detail.quantity,
          oldQuantity: currentQuantity,
          newQuantity,
        });
      }

      // 11. Update warehouse occupancy atomically (BR-29)
      if (totalExportedQty > 0) {
        const newOccupancy = Math.max(0, receipt.warehouse.currentOccupancy - totalExportedQty);
        await tx.warehouse.update({
          where: { id: receipt.warehouseId },
          data: {
            currentOccupancy: newOccupancy,
          },
        });
      }

      // 12. Update receipt status to COMPLETED
      const updatedReceipt = await tx.exportReceipt.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          approvedBy: session.id,
        },
      });

      // 13. Write EXPORT_COMPLETED audit log inside the transaction (BR-30)
      await logAudit({
        action: 'EXPORT_COMPLETED',
        entity: 'ExportReceipt',
        entityId: id.toString(),
        userId: session.id,
        tx,
        metadata: {
          receiptNumber: receipt.receiptNumber,
          warehouseId: receipt.warehouseId,
          warehouseCode: receipt.warehouse.code,
          detailCount: receipt.details.length,
          totalExportedQty,
          totalAmount: receipt.totalAmount.toNumber(),
          items: inventoryAuditRecords,
        },
      });

      return updatedReceipt;
    });

    revalidatePath('/exports');
    revalidatePath(`/exports/${id}`);
    revalidatePath('/inventory');
    revalidatePath('/warehouses');

    return { success: true, data: result };
  } catch (error: any) {
    return { error: error.message || 'Không thể hoàn tất phiếu xuất hàng.' };
  }
}
