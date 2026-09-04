'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
  CreateQualityCheckSchema,
  UpdateQualityCheckSchema,
  AdjustQualityDispositionSchema,
} from '@/lib/validations/quality-check';
import { requirePermission } from '@/lib/rbac/authorize';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { logAudit } from '@/lib/audit-logger';
import {
  QualityCheckStatus,
  QualityCheckResult,
  QualityCheckSeverity,
  QualityCheckAction,
  InventoryStatus,
  Prisma,
} from '@prisma/client';

function calculateInventoryStatus(quantity: number, minStock: number, maxStock: number): InventoryStatus {
  if (quantity === 0) return 'OUT';
  if (quantity < minStock) return 'LOW';
  if (quantity > maxStock) return 'OVER';
  return 'NORMAL';
}

function deriveQualityCheckResult(quantityChecked: number, quantityPassed: number, quantityFailed: number): QualityCheckResult {
  if (quantityFailed === 0) {
    return 'PASSED';
  }
  if (quantityFailed === quantityChecked) {
    return 'FAILED';
  }
  return 'PARTIALLY_PASSED';
}

async function generateCheckNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const count = await prisma.qualityCheck.count({
    where: {
      createdAt: {
        gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
        lt: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`),
      },
    },
  });

  const padded = String(count + 1).padStart(6, '0');
  return `QC-${currentYear}-${padded}`;
}

export async function getQualityChecks(
  page: number = 1,
  limit: number = 20,
  search: string = '',
  status: string = '',
  result: string = '',
  severity: string = '',
  warehouseId: string = ''
) {
  await requirePermission(PERMISSIONS.QUALITY_CHECK_VIEW);

  const skip = (page - 1) * limit;
  const where: Prisma.QualityCheckWhereInput = {};

  if (search) {
    where.OR = [
      { checkNumber: { contains: search, mode: 'insensitive' } },
      { failureType: { contains: search, mode: 'insensitive' } },
      { failureDescription: { contains: search, mode: 'insensitive' } },
      { part: { name: { contains: search, mode: 'insensitive' } } },
      { part: { sku: { contains: search, mode: 'insensitive' } } },
      { performer: { fullName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (status && status !== 'ALL') {
    where.status = status as QualityCheckStatus;
  }

  if (result && result !== 'ALL') {
    where.result = result as QualityCheckResult;
  }

  if (severity && severity !== 'ALL') {
    where.severity = severity as QualityCheckSeverity;
  }

  if (warehouseId && warehouseId !== 'ALL') {
    where.warehouseId = Number(warehouseId);
  }

  const [data, total] = await Promise.all([
    prisma.qualityCheck.findMany({
      where,
      include: {
        part: {
          select: {
            id: true,
            sku: true,
            name: true,
            unit: true,
            category: { select: { id: true, name: true } },
          },
        },
        warehouse: { select: { id: true, code: true, name: true } },
        performer: { select: { id: true, fullName: true, username: true } },
        importReceipt: { select: { id: true, receiptNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.qualityCheck.count({ where }),
  ]);

  return {
    data,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getQualityCheckById(id: number) {
  await requirePermission(PERMISSIONS.QUALITY_CHECK_VIEW);

  return prisma.qualityCheck.findUnique({
    where: { id },
    include: {
      part: {
        include: {
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
      },
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
      importReceipt: {
        select: {
          id: true,
          receiptNumber: true,
          importDate: true,
          supplier: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function createQualityCheck(input: unknown) {
  const session = await requirePermission(PERMISSIONS.QUALITY_CHECK_CREATE);

  const parsed = CreateQualityCheckSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Dữ liệu kiểm tra không hợp lệ.' };
  }

  const {
    partId,
    warehouseId,
    importId,
    checkDate,
    quantityChecked,
    quantityPassed,
    quantityFailed,
    failureType,
    failureDescription,
    severity,
    action,
  } = parsed.data;

  try {
    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) {
      return { error: 'Phụ tùng kiểm tra không tồn tại.' };
    }

    if (warehouseId) {
      const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
      if (!warehouse) {
        return { error: 'Kho kiểm tra không tồn tại.' };
      }
      if (warehouse.status !== 'ACTIVE') {
        return { error: `Kho "${warehouse.name}" đang không hoạt động (BR-38).` };
      }
    }

    const checkNumber = await generateCheckNumber();
    const result = deriveQualityCheckResult(quantityChecked, quantityPassed, quantityFailed);

    const qualityCheck = await prisma.qualityCheck.create({
      data: {
        checkNumber,
        partId,
        warehouseId: warehouseId || null,
        importId: importId || null,
        checkedBy: session.id,
        checkDate: checkDate ? new Date(checkDate) : new Date(),
        quantityChecked,
        quantityPassed,
        quantityFailed,
        failureType: quantityFailed > 0 ? failureType || null : null,
        failureDescription: quantityFailed > 0 ? failureDescription || null : null,
        severity: severity as QualityCheckSeverity,
        action: action as QualityCheckAction,
        result,
        status: 'DRAFT',
      },
    });

    await logAudit({
      action: 'QUALITY_CHECK_CREATED',
      entity: 'QualityCheck',
      entityId: qualityCheck.id.toString(),
      userId: session.id,
      metadata: {
        checkNumber: qualityCheck.checkNumber,
        partId,
        warehouseId,
        quantityChecked,
        quantityPassed,
        quantityFailed,
        result,
      },
    });

    revalidatePath('/quality-checks');
    return { success: true, data: qualityCheck };
  } catch (error: any) {
    return { error: error.message || 'Không thể tạo phiếu kiểm tra chất lượng.' };
  }
}

export async function updateQualityCheck(id: number, input: unknown) {
  const session = await requirePermission(PERMISSIONS.QUALITY_CHECK_UPDATE);

  const parsed = UpdateQualityCheckSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Dữ liệu cập nhật không hợp lệ.' };
  }

  try {
    const existing = await prisma.qualityCheck.findUnique({ where: { id } });
    if (!existing) {
      return { error: 'Phiếu kiểm tra chất lượng không tồn tại.' };
    }

    if (existing.status === 'COMPLETED') {
      return { error: 'Không thể sửa phiếu kiểm tra chất lượng đã hoàn tất (BR-41).' };
    }

    if (existing.status === 'CANCELLED') {
      return { error: 'Không thể sửa phiếu kiểm tra chất lượng đã bị hủy.' };
    }

    const {
      warehouseId,
      checkDate,
      quantityChecked,
      quantityPassed,
      quantityFailed,
      failureType,
      failureDescription,
      severity,
      action,
    } = parsed.data;

    const result = deriveQualityCheckResult(quantityChecked, quantityPassed, quantityFailed);

    const updated = await prisma.qualityCheck.update({
      where: { id },
      data: {
        warehouseId: warehouseId !== undefined ? warehouseId : existing.warehouseId,
        checkDate: checkDate ? new Date(checkDate) : existing.checkDate,
        quantityChecked,
        quantityPassed,
        quantityFailed,
        failureType: quantityFailed > 0 ? failureType || null : null,
        failureDescription: quantityFailed > 0 ? failureDescription || null : null,
        severity: severity ? (severity as QualityCheckSeverity) : existing.severity,
        action: action ? (action as QualityCheckAction) : existing.action,
        result,
      },
    });

    await logAudit({
      action: 'QUALITY_CHECK_UPDATED',
      entity: 'QualityCheck',
      entityId: id.toString(),
      userId: session.id,
      metadata: { checkNumber: updated.checkNumber, result },
    });

    revalidatePath('/quality-checks');
    revalidatePath(`/quality-checks/${id}`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message || 'Không thể cập nhật phiếu kiểm tra.' };
  }
}

export async function startQualityCheck(id: number) {
  const session = await requirePermission(PERMISSIONS.QUALITY_CHECK_START);

  try {
    const existing = await prisma.qualityCheck.findUnique({ where: { id } });
    if (!existing) {
      return { error: 'Phiếu kiểm tra chất lượng không tồn tại.' };
    }

    if (existing.status === 'COMPLETED') {
      return { error: 'Không thể bắt đầu phiếu đã hoàn tất.' };
    }

    if (existing.status === 'CANCELLED') {
      return { error: 'Không thể bắt đầu phiếu đã bị hủy.' };
    }

    const updated = await prisma.qualityCheck.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });

    await logAudit({
      action: 'QUALITY_CHECK_STARTED',
      entity: 'QualityCheck',
      entityId: id.toString(),
      userId: session.id,
      metadata: { checkNumber: updated.checkNumber },
    });

    revalidatePath('/quality-checks');
    revalidatePath(`/quality-checks/${id}`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message || 'Không thể bắt đầu kiểm tra chất lượng.' };
  }
}

export async function recordQualityInspection(id: number, input: unknown) {
  const session = await requirePermission(PERMISSIONS.QUALITY_CHECK_RECORD_DEFECT);

  const parsed = UpdateQualityCheckSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' };
  }

  try {
    const existing = await prisma.qualityCheck.findUnique({ where: { id } });
    if (!existing) {
      return { error: 'Phiếu kiểm tra chất lượng không tồn tại.' };
    }

    if (existing.status === 'COMPLETED') {
      return { error: 'Không thể ghi nhận kết quả cho phiếu đã hoàn tất.' };
    }

    if (existing.status === 'CANCELLED') {
      return { error: 'Không thể ghi nhận kết quả cho phiếu đã bị hủy.' };
    }

    const {
      quantityChecked,
      quantityPassed,
      quantityFailed,
      failureType,
      failureDescription,
      severity,
      action,
    } = parsed.data;

    const result = deriveQualityCheckResult(quantityChecked, quantityPassed, quantityFailed);

    const updated = await prisma.qualityCheck.update({
      where: { id },
      data: {
        quantityChecked,
        quantityPassed,
        quantityFailed,
        failureType: quantityFailed > 0 ? failureType || null : null,
        failureDescription: quantityFailed > 0 ? failureDescription || null : null,
        severity: severity ? (severity as QualityCheckSeverity) : existing.severity,
        action: action ? (action as QualityCheckAction) : existing.action,
        result,
        status: existing.status === 'DRAFT' ? 'IN_PROGRESS' : existing.status,
      },
    });

    await logAudit({
      action: 'QUALITY_CHECK_DEFECT_RECORDED',
      entity: 'QualityCheck',
      entityId: id.toString(),
      userId: session.id,
      metadata: {
        checkNumber: updated.checkNumber,
        quantityChecked,
        quantityPassed,
        quantityFailed,
        failureType,
        severity,
      },
    });

    revalidatePath('/quality-checks');
    revalidatePath(`/quality-checks/${id}`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message || 'Không thể ghi nhận kết quả kiểm tra.' };
  }
}

export async function completeQualityCheck(id: number) {
  const session = await requirePermission(PERMISSIONS.QUALITY_CHECK_COMPLETE);

  try {
    const existing = await prisma.qualityCheck.findUnique({ where: { id } });
    if (!existing) {
      return { error: 'Phiếu kiểm tra chất lượng không tồn tại.' };
    }

    // BR-41: Cannot complete completed or cancelled check
    if (existing.status === 'COMPLETED') {
      return { error: 'Phiếu kiểm tra chất lượng đã hoàn tất từ trước (BR-41).' };
    }

    if (existing.status === 'CANCELLED') {
      return { error: 'Không thể hoàn tất phiếu kiểm tra đã bị hủy (BR-41).' };
    }

    // BR-37: Must have valid inspection info recorded
    if (existing.quantityChecked <= 0) {
      return { error: 'Số lượng kiểm tra không hợp lệ (BR-37).' };
    }

    if (existing.quantityPassed + existing.quantityFailed !== existing.quantityChecked) {
      return { error: 'Số lượng đạt và lỗi không khớp với tổng số lượng kiểm tra (BR-32, BR-37).' };
    }

    if (existing.quantityFailed > 0 && (!existing.failureType || !existing.failureDescription)) {
      return { error: 'Cần phân loại lỗi và mô tả chi tiết khi có phụ tùng không đạt (BR-34, BR-37).' };
    }

    const result = deriveQualityCheckResult(
      existing.quantityChecked,
      existing.quantityPassed,
      existing.quantityFailed
    );

    // BR-39: Completing QC record MUST NOT silently alter inventory
    const updated = await prisma.qualityCheck.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        result,
      },
    });

    await logAudit({
      action: 'QUALITY_CHECK_COMPLETED',
      entity: 'QualityCheck',
      entityId: id.toString(),
      userId: session.id,
      metadata: {
        checkNumber: updated.checkNumber,
        result,
        quantityChecked: updated.quantityChecked,
        quantityPassed: updated.quantityPassed,
        quantityFailed: updated.quantityFailed,
      },
    });

    revalidatePath('/quality-checks');
    revalidatePath(`/quality-checks/${id}`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message || 'Không thể chốt hoàn tất kiểm tra chất lượng.' };
  }
}

export async function cancelQualityCheck(id: number) {
  const session = await requirePermission(PERMISSIONS.QUALITY_CHECK_CANCEL);

  try {
    const existing = await prisma.qualityCheck.findUnique({ where: { id } });
    if (!existing) {
      return { error: 'Phiếu kiểm tra chất lượng không tồn tại.' };
    }

    if (existing.status === 'COMPLETED') {
      return { error: 'Không thể hủy phiếu kiểm tra chất lượng đã hoàn tất (BR-41).' };
    }

    if (existing.status === 'CANCELLED') {
      return { error: 'Phiếu kiểm tra chất lượng đã bị hủy từ trước.' };
    }

    if (existing.isAdjusted) {
      return { error: 'Không thể hủy phiếu kiểm tra đã được xử lý cân bằng kho.' };
    }

    const updated = await prisma.qualityCheck.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await logAudit({
      action: 'QUALITY_CHECK_CANCELLED',
      entity: 'QualityCheck',
      entityId: id.toString(),
      userId: session.id,
      metadata: { checkNumber: updated.checkNumber },
    });

    revalidatePath('/quality-checks');
    revalidatePath(`/quality-checks/${id}`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message || 'Không thể hủy phiếu kiểm tra.' };
  }
}

export async function adjustQualityDisposition(input: unknown) {
  const session = await requirePermission(PERMISSIONS.QUALITY_CHECK_ADJUST);

  const parsed = AdjustQualityDispositionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Dữ liệu xử lý không hợp lệ.' };
  }

  const { qualityCheckId, action, dispositionNotes } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const qc = await tx.qualityCheck.findUnique({
        where: { id: qualityCheckId },
        include: { part: true, warehouse: true },
      });

      if (!qc) {
        throw new Error('Phiếu kiểm tra chất lượng không tồn tại.');
      }

      if (qc.status === 'CANCELLED') {
        throw new Error('Không thể xử lý tồn kho từ phiếu kiểm tra đã bị hủy.');
      }

      if (qc.status !== 'COMPLETED') {
        throw new Error('Chỉ có thể xử lý xử lý tồn kho cho phiếu kiểm tra đã chốt HOÀN TẤT (COMPLETED).');
      }

      if (qc.isAdjusted) {
        throw new Error('Phiếu kiểm tra chất lượng này đã được điều chỉnh tồn kho trước đó (BR-41).');
      }

      if (!qc.warehouseId) {
        throw new Error('Phiếu kiểm tra này không liên kết với kho hàng cụ thể, không thể điều chỉnh tồn kho.');
      }

      if (qc.warehouse && qc.warehouse.status !== 'ACTIVE') {
        throw new Error(`Kho "${qc.warehouse.name}" đang không hoạt động (BR-38).`);
      }

      const failedQty = qc.quantityFailed;

      if (failedQty > 0) {
        // Concurrency & Stock Validation: Read live inventory inside transaction
        const liveInventory = await tx.inventory.findUnique({
          where: {
            partId_warehouseId: {
              partId: qc.partId,
              warehouseId: qc.warehouseId,
            },
          },
        });

        if (!liveInventory) {
          throw new Error(`Không tìm thấy dữ liệu tồn kho của phụ tùng ${qc.part.sku} tại kho này.`);
        }

        // BR-40: Never allow negative inventory
        if (liveInventory.quantity < failedQty) {
          throw new Error(
            `Xung đột tồn kho: Tồn kho hiện tại (${liveInventory.quantity}) nhỏ hơn số lượng lỗi (${failedQty}). Không thể xử lý xuất loại bỏ/cách ly (BR-40).`
          );
        }

        const newQty = liveInventory.quantity - failedQty;
        const newStatus = calculateInventoryStatus(newQty, liveInventory.minStock, liveInventory.maxStock);

        // Update live inventory
        await tx.inventory.update({
          where: { id: liveInventory.id },
          data: {
            quantity: newQty,
            status: newStatus,
          },
        });

        // Update warehouse occupancy
        await tx.warehouse.update({
          where: { id: qc.warehouseId },
          data: {
            currentOccupancy: { decrement: failedQty },
          },
        });
      }

      const targetAction = action || qc.action;

      const updatedQC = await tx.qualityCheck.update({
        where: { id: qualityCheckId },
        data: {
          isAdjusted: true,
          adjustedAt: new Date(),
          adjustedBy: session.id,
          action: targetAction as QualityCheckAction,
          dispositionNotes: dispositionNotes || qc.dispositionNotes,
        },
      });

      // Write audit log inside transaction
      await logAudit({
        action: 'QUALITY_CHECK_ADJUSTED',
        entity: 'QualityCheck',
        entityId: qualityCheckId.toString(),
        userId: session.id,
        tx,
        metadata: {
          checkNumber: qc.checkNumber,
          partId: qc.partId,
          warehouseId: qc.warehouseId,
          quantityFailed: qc.quantityFailed,
          action: targetAction,
          dispositionNotes,
        },
      });

      return updatedQC;
    });

    revalidatePath('/quality-checks');
    revalidatePath(`/quality-checks/${qualityCheckId}`);
    revalidatePath('/inventory');
    revalidatePath('/warehouses');
    return { success: true, data: result };
  } catch (error: any) {
    return { error: error.message || 'Không thể điều chỉnh tồn kho từ phiếu kiểm tra.' };
  }
}
