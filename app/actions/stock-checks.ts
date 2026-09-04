'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
  CreateStockCheckSchema,
  UpdateStockCheckSchema,
  RecordStockCountSchema,
  AdjustStockCheckSchema,
} from '@/lib/validations/stock-check';
import { requirePermission } from '@/lib/rbac/authorize';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { logAudit } from '@/lib/audit-logger';
import { StockCheckStatus, StockCheckDetailStatus, InventoryStatus, Prisma } from '@prisma/client';

function calculateInventoryStatus(quantity: number, minStock: number, maxStock: number): InventoryStatus {
  if (quantity === 0) return 'OUT';
  if (quantity < minStock) return 'LOW';
  if (quantity > maxStock) return 'OVER';
  return 'NORMAL';
}

async function generateCheckNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const count = await prisma.stockCheck.count({
    where: {
      createdAt: {
        gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
        lt: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`),
      },
    },
  });

  const padded = String(count + 1).padStart(6, '0');
  return `CHK-${currentYear}-${padded}`;
}

export async function getStockChecks(
  page: number = 1,
  limit: number = 20,
  search: string = '',
  status: string = '',
  warehouseId: string = ''
) {
  await requirePermission(PERMISSIONS.STOCK_CHECK_VIEW);

  const skip = (page - 1) * limit;
  const where: Prisma.StockCheckWhereInput = {};

  if (search) {
    where.OR = [
      { checkNumber: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
      { warehouse: { name: { contains: search, mode: 'insensitive' } } },
      { warehouse: { code: { contains: search, mode: 'insensitive' } } },
      { performer: { fullName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (status && status !== 'ALL') {
    where.status = status as StockCheckStatus;
  }

  if (warehouseId && warehouseId !== 'ALL') {
    where.warehouseId = Number(warehouseId);
  }

  const [data, total] = await Promise.all([
    prisma.stockCheck.findMany({
      where,
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        performer: { select: { id: true, fullName: true, username: true } },
        details: {
          select: {
            id: true,
            systemQty: true,
            actualQty: true,
            difference: true,
            status: true,
            isAdjusted: true,
          },
        },
        _count: { select: { details: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.stockCheck.count({ where }),
  ]);

  return {
    data,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getStockCheckById(id: number) {
  await requirePermission(PERMISSIONS.STOCK_CHECK_VIEW);

  return prisma.stockCheck.findUnique({
    where: { id },
    include: {
      warehouse: true,
      performer: {
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          role: { select: { id: true, name: true } },
        },
      },
      details: {
        include: {
          part: {
            include: {
              category: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { id: 'asc' },
      },
    },
  });
}

export async function getWarehouseInventoryForStockCheck(warehouseId: number) {
  await requirePermission(PERMISSIONS.STOCK_CHECK_VIEW);

  const warehouse = await prisma.warehouse.findUnique({
    where: { id: warehouseId },
  });

  if (!warehouse) {
    return { error: 'Kho không tồn tại.' };
  }

  const inventories = await prisma.inventory.findMany({
    where: { warehouseId },
    include: {
      part: {
        include: {
          category: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { part: { sku: 'asc' } },
  });

  return { warehouse, inventories };
}

export async function createStockCheck(input: unknown) {
  const session = await requirePermission(PERMISSIONS.STOCK_CHECK_CREATE);

  const parsed = CreateStockCheckSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' };
  }

  const { warehouseId, checkDate, notes, partIds } = parsed.data;

  try {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });

    if (!warehouse) {
      return { error: 'Kho kiểm kê không tồn tại.' };
    }

    if (warehouse.status !== 'ACTIVE') {
      return { error: 'Kho đang không hoạt động, không thể tạo phiếu kiểm kê.' };
    }

    // Determine parts to check: either specific partIds or all active parts with warehouse inventory
    let targetPartIds: number[] = [];

    if (partIds && partIds.length > 0) {
      targetPartIds = Array.from(new Set(partIds));
    } else {
      // Find all parts in the warehouse inventory
      const existingInventories = await prisma.inventory.findMany({
        where: { warehouseId },
        select: { partId: true },
      });

      if (existingInventories.length > 0) {
        targetPartIds = existingInventories.map((i) => i.partId);
      } else {
        // If warehouse has no inventory rows yet, take all ACTIVE parts
        const activeParts = await prisma.part.findMany({
          where: { status: 'ACTIVE' },
          select: { id: true },
          take: 50,
        });
        targetPartIds = activeParts.map((p) => p.id);
      }
    }

    if (targetPartIds.length === 0) {
      return { error: 'Không tìm thấy phụ tùng nào để kiểm kê trong kho này.' };
    }

    // Capture snapshot of current live inventory quantities
    const inventories = await prisma.inventory.findMany({
      where: {
        warehouseId,
        partId: { in: targetPartIds },
      },
      select: { partId: true, quantity: true },
    });

    const inventoryMap = new Map<number, number>();
    for (const inv of inventories) {
      inventoryMap.set(inv.partId, inv.quantity);
    }

    const checkNumber = await generateCheckNumber();

    const detailsData = targetPartIds.map((partId) => {
      const systemQty = inventoryMap.get(partId) ?? 0;
      return {
        partId,
        systemQty,
        actualQty: null,
        difference: null,
        status: 'NOT_COUNTED' as StockCheckDetailStatus,
      };
    });

    const stockCheck = await prisma.stockCheck.create({
      data: {
        checkNumber,
        warehouseId,
        performedBy: session.id,
        checkDate: checkDate ? new Date(checkDate) : new Date(),
        status: 'DRAFT',
        notes: notes || null,
        details: {
          create: detailsData,
        },
      },
      include: {
        details: true,
      },
    });

    await logAudit({
      action: 'STOCK_CHECK_CREATED',
      entity: 'StockCheck',
      entityId: stockCheck.id.toString(),
      userId: session.id,
      metadata: {
        checkNumber: stockCheck.checkNumber,
        warehouseId,
        itemCount: detailsData.length,
      },
    });

    revalidatePath('/stock-checks');
    return { success: true, data: stockCheck };
  } catch (error: any) {
    return { error: error.message || 'Không thể tạo phiếu kiểm kê.' };
  }
}

export async function updateStockCheck(id: number, input: unknown) {
  const session = await requirePermission(PERMISSIONS.STOCK_CHECK_CREATE);

  const parsed = UpdateStockCheckSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' };
  }

  try {
    const existing = await prisma.stockCheck.findUnique({ where: { id } });
    if (!existing) {
      return { error: 'Phiếu kiểm kê không tồn tại.' };
    }

    if (existing.status !== 'DRAFT') {
      return { error: 'Chỉ có thể chỉnh sửa phiếu kiểm kê ở trạng thái DRAFT.' };
    }

    const updated = await prisma.stockCheck.update({
      where: { id },
      data: {
        checkDate: parsed.data.checkDate ? new Date(parsed.data.checkDate) : undefined,
        notes: parsed.data.notes !== undefined ? parsed.data.notes : undefined,
      },
    });

    await logAudit({
      action: 'STOCK_CHECK_UPDATED',
      entity: 'StockCheck',
      entityId: id.toString(),
      userId: session.id,
      metadata: { checkNumber: updated.checkNumber },
    });

    revalidatePath('/stock-checks');
    revalidatePath(`/stock-checks/${id}`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message || 'Không thể cập nhật phiếu kiểm kê.' };
  }
}

export async function startStockCheck(id: number) {
  const session = await requirePermission(PERMISSIONS.STOCK_CHECK_COUNT);

  try {
    const existing = await prisma.stockCheck.findUnique({ where: { id } });
    if (!existing) {
      return { error: 'Phiếu kiểm kê không tồn tại.' };
    }

    if (existing.status !== 'DRAFT') {
      return { error: 'Chỉ có thể bắt đầu kiểm kê khi phiếu ở trạng thái DRAFT.' };
    }

    const updated = await prisma.stockCheck.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });

    await logAudit({
      action: 'STOCK_CHECK_STARTED',
      entity: 'StockCheck',
      entityId: id.toString(),
      userId: session.id,
      metadata: { checkNumber: updated.checkNumber },
    });

    revalidatePath('/stock-checks');
    revalidatePath(`/stock-checks/${id}`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message || 'Không thể bắt đầu kiểm kê.' };
  }
}

export async function recordStockCount(input: unknown) {
  const session = await requirePermission(PERMISSIONS.STOCK_CHECK_COUNT);

  const parsed = RecordStockCountSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Dữ liệu đếm không hợp lệ.' };
  }

  const { stockCheckId, counts } = parsed.data;

  try {
    const stockCheck = await prisma.stockCheck.findUnique({
      where: { id: stockCheckId },
      include: { details: true },
    });

    if (!stockCheck) {
      return { error: 'Phiếu kiểm kê không tồn tại.' };
    }

    if (stockCheck.status === 'COMPLETED' || stockCheck.status === 'ADJUSTED') {
      return { error: 'Không thể ghi nhận số lượng cho phiếu kiểm kê đã hoàn tất hoặc đã điều chỉnh.' };
    }

    if (stockCheck.status === 'CANCELLED') {
      return { error: 'Không thể ghi nhận số lượng cho phiếu kiểm kê đã bị hủy.' };
    }

    // Execute atomic update for all counts
    await prisma.$transaction(async (tx) => {
      for (const count of counts) {
        const detail = stockCheck.details.find((d) => d.id === count.detailId);
        if (!detail) {
          throw new Error(`Chi tiết kiểm kê ID ${count.detailId} không thuộc phiếu này.`);
        }

        const actualQty = count.actualQty;
        const difference = actualQty - detail.systemQty;

        let status: StockCheckDetailStatus = 'MATCHED';
        if (difference > 0) {
          status = 'SURPLUS';
        } else if (difference < 0) {
          status = 'SHORTAGE';
        }

        await tx.stockCheckDetail.update({
          where: { id: count.detailId },
          data: {
            actualQty,
            difference,
            status,
            notes: count.notes !== undefined ? count.notes : detail.notes,
          },
        });
      }

      // If stock check was in DRAFT, promote to IN_PROGRESS upon recording counts
      if (stockCheck.status === 'DRAFT') {
        await tx.stockCheck.update({
          where: { id: stockCheckId },
          data: { status: 'IN_PROGRESS' },
        });
      }
    });

    await logAudit({
      action: 'STOCK_CHECK_COUNT_RECORDED',
      entity: 'StockCheck',
      entityId: stockCheckId.toString(),
      userId: session.id,
      metadata: {
        checkNumber: stockCheck.checkNumber,
        itemCount: counts.length,
      },
    });

    revalidatePath('/stock-checks');
    revalidatePath(`/stock-checks/${stockCheckId}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Không thể ghi nhận số lượng kiểm kê.' };
  }
}

export async function completeStockCheck(id: number) {
  const session = await requirePermission(PERMISSIONS.STOCK_CHECK_COMPLETE);

  try {
    const stockCheck = await prisma.stockCheck.findUnique({
      where: { id },
      include: { details: true },
    });

    if (!stockCheck) {
      return { error: 'Phiếu kiểm kê không tồn tại.' };
    }

    if (stockCheck.status === 'COMPLETED') {
      return { error: 'Phiếu kiểm kê đã ở trạng thái hoàn tất.' };
    }

    if (stockCheck.status === 'ADJUSTED') {
      return { error: 'Phiếu kiểm kê đã được điều chỉnh chênh lệch.' };
    }

    if (stockCheck.status === 'CANCELLED') {
      return { error: 'Không thể hoàn tất phiếu kiểm kê đã bị hủy.' };
    }

    if (stockCheck.details.length === 0) {
      return { error: 'Phiếu kiểm kê chưa có danh sách phụ tùng.' };
    }

    // Check if any items are still uncounted
    const uncountedCount = stockCheck.details.filter((d) => d.actualQty === null).length;
    if (uncountedCount > 0) {
      return {
        error: `Còn ${uncountedCount} phụ tùng chưa được đếm thực tế. Vui lòng hoàn tất kiểm đếm trước khi chốt phiếu.`,
      };
    }

    const updated = await prisma.stockCheck.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    await logAudit({
      action: 'STOCK_CHECK_COMPLETED',
      entity: 'StockCheck',
      entityId: id.toString(),
      userId: session.id,
      metadata: {
        checkNumber: stockCheck.checkNumber,
        totalItems: stockCheck.details.length,
      },
    });

    revalidatePath('/stock-checks');
    revalidatePath(`/stock-checks/${id}`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message || 'Không thể hoàn tất kiểm kê.' };
  }
}

export async function cancelStockCheck(id: number) {
  const session = await requirePermission(PERMISSIONS.STOCK_CHECK_CANCEL);

  try {
    const stockCheck = await prisma.stockCheck.findUnique({
      where: { id },
    });

    if (!stockCheck) {
      return { error: 'Phiếu kiểm kê không tồn tại.' };
    }

    if (stockCheck.status === 'COMPLETED') {
      return { error: 'Không thể hủy phiếu kiểm kê đã hoàn tất.' };
    }

    if (stockCheck.status === 'ADJUSTED') {
      return { error: 'Không thể hủy phiếu kiểm kê đã được điều chỉnh tồn kho.' };
    }

    if (stockCheck.status === 'CANCELLED') {
      return { error: 'Phiếu kiểm kê đã bị hủy từ trước.' };
    }

    const updated = await prisma.stockCheck.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await logAudit({
      action: 'STOCK_CHECK_CANCELLED',
      entity: 'StockCheck',
      entityId: id.toString(),
      userId: session.id,
      metadata: { checkNumber: stockCheck.checkNumber },
    });

    revalidatePath('/stock-checks');
    revalidatePath(`/stock-checks/${id}`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message || 'Không thể hủy phiếu kiểm kê.' };
  }
}

export async function adjustStockFromCheck(input: unknown) {
  const session = await requirePermission(PERMISSIONS.STOCK_CHECK_ADJUST);

  const parsed = AdjustStockCheckSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Dữ liệu điều chỉnh không hợp lệ.' };
  }

  const { stockCheckId, notes, itemIds } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const stockCheck = await tx.stockCheck.findUnique({
        where: { id: stockCheckId },
        include: {
          warehouse: true,
          details: {
            include: { part: true },
          },
        },
      });

      if (!stockCheck) {
        throw new Error('Phiếu kiểm kê không tồn tại.');
      }

      if (stockCheck.status === 'CANCELLED') {
        throw new Error('Không thể điều chỉnh tồn kho từ phiếu kiểm kê đã bị hủy.');
      }

      if (stockCheck.status === 'DRAFT') {
        throw new Error('Không thể điều chỉnh tồn kho khi phiếu đang ở trạng thái DRAFT.');
      }

      if (stockCheck.status === 'ADJUSTED') {
        throw new Error('Phiếu kiểm kê này đã được điều chỉnh tồn kho trước đó.');
      }

      if (stockCheck.warehouse.status !== 'ACTIVE') {
        throw new Error(`Kho "${stockCheck.warehouse.name}" đang không hoạt động.`);
      }

      // Filter details to adjust (items that have discrepancies and not already adjusted)
      let targetDetails = stockCheck.details.filter(
        (d) => d.actualQty !== null && d.difference !== 0 && !d.isAdjusted
      );

      if (itemIds && itemIds.length > 0) {
        targetDetails = targetDetails.filter((d) => itemIds.includes(d.id));
      }

      if (targetDetails.length === 0) {
        // If all items matched or already adjusted, just mark as ADJUSTED
        const updated = await tx.stockCheck.update({
          where: { id: stockCheckId },
          data: {
            status: 'ADJUSTED',
            notes: notes ? `${stockCheck.notes ? stockCheck.notes + '\n' : ''}[Điều chỉnh] ${notes}` : stockCheck.notes,
          },
        });
        return { count: 0, stockCheck: updated };
      }

      // Re-read live inventory inside the transaction to detect concurrency conflicts (BR-SC-11, BR-SC-12)
      for (const detail of targetDetails) {
        const liveInventory = await tx.inventory.findUnique({
          where: {
            partId_warehouseId: {
              partId: detail.partId,
              warehouseId: stockCheck.warehouseId,
            },
          },
        });

        const liveQty = liveInventory?.quantity ?? 0;

        // Concurrency Check: If live quantity changed since snapshot systemQty was taken
        if (liveQty !== detail.systemQty) {
          // Flag detail as CONFLICT
          await tx.stockCheckDetail.update({
            where: { id: detail.id },
            data: { status: 'CONFLICT' },
          });

          // Concurrency conflict detected: Abort transaction to prevent silent overwrite
          throw new Error(
            `XUNG ĐỘT TỒN KHO: Phụ tùng "${detail.part.sku} - ${detail.part.name}" có tồn kho hiện tại (${liveQty}) khác với số liệu ban đầu (${detail.systemQty}). Có giao dịch nhập/xuất đã phát sinh trong thời gian kiểm kê.`
          );
        }

        const newQty = detail.actualQty!;
        const minStock = liveInventory?.minStock ?? detail.part.minStock;
        const maxStock = liveInventory?.maxStock ?? detail.part.maxStock;
        const newStatus = calculateInventoryStatus(newQty, minStock, maxStock);

        if (liveInventory) {
          await tx.inventory.update({
            where: { id: liveInventory.id },
            data: {
              quantity: newQty,
              status: newStatus,
            },
          });
        } else {
          await tx.inventory.create({
            data: {
              partId: detail.partId,
              warehouseId: stockCheck.warehouseId,
              quantity: newQty,
              minStock,
              maxStock,
              status: newStatus,
            },
          });
        }

        // Mark detail as adjusted
        await tx.stockCheckDetail.update({
          where: { id: detail.id },
          data: {
            isAdjusted: true,
            adjustedAt: new Date(),
            adjustedQty: newQty,
          },
        });
      }

      const updatedCheck = await tx.stockCheck.update({
        where: { id: stockCheckId },
        data: {
          status: 'ADJUSTED',
          notes: notes ? `${stockCheck.notes ? stockCheck.notes + '\n' : ''}[Điều chỉnh] ${notes}` : stockCheck.notes,
        },
      });

      return { count: targetDetails.length, stockCheck: updatedCheck };
    });

    await logAudit({
      action: 'STOCK_CHECK_ADJUSTED',
      entity: 'StockCheck',
      entityId: stockCheckId.toString(),
      userId: session.id,
      metadata: {
        adjustedItemCount: result.count,
        notes: notes || null,
      },
    });

    revalidatePath('/stock-checks');
    revalidatePath(`/stock-checks/${stockCheckId}`);
    revalidatePath('/inventory');
    revalidatePath('/warehouses');
    return { success: true, count: result.count };
  } catch (error: any) {
    // If conflict was detected, log conflict audit
    if (error.message && error.message.includes('XUNG ĐỘT TỒN KHO')) {
      await logAudit({
        action: 'STOCK_CHECK_CONFLICT',
        entity: 'StockCheck',
        entityId: stockCheckId.toString(),
        userId: session.id,
        metadata: { reason: error.message },
      }).catch(() => {});
    }

    return { error: error.message || 'Không thể điều chỉnh tồn kho từ phiếu kiểm kê.' };
  }
}
