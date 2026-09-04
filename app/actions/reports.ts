'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac/authorize';
import { hasPermission, PERMISSIONS } from '@/lib/rbac/permissions';
import {
  ReportFilterSchema,
  ReportFilterInput,
  ReportFilterParams,
  resolveDateRange,
  safePercentage,
} from '@/lib/validations/reports';
import { format, subDays, startOfDay, addDays } from 'date-fns';

// Helper to check report access
function checkReportPermission(userPermissions: string[], specificPermission?: string) {
  if (!hasPermission(userPermissions, PERMISSIONS.REPORTS_VIEW)) {
    throw new Error('Forbidden: You do not have permission to view reports');
  }
  if (specificPermission && !hasPermission(userPermissions, specificPermission)) {
    throw new Error(`Forbidden: Missing required permission ${specificPermission}`);
  }
}

// ============================================================
// 1. DASHBOARD OVERVIEW METRICS
// ============================================================
export async function getDashboardMetrics() {
  const session = await requireAuth();
  if (!hasPermission(session.permissions, PERMISSIONS.DASHBOARD_VIEW)) {
    throw new Error('Forbidden: You do not have permission to view the dashboard');
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = addDays(todayStart, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Parallel fetch for dashboard operational metrics
  const [
    totalWarehouses,
    activeWarehouses,
    warehouseCapacities,
    totalParts,
    inventoryStats,
    todayImportsCount,
    monthlyImportsCount,
    monthlyImportDetails,
    todayExportsCount,
    monthlyExportsCount,
    monthlyExportDetails,
    pendingQCChecks,
    qcResults,
    qcDefectSum,
    pendingStockChecks,
    stockCheckDiscrepancies,
    adjustedStockChecks,
    recentAuditLogs,
    last7DaysImports,
    last7DaysExports,
  ] = await Promise.all([
    prisma.warehouse.count(),
    prisma.warehouse.count({ where: { status: 'ACTIVE' } }),
    prisma.warehouse.aggregate({
      _sum: { capacity: true, currentOccupancy: true },
    }),
    prisma.part.count({ where: { status: 'ACTIVE' } }),
    prisma.inventory.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { quantity: true },
    }),
    prisma.importReceipt.count({
      where: { importDate: { gte: todayStart, lt: todayEnd } },
    }),
    prisma.importReceipt.count({
      where: { importDate: { gte: monthStart, lt: monthEnd } },
    }),
    prisma.importReceiptDetail.aggregate({
      where: {
        receipt: {
          importDate: { gte: monthStart, lt: monthEnd },
          status: 'COMPLETED',
        },
      },
      _sum: { quantity: true, totalPrice: true },
    }),
    prisma.exportReceipt.count({
      where: { exportDate: { gte: todayStart, lt: todayEnd } },
    }),
    prisma.exportReceipt.count({
      where: { exportDate: { gte: monthStart, lt: monthEnd } },
    }),
    prisma.exportReceiptDetail.aggregate({
      where: {
        receipt: {
          exportDate: { gte: monthStart, lt: monthEnd },
          status: 'COMPLETED',
        },
      },
      _sum: { quantity: true, totalPrice: true },
    }),
    prisma.qualityCheck.count({
      where: { status: { in: ['DRAFT', 'IN_PROGRESS', 'PENDING'] } },
    }),
    prisma.qualityCheck.groupBy({
      by: ['result'],
      _count: { id: true },
    }),
    prisma.qualityCheck.aggregate({
      _sum: { quantityFailed: true, quantityChecked: true, quantityPassed: true },
    }),
    prisma.stockCheck.count({
      where: { status: { in: ['DRAFT', 'IN_PROGRESS'] } },
    }),
    prisma.stockCheckDetail.count({
      where: { status: { in: ['SHORTAGE', 'SURPLUS'] } },
    }),
    prisma.stockCheck.count({
      where: { status: 'ADJUSTED' },
    }),
    prisma.auditLog.findMany({
      take: 6,
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { fullName: true, username: true } },
      },
    }),
    prisma.importReceiptDetail.findMany({
      where: {
        receipt: {
          importDate: { gte: subDays(todayStart, 6) },
          status: 'COMPLETED',
        },
      },
      select: {
        quantity: true,
        receipt: { select: { importDate: true } },
      },
    }),
    prisma.exportReceiptDetail.findMany({
      where: {
        receipt: {
          exportDate: { gte: subDays(todayStart, 6) },
          status: 'COMPLETED',
        },
      },
      select: {
        quantity: true,
        receipt: { select: { exportDate: true } },
      },
    }),
  ]);

  // Inventory rollups
  let totalStockQuantity = 0;
  let normalStockCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let overStockCount = 0;

  for (const group of inventoryStats) {
    const qty = group._sum.quantity || 0;
    totalStockQuantity += qty;
    if (group.status === 'NORMAL') normalStockCount = group._count.id;
    if (group.status === 'LOW') lowStockCount = group._count.id;
    if (group.status === 'OUT') outOfStockCount = group._count.id;
    if (group.status === 'OVER') overStockCount = group._count.id;
  }

  // Quality check rollups
  let passedQCCount = 0;
  let failedQCCount = 0;
  let partiallyPassedQCCount = 0;

  for (const r of qcResults) {
    if (r.result === 'PASSED') passedQCCount = r._count.id;
    if (r.result === 'FAILED') failedQCCount = r._count.id;
    if (r.result === 'PARTIALLY_PASSED') partiallyPassedQCCount = r._count.id;
  }

  const totalEvaluatedQC = passedQCCount + failedQCCount + partiallyPassedQCCount;
  const qcPassRate = safePercentage(passedQCCount, totalEvaluatedQC);

  // Warehouse utilization
  const totalOccupancy = warehouseCapacities._sum.currentOccupancy || 0;
  const totalCapacity = warehouseCapacities._sum.capacity || 0;
  const overallUtilization = safePercentage(totalOccupancy, totalCapacity);

  // 7-day Operational Trend Construction
  const trendDays: { date: string; label: string; inbound: number; outbound: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = subDays(todayStart, i);
    const dateKey = format(d, 'yyyy-MM-dd');
    const label = format(d, 'EEE (MM/dd)');
    
    // Sum inbound
    const inQty = last7DaysImports
      .filter((item) => format(new Date(item.receipt.importDate), 'yyyy-MM-dd') === dateKey)
      .reduce((sum, item) => sum + item.quantity, 0);

    // Sum outbound
    const outQty = last7DaysExports
      .filter((item) => format(new Date(item.receipt.exportDate), 'yyyy-MM-dd') === dateKey)
      .reduce((sum, item) => sum + item.quantity, 0);

    trendDays.push({ date: dateKey, label, inbound: inQty, outbound: outQty });
  }

  return {
    inventory: {
      totalStockQuantity,
      totalParts,
      normalStockCount,
      lowStockCount,
      outOfStockCount,
      overStockCount,
    },
    warehouse: {
      totalWarehouses,
      activeWarehouses,
      totalOccupancy,
      totalCapacity,
      overallUtilization,
    },
    inbound: {
      todayImportsCount,
      monthlyImportsCount,
      monthlyImportQuantity: monthlyImportDetails._sum.quantity || 0,
      monthlyImportValue: Number(monthlyImportDetails._sum.totalPrice || 0),
    },
    outbound: {
      todayExportsCount,
      monthlyExportsCount,
      monthlyExportQuantity: monthlyExportDetails._sum.quantity || 0,
      monthlyExportValue: Number(monthlyExportDetails._sum.totalPrice || 0),
    },
    quality: {
      pendingQCChecks,
      passedQCCount,
      failedQCChecks: failedQCCount,
      defectiveQuantityTotal: qcDefectSum._sum.quantityFailed || 0,
      inspectedQuantityTotal: qcDefectSum._sum.quantityChecked || 0,
      qcPassRate,
    },
    stockCheck: {
      pendingStockChecks,
      discrepancyCount: stockCheckDiscrepancies,
      adjustedStockChecks,
    },
    trendDays,
    recentAuditLogs: recentAuditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      timestamp: log.timestamp.toISOString(),
      userName: log.user?.fullName || log.user?.username || 'System',
    })),
  };
}

// ============================================================
// 2. INVENTORY OVERVIEW REPORT (Report 1)
// ============================================================
export async function getInventoryOverviewReport(filters?: ReportFilterInput) {
  const session = await requireAuth();
  checkReportPermission(session.permissions, PERMISSIONS.REPORT_INVENTORY);

  const parsed = ReportFilterSchema.parse(filters || {});
  const whereInventory: any = {};

  if (parsed.warehouseId) {
    whereInventory.warehouseId = parsed.warehouseId;
  }
  if (parsed.categoryId) {
    whereInventory.part = { categoryId: parsed.categoryId };
  }

  const [
    totalParts,
    totalWarehouses,
    inventoryRecordsCount,
    inventoryStatusStats,
    warehousesData,
    categoriesData,
  ] = await Promise.all([
    prisma.part.count({ where: { status: 'ACTIVE' } }),
    prisma.warehouse.count(),
    prisma.inventory.count({ where: whereInventory }),
    prisma.inventory.groupBy({
      by: ['status'],
      where: whereInventory,
      _count: { id: true },
      _sum: { quantity: true },
    }),
    prisma.warehouse.findMany({
      where: parsed.warehouseId ? { id: parsed.warehouseId } : undefined,
      select: {
        id: true,
        code: true,
        name: true,
        capacity: true,
        currentOccupancy: true,
        status: true,
        inventories: {
          where: parsed.categoryId ? { part: { categoryId: parsed.categoryId } } : undefined,
          select: {
            quantity: true,
            status: true,
            partId: true,
          },
        },
      },
    }),
    prisma.category.findMany({
      where: parsed.categoryId ? { id: parsed.categoryId } : undefined,
      select: {
        id: true,
        name: true,
        parts: {
          select: {
            id: true,
            inventories: {
              where: parsed.warehouseId ? { warehouseId: parsed.warehouseId } : undefined,
              select: {
                quantity: true,
                status: true,
              },
            },
          },
        },
      },
    }),
  ]);

  let totalQuantity = 0;
  let normalCount = 0;
  let lowCount = 0;
  let outCount = 0;
  let overCount = 0;

  for (const s of inventoryStatusStats) {
    totalQuantity += s._sum.quantity || 0;
    if (s.status === 'NORMAL') normalCount = s._count.id;
    if (s.status === 'LOW') lowCount = s._count.id;
    if (s.status === 'OUT') outCount = s._count.id;
    if (s.status === 'OVER') overCount = s._count.id;
  }

  // Warehouse breakdown
  const warehouseBreakdown = warehousesData.map((wh) => {
    let whTotalQty = 0;
    let whLowStock = 0;
    let whOutOfStock = 0;
    let whOverStock = 0;

    for (const inv of wh.inventories) {
      whTotalQty += inv.quantity;
      if (inv.status === 'LOW') whLowStock++;
      if (inv.status === 'OUT') whOutOfStock++;
      if (inv.status === 'OVER') whOverStock++;
    }

    const utilization = safePercentage(wh.currentOccupancy, wh.capacity);

    return {
      warehouseId: wh.id,
      code: wh.code,
      name: wh.name,
      partCount: wh.inventories.length,
      totalQuantity: whTotalQty,
      lowStock: whLowStock,
      outOfStock: whOutOfStock,
      overStock: whOverStock,
      currentOccupancy: wh.currentOccupancy,
      capacity: wh.capacity,
      utilizationRate: utilization,
    };
  });

  // Category breakdown
  const categoryBreakdown = categoriesData.map((cat) => {
    let catTotalQty = 0;
    let catLowStock = 0;
    let catOutOfStock = 0;

    for (const p of cat.parts) {
      for (const inv of p.inventories) {
        catTotalQty += inv.quantity;
        if (inv.status === 'LOW') catLowStock++;
        if (inv.status === 'OUT') catOutOfStock++;
      }
    }

    return {
      categoryId: cat.id,
      name: cat.name,
      partCount: cat.parts.length,
      totalQuantity: catTotalQty,
      lowStock: catLowStock,
      outOfStock: catOutOfStock,
    };
  });

  return {
    totalParts,
    totalQuantity,
    totalWarehouses,
    inventoryRecordsCount,
    normalCount,
    lowCount,
    outCount,
    overCount,
    warehouseBreakdown,
    categoryBreakdown,
  };
}

// ============================================================
// 3. STOCK STATUS REPORT (Report 2)
// ============================================================
export async function getStockStatusReport(filters?: ReportFilterInput) {
  const session = await requireAuth();
  checkReportPermission(session.permissions, PERMISSIONS.REPORT_INVENTORY);

  const parsed = ReportFilterSchema.parse(filters || {});
  const where: any = {};

  if (parsed.warehouseId) where.warehouseId = parsed.warehouseId;
  if (parsed.status && ['NORMAL', 'LOW', 'OUT', 'OVER'].includes(parsed.status)) {
    where.status = parsed.status;
  }
  if (parsed.categoryId) {
    where.part = { categoryId: parsed.categoryId };
  }

  const [statusGroups, totalInventoryCount, drilldownItems] = await Promise.all([
    prisma.inventory.groupBy({
      by: ['status'],
      where: parsed.warehouseId ? { warehouseId: parsed.warehouseId } : undefined,
      _count: { id: true },
      _sum: { quantity: true },
    }),
    prisma.inventory.count({
      where: parsed.warehouseId ? { warehouseId: parsed.warehouseId } : undefined,
    }),
    prisma.inventory.findMany({
      where,
      take: 100,
      orderBy: [{ status: 'asc' }, { quantity: 'asc' }],
      include: {
        part: {
          select: {
            id: true,
            sku: true,
            name: true,
            minStock: true,
            maxStock: true,
            category: { select: { name: true } },
          },
        },
        warehouse: { select: { id: true, code: true, name: true } },
      },
    }),
  ]);

  const summary = {
    NORMAL: { count: 0, quantity: 0, percentage: 0 },
    LOW: { count: 0, quantity: 0, percentage: 0 },
    OUT: { count: 0, quantity: 0, percentage: 0 },
    OVER: { count: 0, quantity: 0, percentage: 0 },
  };

  for (const g of statusGroups) {
    const st = g.status as keyof typeof summary;
    if (summary[st]) {
      summary[st].count = g._count.id;
      summary[st].quantity = g._sum.quantity || 0;
      summary[st].percentage = safePercentage(g._count.id, totalInventoryCount);
    }
  }

  const items = drilldownItems.map((inv) => ({
    id: inv.id,
    partId: inv.partId,
    sku: inv.part.sku,
    partName: inv.part.name,
    categoryName: inv.part.category.name,
    warehouseId: inv.warehouse.id,
    warehouseCode: inv.warehouse.code,
    warehouseName: inv.warehouse.name,
    quantity: inv.quantity,
    minStock: inv.minStock ?? inv.part.minStock,
    maxStock: inv.maxStock ?? inv.part.maxStock,
    status: inv.status,
  }));

  return {
    totalRecords: totalInventoryCount,
    summary,
    items,
  };
}

// ============================================================
// 4. INVENTORY MOVEMENT REPORT (Report 3)
// ============================================================
export async function getInventoryMovementReport(filters?: ReportFilterInput) {
  const session = await requireAuth();
  checkReportPermission(session.permissions, PERMISSIONS.REPORT_INVENTORY);

  const parsed = ReportFilterSchema.parse(filters || {});
  const { startDate, endExclusiveDate, label } = resolveDateRange(
    parsed.datePreset,
    parsed.startDate,
    parsed.endDate
  );

  const importWhere: any = {
    receipt: {
      status: 'COMPLETED',
      importDate: { gte: startDate, lt: endExclusiveDate },
    },
  };
  const exportWhere: any = {
    receipt: {
      status: 'COMPLETED',
      exportDate: { gte: startDate, lt: endExclusiveDate },
    },
  };

  if (parsed.warehouseId) {
    importWhere.receipt.warehouseId = parsed.warehouseId;
    exportWhere.receipt.warehouseId = parsed.warehouseId;
  }
  if (parsed.partId) {
    importWhere.partId = parsed.partId;
    exportWhere.partId = parsed.partId;
  }
  if (parsed.categoryId) {
    importWhere.part = { categoryId: parsed.categoryId };
    exportWhere.part = { categoryId: parsed.categoryId };
  }

  const [importDetails, exportDetails] = await Promise.all([
    prisma.importReceiptDetail.findMany({
      where: importWhere,
      select: {
        quantity: true,
        receipt: { select: { importDate: true } },
      },
    }),
    prisma.exportReceiptDetail.findMany({
      where: exportWhere,
      select: {
        quantity: true,
        receipt: { select: { exportDate: true } },
      },
    }),
  ]);

  // Aggregate by interval
  const movementMap = new Map<string, { inbound: number; outbound: number; label: string }>();

  for (const item of importDetails) {
    const d = new Date(item.receipt.importDate);
    const key = format(d, parsed.groupBy === 'month' ? 'yyyy-MM' : 'yyyy-MM-dd');
    const lbl = parsed.groupBy === 'month' ? format(d, 'MMM yyyy') : format(d, 'MM/dd/yyyy');
    const current = movementMap.get(key) || { inbound: 0, outbound: 0, label: lbl };
    current.inbound += item.quantity;
    movementMap.set(key, current);
  }

  for (const item of exportDetails) {
    const d = new Date(item.receipt.exportDate);
    const key = format(d, parsed.groupBy === 'month' ? 'yyyy-MM' : 'yyyy-MM-dd');
    const lbl = parsed.groupBy === 'month' ? format(d, 'MMM yyyy') : format(d, 'MM/dd/yyyy');
    const current = movementMap.get(key) || { inbound: 0, outbound: 0, label: lbl };
    current.outbound += item.quantity;
    movementMap.set(key, current);
  }

  let totalInbound = 0;
  let totalOutbound = 0;

  const rows = Array.from(movementMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dateKey, val]) => {
      totalInbound += val.inbound;
      totalOutbound += val.outbound;
      const net = val.inbound - val.outbound;
      return {
        date: dateKey,
        label: val.label,
        inbound: val.inbound,
        outbound: val.outbound,
        netMovement: net,
      };
    });

  return {
    dateRangeLabel: label,
    totalInbound,
    totalOutbound,
    netMovement: totalInbound - totalOutbound,
    rows,
  };
}

// ============================================================
// 5. IMPORT ANALYTICS (Report 4)
// ============================================================
export async function getImportAnalyticsReport(filters?: ReportFilterInput) {
  const session = await requireAuth();
  checkReportPermission(session.permissions, PERMISSIONS.REPORT_IMPORT);

  const parsed = ReportFilterSchema.parse(filters || {});
  const { startDate, endExclusiveDate, label } = resolveDateRange(
    parsed.datePreset,
    parsed.startDate,
    parsed.endDate
  );

  const whereReceipt: any = {
    importDate: { gte: startDate, lt: endExclusiveDate },
  };
  if (parsed.warehouseId) whereReceipt.warehouseId = parsed.warehouseId;
  if (parsed.supplierId) whereReceipt.supplierId = parsed.supplierId;

  const [
    totalReceipts,
    statusCounts,
    completedAggregates,
    supplierAggregates,
  ] = await Promise.all([
    prisma.importReceipt.count({ where: whereReceipt }),
    prisma.importReceipt.groupBy({
      by: ['status'],
      where: whereReceipt,
      _count: { id: true },
    }),
    prisma.importReceiptDetail.aggregate({
      where: {
        receipt: { ...whereReceipt, status: 'COMPLETED' },
      },
      _sum: { quantity: true, totalPrice: true },
    }),
    prisma.importReceipt.groupBy({
      by: ['supplierId'],
      where: { ...whereReceipt, status: 'COMPLETED' },
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
  ]);

  let draftCount = 0;
  let pendingCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;

  for (const s of statusCounts) {
    if (s.status === 'DRAFT') draftCount = s._count.id;
    if (s.status === 'PENDING') pendingCount = s._count.id;
    if (s.status === 'COMPLETED') completedCount = s._count.id;
    if (s.status === 'CANCELLED') cancelledCount = s._count.id;
  }

  const totalImportedQuantity = completedAggregates._sum.quantity || 0;
  const totalImportValue = Number(completedAggregates._sum.totalPrice || 0);
  const averageReceiptValue = completedCount > 0 ? Number((totalImportValue / completedCount).toFixed(2)) : 0;

  // Fetch supplier names for top suppliers
  const supplierIds = supplierAggregates.map((s) => s.supplierId);
  const suppliers = await prisma.supplier.findMany({
    where: { id: { in: supplierIds } },
    select: { id: true, name: true },
  });
  const supplierNameMap = new Map(suppliers.map((s) => [s.id, s.name]));

  const topSuppliers = supplierAggregates
    .map((s) => ({
      supplierId: s.supplierId,
      supplierName: supplierNameMap.get(s.supplierId) || `Supplier #${s.supplierId}`,
      receiptCount: s._count.id,
      totalValue: Number(s._sum.totalAmount || 0),
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 10);

  return {
    dateRangeLabel: label,
    totalReceipts,
    draftCount,
    pendingCount,
    completedCount,
    cancelledCount,
    totalImportedQuantity,
    totalImportValue,
    averageReceiptValue,
    topSuppliers,
  };
}

// ============================================================
// 6. EXPORT ANALYTICS (Report 5)
// ============================================================
export async function getExportAnalyticsReport(filters?: ReportFilterInput) {
  const session = await requireAuth();
  checkReportPermission(session.permissions, PERMISSIONS.REPORT_EXPORT);

  const parsed = ReportFilterSchema.parse(filters || {});
  const { startDate, endExclusiveDate, label } = resolveDateRange(
    parsed.datePreset,
    parsed.startDate,
    parsed.endDate
  );

  const whereReceipt: any = {
    exportDate: { gte: startDate, lt: endExclusiveDate },
  };
  if (parsed.warehouseId) whereReceipt.warehouseId = parsed.warehouseId;

  const [
    totalReceipts,
    statusCounts,
    completedAggregates,
    topPartsAggregates,
  ] = await Promise.all([
    prisma.exportReceipt.count({ where: whereReceipt }),
    prisma.exportReceipt.groupBy({
      by: ['status'],
      where: whereReceipt,
      _count: { id: true },
    }),
    prisma.exportReceiptDetail.aggregate({
      where: {
        receipt: { ...whereReceipt, status: 'COMPLETED' },
      },
      _sum: { quantity: true, totalPrice: true },
    }),
    prisma.exportReceiptDetail.groupBy({
      by: ['partId'],
      where: {
        receipt: { ...whereReceipt, status: 'COMPLETED' },
      },
      _sum: { quantity: true },
      _count: { exportId: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    }),
  ]);

  let draftCount = 0;
  let pendingCount = 0;
  let approvedCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;

  for (const s of statusCounts) {
    if (s.status === 'DRAFT') draftCount = s._count.id;
    if (s.status === 'PENDING') pendingCount = s._count.id;
    if (s.status === 'APPROVED') approvedCount = s._count.id;
    if (s.status === 'COMPLETED') completedCount = s._count.id;
    if (s.status === 'CANCELLED') cancelledCount = s._count.id;
  }

  const totalExportedQuantity = completedAggregates._sum.quantity || 0;
  const totalExportValue = Number(completedAggregates._sum.totalPrice || 0);
  const averageReceiptValue = completedCount > 0 ? Number((totalExportValue / completedCount).toFixed(2)) : 0;

  // Fetch part details
  const partIds = topPartsAggregates.map((p) => p.partId);
  const parts = await prisma.part.findMany({
    where: { id: { in: partIds } },
    select: { id: true, sku: true, name: true },
  });
  const partMap = new Map(parts.map((p) => [p.id, p]));

  const topExportedParts = topPartsAggregates.map((p) => {
    const meta = partMap.get(p.partId);
    return {
      partId: p.partId,
      sku: meta?.sku || 'UNKNOWN',
      partName: meta?.name || 'Unknown Part',
      quantity: p._sum.quantity || 0,
      receiptCount: p._count.exportId,
    };
  });

  return {
    dateRangeLabel: label,
    totalReceipts,
    draftCount,
    pendingCount,
    approvedCount,
    completedCount,
    cancelledCount,
    totalExportedQuantity,
    totalExportValue,
    averageReceiptValue,
    topExportedParts,
  };
}

// ============================================================
// 7. STOCK CHECK ANALYTICS (Report 6)
// ============================================================
export async function getStockCheckAnalyticsReport(filters?: ReportFilterInput) {
  const session = await requireAuth();
  checkReportPermission(session.permissions, PERMISSIONS.REPORT_STOCK_CHECK);

  const parsed = ReportFilterSchema.parse(filters || {});
  const { startDate, endExclusiveDate, label } = resolveDateRange(
    parsed.datePreset,
    parsed.startDate,
    parsed.endDate
  );

  const whereCheck: any = {
    checkDate: { gte: startDate, lt: endExclusiveDate },
  };
  if (parsed.warehouseId) whereCheck.warehouseId = parsed.warehouseId;

  const [
    totalChecks,
    statusCounts,
    detailStatusCounts,
    detailsAggregates,
    adjustedCount,
    discrepancyDetails,
  ] = await Promise.all([
    prisma.stockCheck.count({ where: whereCheck }),
    prisma.stockCheck.groupBy({
      by: ['status'],
      where: whereCheck,
      _count: { id: true },
    }),
    prisma.stockCheckDetail.groupBy({
      by: ['status'],
      where: { stockCheck: whereCheck },
      _count: { id: true },
    }),
    prisma.stockCheckDetail.aggregate({
      where: { stockCheck: whereCheck },
      _sum: { actualQty: true, systemQty: true, difference: true },
    }),
    prisma.stockCheckDetail.count({
      where: { stockCheck: whereCheck, isAdjusted: true },
    }),
    prisma.stockCheckDetail.findMany({
      where: {
        stockCheck: whereCheck,
        status: { in: ['SHORTAGE', 'SURPLUS', 'CONFLICT'] },
      },
      take: 20,
      orderBy: { difference: 'asc' },
      include: {
        part: { select: { sku: true, name: true } },
        stockCheck: { select: { checkNumber: true, warehouse: { select: { name: true } } } },
      },
    }),
  ]);

  let draftCount = 0;
  let inProgressCount = 0;
  let completedCount = 0;
  let adjustedChecksCount = 0;
  let cancelledCount = 0;

  for (const s of statusCounts) {
    if (s.status === 'DRAFT') draftCount = s._count.id;
    if (s.status === 'IN_PROGRESS') inProgressCount = s._count.id;
    if (s.status === 'COMPLETED') completedCount = s._count.id;
    if (s.status === 'ADJUSTED') adjustedChecksCount = s._count.id;
    if (s.status === 'CANCELLED') cancelledCount = s._count.id;
  }

  let matchedCount = 0;
  let shortageCount = 0;
  let surplusCount = 0;
  let conflictCount = 0;
  let notCountedCount = 0;

  for (const ds of detailStatusCounts) {
    if (ds.status === 'MATCHED') matchedCount = ds._count.id;
    if (ds.status === 'SHORTAGE') shortageCount = ds._count.id;
    if (ds.status === 'SURPLUS') surplusCount = ds._count.id;
    if (ds.status === 'CONFLICT') conflictCount = ds._count.id;
    if (ds.status === 'NOT_COUNTED') notCountedCount = ds._count.id;
  }

  const discrepancyCount = shortageCount + surplusCount + conflictCount;
  const totalCountedQuantity = detailsAggregates._sum.actualQty || 0;
  const totalExpectedQuantity = detailsAggregates._sum.systemQty || 0;
  const totalVariance = detailsAggregates._sum.difference || 0;

  const discrepancyRanking = discrepancyDetails.map((d) => ({
    id: d.id,
    checkNumber: d.stockCheck.checkNumber,
    warehouseName: d.stockCheck.warehouse.name,
    sku: d.part.sku,
    partName: d.part.name,
    systemQty: d.systemQty,
    actualQty: d.actualQty,
    difference: d.difference,
    status: d.status,
    isAdjusted: d.isAdjusted,
  }));

  return {
    dateRangeLabel: label,
    totalChecks,
    draftCount,
    inProgressCount,
    completedCount,
    adjustedChecksCount,
    cancelledCount,
    totalCountedQuantity,
    totalExpectedQuantity,
    totalVariance,
    discrepancyCount,
    shortageCount,
    surplusCount,
    conflictCount,
    matchedCount,
    notCountedCount,
    adjustedDetailsCount: adjustedCount,
    discrepancyRanking,
  };
}

// ============================================================
// 8. QUALITY CONTROL ANALYTICS (Report 7)
// ============================================================
export async function getQualityControlAnalyticsReport(filters?: ReportFilterInput) {
  const session = await requireAuth();
  checkReportPermission(session.permissions, PERMISSIONS.REPORT_QUALITY);

  const parsed = ReportFilterSchema.parse(filters || {});
  const { startDate, endExclusiveDate, label } = resolveDateRange(
    parsed.datePreset,
    parsed.startDate,
    parsed.endDate
  );

  const whereQC: any = {
    checkDate: { gte: startDate, lt: endExclusiveDate },
  };
  if (parsed.warehouseId) whereQC.warehouseId = parsed.warehouseId;
  if (parsed.partId) whereQC.partId = parsed.partId;

  const [
    totalInspections,
    statusCounts,
    resultCounts,
    severityCounts,
    actionCounts,
    aggregates,
    defectivePartsAggregates,
  ] = await Promise.all([
    prisma.qualityCheck.count({ where: whereQC }),
    prisma.qualityCheck.groupBy({
      by: ['status'],
      where: whereQC,
      _count: { id: true },
    }),
    prisma.qualityCheck.groupBy({
      by: ['result'],
      where: whereQC,
      _count: { id: true },
    }),
    prisma.qualityCheck.groupBy({
      by: ['severity'],
      where: whereQC,
      _count: { id: true },
      _sum: { quantityFailed: true },
    }),
    prisma.qualityCheck.groupBy({
      by: ['action'],
      where: whereQC,
      _count: { id: true },
      _sum: { quantityFailed: true },
    }),
    prisma.qualityCheck.aggregate({
      where: whereQC,
      _sum: {
        quantityChecked: true,
        quantityPassed: true,
        quantityFailed: true,
      },
    }),
    prisma.qualityCheck.groupBy({
      by: ['partId'],
      where: { ...whereQC, quantityFailed: { gt: 0 } },
      _sum: { quantityChecked: true, quantityFailed: true },
      _count: { id: true },
      orderBy: { _sum: { quantityFailed: 'desc' } },
      take: 10,
    }),
  ]);

  let draftCount = 0;
  let inProgressCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;

  for (const s of statusCounts) {
    if (s.status === 'DRAFT') draftCount = s._count.id;
    if (s.status === 'IN_PROGRESS') inProgressCount = s._count.id;
    if (s.status === 'COMPLETED') completedCount = s._count.id;
    if (s.status === 'CANCELLED') cancelledCount = s._count.id;
  }

  let passedCount = 0;
  let partiallyPassedCount = 0;
  let failedCount = 0;

  for (const r of resultCounts) {
    if (r.result === 'PASSED') passedCount = r._count.id;
    if (r.result === 'PARTIALLY_PASSED') partiallyPassedCount = r._count.id;
    if (r.result === 'FAILED') failedCount = r._count.id;
  }

  const inspectedQuantity = aggregates._sum.quantityChecked || 0;
  const passedQuantity = aggregates._sum.quantityPassed || 0;
  const defectiveQuantity = aggregates._sum.quantityFailed || 0;

  const passRate = safePercentage(passedQuantity, inspectedQuantity);
  const defectRate = safePercentage(defectiveQuantity, inspectedQuantity);

  // Top defective parts details
  const partIds = defectivePartsAggregates.map((p) => p.partId);
  const parts = await prisma.part.findMany({
    where: { id: { in: partIds } },
    select: { id: true, sku: true, name: true },
  });
  const partMap = new Map(parts.map((p) => [p.id, p]));

  const topDefectiveParts = defectivePartsAggregates.map((p) => {
    const meta = partMap.get(p.partId);
    const inspected = p._sum.quantityChecked || 0;
    const defective = p._sum.quantityFailed || 0;
    return {
      partId: p.partId,
      sku: meta?.sku || 'UNKNOWN',
      partName: meta?.name || 'Unknown Part',
      inspectedQuantity: inspected,
      defectiveQuantity: defective,
      defectRate: safePercentage(defective, inspected),
    };
  });

  return {
    dateRangeLabel: label,
    totalInspections,
    draftCount,
    inProgressCount,
    completedCount,
    cancelledCount,
    passedCount,
    partiallyPassedCount,
    failedCount,
    inspectedQuantity,
    passedQuantity,
    defectiveQuantity,
    passRate,
    defectRate,
    severityDistribution: severityCounts.map((s) => ({
      severity: s.severity,
      count: s._count.id,
      failedQuantity: s._sum.quantityFailed || 0,
    })),
    dispositionDistribution: actionCounts.map((a) => ({
      action: a.action,
      count: a._count.id,
      failedQuantity: a._sum.quantityFailed || 0,
    })),
    topDefectiveParts,
  };
}

// ============================================================
// 9. SUPPLIER PERFORMANCE (Report 8)
// ============================================================
export async function getSupplierPerformanceReport(filters?: ReportFilterInput) {
  const session = await requireAuth();
  checkReportPermission(session.permissions, PERMISSIONS.REPORT_SUPPLIER);

  const parsed = ReportFilterSchema.parse(filters || {});
  const { startDate, endExclusiveDate, label } = resolveDateRange(
    parsed.datePreset,
    parsed.startDate,
    parsed.endDate
  );

  const suppliers = await prisma.supplier.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      rating: true,
      importReceipts: {
        where: {
          importDate: { gte: startDate, lt: endExclusiveDate },
          status: 'COMPLETED',
        },
        select: {
          id: true,
          totalAmount: true,
          details: { select: { quantity: true } },
          qualityChecks: {
            select: {
              quantityChecked: true,
              quantityFailed: true,
            },
          },
        },
      },
    },
  });

  const supplierMetrics = suppliers.map((s) => {
    let receiptCount = 0;
    let totalQuantity = 0;
    let totalValue = 0;
    let qcInspectedQty = 0;
    let qcDefectiveQty = 0;

    for (const receipt of s.importReceipts) {
      receiptCount++;
      totalValue += Number(receipt.totalAmount || 0);

      for (const d of receipt.details) {
        totalQuantity += d.quantity;
      }

      for (const qc of receipt.qualityChecks) {
        qcInspectedQty += qc.quantityChecked;
        qcDefectiveQty += qc.quantityFailed;
      }
    }

    const defectRate = safePercentage(qcDefectiveQty, qcInspectedQty);

    return {
      supplierId: s.id,
      name: s.name,
      rating: Number(s.rating),
      receiptCount,
      totalQuantity,
      totalValue: Number(totalValue.toFixed(2)),
      qcInspectedQty,
      qcDefectiveQty,
      defectRate,
    };
  });

  return {
    dateRangeLabel: label,
    suppliers: supplierMetrics.sort((a, b) => b.totalValue - a.totalValue),
  };
}

// ============================================================
// 10. PART PERFORMANCE (Report 9)
// ============================================================
export async function getPartPerformanceReport(filters?: ReportFilterInput) {
  const session = await requireAuth();
  checkReportPermission(session.permissions, PERMISSIONS.REPORT_PART);

  const parsed = ReportFilterSchema.parse(filters || {});
  const wherePart: any = { status: 'ACTIVE' };
  if (parsed.categoryId) wherePart.categoryId = parsed.categoryId;

  const parts = await prisma.part.findMany({
    where: wherePart,
    take: 100,
    select: {
      id: true,
      sku: true,
      name: true,
      category: { select: { name: true } },
      inventories: {
        select: { quantity: true },
      },
      importDetails: {
        where: { receipt: { status: 'COMPLETED' } },
        select: { quantity: true },
      },
      exportDetails: {
        where: { receipt: { status: 'COMPLETED' } },
        select: { quantity: true },
      },
      qualityChecks: {
        select: { quantityChecked: true, quantityFailed: true },
      },
      stockCheckDetails: {
        where: { status: { in: ['SHORTAGE', 'SURPLUS'] } },
        select: { id: true },
      },
    },
  });

  const partRows = parts.map((p) => {
    const currentStock = p.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
    const importedQty = p.importDetails.reduce((acc, d) => acc + d.quantity, 0);
    const exportedQty = p.exportDetails.reduce((acc, d) => acc + d.quantity, 0);

    let qcInspected = 0;
    let qcDefective = 0;
    for (const qc of p.qualityChecks) {
      qcInspected += qc.quantityChecked;
      qcDefective += qc.quantityFailed;
    }
    const defectRate = safePercentage(qcDefective, qcInspected);
    const totalMovement = importedQty + exportedQty;

    return {
      partId: p.id,
      sku: p.sku,
      name: p.name,
      categoryName: p.category.name,
      currentStock,
      importedQuantity: importedQty,
      exportedQuantity: exportedQty,
      totalMovement,
      qcChecksCount: p.qualityChecks.length,
      defectiveQuantity: qcDefective,
      defectRate,
      discrepancyCount: p.stockCheckDetails.length,
    };
  });

  return {
    parts: partRows.sort((a, b) => b.totalMovement - a.totalMovement),
  };
}

// ============================================================
// 11. WAREHOUSE PERFORMANCE (Report 10)
// ============================================================
export async function getWarehousePerformanceReport(filters?: ReportFilterInput) {
  const session = await requireAuth();
  checkReportPermission(session.permissions, PERMISSIONS.REPORT_WAREHOUSE);

  const warehouses = await prisma.warehouse.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      capacity: true,
      currentOccupancy: true,
      status: true,
      inventories: {
        select: { quantity: true, status: true, partId: true },
      },
      importReceipts: { select: { id: true } },
      exportReceipts: { select: { id: true } },
      stockChecks: { select: { id: true } },
      qualityChecks: { select: { id: true } },
    },
  });

  const warehouseStats = warehouses.map((wh) => {
    let totalInventory = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const inv of wh.inventories) {
      totalInventory += inv.quantity;
      if (inv.status === 'LOW') lowStockCount++;
      if (inv.status === 'OUT') outOfStockCount++;
    }

    const utilizationRate = safePercentage(wh.currentOccupancy, wh.capacity);

    return {
      warehouseId: wh.id,
      code: wh.code,
      name: wh.name,
      capacity: wh.capacity,
      occupancy: wh.currentOccupancy,
      utilizationRate,
      partCount: wh.inventories.length,
      totalInventory,
      lowStockCount,
      outOfStockCount,
      importActivityCount: wh.importReceipts.length,
      exportActivityCount: wh.exportReceipts.length,
      stockCheckActivityCount: wh.stockChecks.length,
      qcActivityCount: wh.qualityChecks.length,
    };
  });

  return {
    warehouses: warehouseStats,
  };
}

// ============================================================
// 12. CSV EXPORT UTILITY
// ============================================================
export async function exportReportDataCsv(reportType: string, filters?: ReportFilterInput): Promise<string> {
  const session = await requireAuth();
  if (!hasPermission(session.permissions, PERMISSIONS.REPORTS_EXPORT)) {
    throw new Error('Forbidden: You do not have permission to export report data');
  }

  // Safe CSV cell escaping: enclose in quotes, escape internal quotes
  const escapeCell = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  switch (reportType) {
    case 'inventory': {
      const data = await getStockStatusReport(filters);
      const headers = ['Part ID', 'SKU', 'Part Name', 'Category', 'Warehouse', 'Current Quantity', 'Min Stock', 'Max Stock', 'Status'];
      const rows = data.items.map((item) => [
        item.partId,
        item.sku,
        item.partName,
        item.categoryName,
        item.warehouseName,
        item.quantity,
        item.minStock,
        item.maxStock,
        item.status,
      ]);
      return [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
    }

    case 'movement': {
      const data = await getInventoryMovementReport(filters);
      const headers = ['Date', 'Label', 'Inbound Quantity', 'Outbound Quantity', 'Net Movement'];
      const rows = data.rows.map((r) => [r.date, r.label, r.inbound, r.outbound, r.netMovement]);
      return [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
    }

    case 'imports': {
      const data = await getImportAnalyticsReport(filters);
      const headers = ['Supplier ID', 'Supplier Name', 'Receipts Count', 'Total Spend'];
      const rows = data.topSuppliers.map((s) => [s.supplierId, s.supplierName, s.receiptCount, s.totalValue]);
      return [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
    }

    case 'exports': {
      const data = await getExportAnalyticsReport(filters);
      const headers = ['Part ID', 'SKU', 'Part Name', 'Exported Quantity', 'Receipt Count'];
      const rows = data.topExportedParts.map((p) => [p.partId, p.sku, p.partName, p.quantity, p.receiptCount]);
      return [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
    }

    case 'stock-checks': {
      const data = await getStockCheckAnalyticsReport(filters);
      const headers = ['Check Number', 'Warehouse', 'SKU', 'Part Name', 'System Qty', 'Actual Qty', 'Difference', 'Status', 'Adjusted'];
      const rows = data.discrepancyRanking.map((d) => [
        d.checkNumber,
        d.warehouseName,
        d.sku,
        d.partName,
        d.systemQty,
        d.actualQty ?? 'N/A',
        d.difference ?? 0,
        d.status,
        d.isAdjusted ? 'Yes' : 'No',
      ]);
      return [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
    }

    case 'quality': {
      const data = await getQualityControlAnalyticsReport(filters);
      const headers = ['Part ID', 'SKU', 'Part Name', 'Inspected Quantity', 'Defective Quantity', 'Defect Rate (%)'];
      const rows = data.topDefectiveParts.map((p) => [
        p.partId,
        p.sku,
        p.partName,
        p.inspectedQuantity,
        p.defectiveQuantity,
        p.defectRate,
      ]);
      return [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
    }

    default:
      throw new Error(`Invalid report type for export: ${reportType}`);
  }
}
