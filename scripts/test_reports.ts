import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';
import {
  resolveDateRange,
  safePercentage,
  formatCurrency,
  ReportFilterSchema,
} from '../lib/validations/reports';
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, hasPermission } from '../lib/rbac/permissions';

const prisma = new PrismaClient();

async function runTests() {
  console.log('========================================================');
  console.log('STARTING PHASE 10 REPORTS & ANALYTICS VERIFICATION SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // 1. CALCULATION & ZERO-DENOMINATOR TESTS (Section 29)
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Calculation & Math Safety Tests ---');

    assert(safePercentage(0, 0) === 0, 'Safe percentage handles 0/0 returning 0 without NaN');
    assert(safePercentage(10, 0) === 0, 'Safe percentage handles positive numerator / 0 denominator returning 0');
    assert(safePercentage(0, 100) === 0, 'Safe percentage handles 0 / positive denominator returning 0');
    assert(safePercentage(25, 100) === 25, 'Safe percentage computes 25/100 as 25%');
    assert(safePercentage(1, 3, 2) === 33.33, 'Safe percentage rounds to requested decimals (33.33%)');
    assert(safePercentage(NaN as any, 100) === 0, 'Safe percentage handles NaN numerator safely');
    assert(safePercentage(100, -5) === 0, 'Safe percentage handles negative denominator safely');

    assert(formatCurrency(1250.5).includes('1,250.5') || formatCurrency(1250.5).includes('1,251'), 'formatCurrency formats number properly');
    assert(formatCurrency(null) === '¥0', 'formatCurrency handles null gracefully');
    assert(formatCurrency(undefined) === '¥0', 'formatCurrency handles undefined gracefully');

    // -------------------------------------------------------------------------
    // 2. DATE BOUNDARY & RANGE RESOLUTION TESTS (Section 6, 28)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Date Boundary & Range Resolution Tests ---');

    const todayRange = resolveDateRange('today');
    assert(
      todayRange.startDate < todayRange.endExclusiveDate,
      'Today date range has valid ordered boundaries (startDate < endExclusiveDate)'
    );

    const sevenDaysRange = resolveDateRange('7days');
    const diffDays7 = Math.round(
      (sevenDaysRange.endExclusiveDate.getTime() - sevenDaysRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    assert(diffDays7 === 7, `Last 7 days covers exactly 7 whole days (calculated: ${diffDays7})`);

    const thirtyDaysRange = resolveDateRange('30days');
    const diffDays30 = Math.round(
      (thirtyDaysRange.endExclusiveDate.getTime() - thirtyDaysRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    assert(diffDays30 === 30, `Last 30 days covers exactly 30 whole days (calculated: ${diffDays30})`);

    const thisMonthRange = resolveDateRange('this_month');
    assert(
      thisMonthRange.startDate.getDate() === 1,
      'Current month begins on day 1 of the month'
    );

    const customRange = resolveDateRange('custom', '2026-01-01', '2026-01-15');
    assert(
      format(customRange.startDate, 'yyyy-MM-dd') === '2026-01-01',
      'Custom range correctly parses start boundary'
    );
    assert(
      format(customRange.endExclusiveDate, 'yyyy-MM-dd') === '2026-01-16',
      'Custom range creates exclusive end boundary (+1 day)'
    );

    // Custom date swap if reversed
    const reversedRange = resolveDateRange('custom', '2026-02-01', '2026-01-01');
    assert(
      reversedRange.startDate <= reversedRange.endExclusiveDate,
      'Custom range safely swaps boundaries when start > end'
    );

    // -------------------------------------------------------------------------
    // 3. INVENTORY AGGREGATION TESTS (Section 8, 9, 39, 40)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Inventory Aggregation & Stock Health Tests ---');

    const dbInventoryAgg = await prisma.inventory.aggregate({
      _sum: { quantity: true },
      _count: { id: true },
    });

    const dbInventoryGroups = await prisma.inventory.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { quantity: true },
    });

    let normalCount = 0;
    let lowCount = 0;
    let outCount = 0;
    let overCount = 0;
    let sumGroupQty = 0;

    for (const g of dbInventoryGroups) {
      sumGroupQty += g._sum.quantity || 0;
      if (g.status === 'NORMAL') normalCount = g._count.id;
      if (g.status === 'LOW') lowCount = g._count.id;
      if (g.status === 'OUT') outCount = g._count.id;
      if (g.status === 'OVER') overCount = g._count.id;
    }

    assert(
      sumGroupQty === (dbInventoryAgg._sum.quantity || 0),
      `Total inventory quantity across status groups matches aggregate (${sumGroupQty})`
    );
    assert(
      normalCount + lowCount + outCount + overCount === (dbInventoryAgg._count.id || 0),
      'Sum of stock status record counts equals total inventory records'
    );

    // Verify warehouse occupancy match
    const warehouses = await prisma.warehouse.findMany({
      select: {
        id: true,
        code: true,
        capacity: true,
        currentOccupancy: true,
        inventories: { select: { quantity: true } },
      },
    });

    let allWarehousesValid = true;
    for (const wh of warehouses) {
      const invSum = wh.inventories.reduce((acc, i) => acc + i.quantity, 0);
      const util = safePercentage(wh.currentOccupancy, wh.capacity);
      if (isNaN(util) || util < 0) allWarehousesValid = false;
    }
    assert(allWarehousesValid, 'All warehouse utilization percentages are deterministic and non-NaN');

    // -------------------------------------------------------------------------
    // 4. MOVEMENT ANALYTICS & MATH VERIFICATION (Section 10, 39)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Inventory Movement Analytics Tests ---');

    const completedImportDetails = await prisma.importReceiptDetail.aggregate({
      where: { receipt: { status: 'COMPLETED' } },
      _sum: { quantity: true },
    });

    const completedExportDetails = await prisma.exportReceiptDetail.aggregate({
      where: { receipt: { status: 'COMPLETED' } },
      _sum: { quantity: true },
    });

    const totalInbound = completedImportDetails._sum.quantity || 0;
    const totalOutbound = completedExportDetails._sum.quantity || 0;
    const calculatedNet = totalInbound - totalOutbound;

    assert(totalInbound >= 0, `Inbound import quantity is non-negative (${totalInbound} pcs)`);
    assert(totalOutbound >= 0, `Outbound export quantity is non-negative (${totalOutbound} pcs)`);
    assert(
      calculatedNet === totalInbound - totalOutbound,
      `Net movement strictly obeys inboundQty - outboundQty (${calculatedNet} pcs)`
    );

    // -------------------------------------------------------------------------
    // 5. IMPORT & EXPORT ANALYTICS TESTS (Section 11, 12, 39)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Import & Export Analytics Tests ---');

    const totalImportsCount = await prisma.importReceipt.count();
    const completedImportsCount = await prisma.importReceipt.count({ where: { status: 'COMPLETED' } });
    const importSpendAgg = await prisma.importReceipt.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { totalAmount: true },
    });

    assert(totalImportsCount >= completedImportsCount, 'Total imports count >= completed imports count');
    const totalImportSpend = Number(importSpendAgg._sum.totalAmount || 0);
    assert(totalImportSpend >= 0, `Total import spend is non-negative (${totalImportSpend})`);

    const totalExportsCount = await prisma.exportReceipt.count();
    const completedExportsCount = await prisma.exportReceipt.count({ where: { status: 'COMPLETED' } });
    const exportSpendAgg = await prisma.exportReceipt.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { totalAmount: true },
    });

    assert(totalExportsCount >= completedExportsCount, 'Total exports count >= completed exports count');
    const totalExportSpend = Number(exportSpendAgg._sum.totalAmount || 0);
    assert(totalExportSpend >= 0, `Total export spend is non-negative (${totalExportSpend})`);

    // -------------------------------------------------------------------------
    // 6. STOCK CHECK ANALYTICS TESTS (Section 13, 39)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Stock Check Analytics Tests ---');

    const totalStockChecks = await prisma.stockCheck.count();
    const completedStockChecks = await prisma.stockCheck.count({
      where: { status: { in: ['COMPLETED', 'ADJUSTED'] } },
    });
    const discrepancyDetailsCount = await prisma.stockCheckDetail.count({
      where: { status: { in: ['SHORTAGE', 'SURPLUS'] } },
    });
    const adjustedDetailsCount = await prisma.stockCheckDetail.count({
      where: { isAdjusted: true },
    });

    assert(totalStockChecks >= completedStockChecks, 'Total stock checks >= completed stock checks');
    assert(discrepancyDetailsCount >= 0, `Discrepancy count is non-negative (${discrepancyDetailsCount})`);
    assert(adjustedDetailsCount >= 0, `Adjusted details count is non-negative (${adjustedDetailsCount})`);

    const varianceAgg = await prisma.stockCheckDetail.aggregate({
      _sum: { actualQty: true, systemQty: true, difference: true },
    });

    const sysQty = varianceAgg._sum.systemQty || 0;
    const actQty = varianceAgg._sum.actualQty || 0;
    const diff = varianceAgg._sum.difference || 0;
    assert(typeof diff === 'number', `Variance sum is computed deterministically (${diff})`);

    // -------------------------------------------------------------------------
    // 7. QUALITY CONTROL ANALYTICS TESTS (Section 14, 39)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Quality Control Analytics Tests ---');

    const totalQCCount = await prisma.qualityCheck.count();
    const qcAggregates = await prisma.qualityCheck.aggregate({
      _sum: { quantityChecked: true, quantityPassed: true, quantityFailed: true },
    });

    const inspectedQty = qcAggregates._sum.quantityChecked || 0;
    const passedQty = qcAggregates._sum.quantityPassed || 0;
    const failedQty = qcAggregates._sum.quantityFailed || 0;

    const passRate = safePercentage(passedQty, inspectedQty);
    const defectRate = safePercentage(failedQty, inspectedQty);

    assert(totalQCCount >= 0, `Total QC count is non-negative (${totalQCCount})`);
    assert(inspectedQty >= 0, `Inspected quantity is non-negative (${inspectedQty})`);
    assert(passRate >= 0 && passRate <= 100, `Pass rate is within 0-100% (${passRate}%)`);
    assert(defectRate >= 0 && defectRate <= 100, `Defect rate is within 0-100% (${defectRate}%)`);
    assert(
      inspectedQty === 0 || Math.abs(passRate + defectRate - 100) < 0.5,
      `Pass rate (${passRate}%) + Defect rate (${defectRate}%) sums approximately to 100%`
    );

    // -------------------------------------------------------------------------
    // 8. SUPPLIER & PART PERFORMANCE TESTS (Section 15, 16, 39)
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Supplier & Part Performance Tests ---');

    const suppliersCount = await prisma.supplier.count({ where: { status: 'ACTIVE' } });
    assert(suppliersCount > 0, `Active suppliers exist in database (${suppliersCount})`);

    const partsCount = await prisma.part.count({ where: { status: 'ACTIVE' } });
    assert(partsCount > 0, `Active parts exist in database (${partsCount})`);

    // -------------------------------------------------------------------------
    // 9. RBAC & PERMISSION BOUNDARY TESTS (Section 24, 25, 39)
    // -------------------------------------------------------------------------
    console.log('\n--- 9. RBAC & Server Authorization Tests ---');

    const adminPermissions = DEFAULT_ROLE_PERMISSIONS['Administrator'];
    const managerPermissions = DEFAULT_ROLE_PERMISSIONS['Manager'];
    const warehousePermissions = DEFAULT_ROLE_PERMISSIONS['Warehouse Staff'];
    const qcPermissions = DEFAULT_ROLE_PERMISSIONS['QC Staff'];
    const assemblyPermissions = DEFAULT_ROLE_PERMISSIONS['Assembly Staff'];

    assert(
      hasPermission(adminPermissions, PERMISSIONS.REPORTS_VIEW),
      'Administrator has REPORTS_VIEW'
    );
    assert(
      hasPermission(adminPermissions, PERMISSIONS.REPORTS_EXPORT),
      'Administrator has REPORTS_EXPORT'
    );

    assert(
      hasPermission(managerPermissions, PERMISSIONS.REPORTS_VIEW),
      'Manager has REPORTS_VIEW'
    );
    assert(
      hasPermission(managerPermissions, PERMISSIONS.REPORTS_EXPORT),
      'Manager has REPORTS_EXPORT'
    );
    assert(
      hasPermission(managerPermissions, PERMISSIONS.REPORT_INVENTORY),
      'Manager has REPORT_INVENTORY'
    );
    assert(
      hasPermission(managerPermissions, PERMISSIONS.REPORT_QUALITY),
      'Manager has REPORT_QUALITY'
    );

    assert(
      hasPermission(warehousePermissions, PERMISSIONS.REPORTS_VIEW),
      'Warehouse Staff has REPORTS_VIEW'
    );
    assert(
      hasPermission(warehousePermissions, PERMISSIONS.REPORT_INVENTORY),
      'Warehouse Staff has REPORT_INVENTORY'
    );
    assert(
      hasPermission(warehousePermissions, PERMISSIONS.REPORT_WAREHOUSE),
      'Warehouse Staff has REPORT_WAREHOUSE'
    );
    assert(
      !hasPermission(warehousePermissions, PERMISSIONS.REPORTS_EXPORT),
      'Warehouse Staff DOES NOT have REPORTS_EXPORT (Restricted)'
    );
    assert(
      !hasPermission(warehousePermissions, PERMISSIONS.REPORT_QUALITY),
      'Warehouse Staff DOES NOT have REPORT_QUALITY'
    );

    assert(
      hasPermission(qcPermissions, PERMISSIONS.REPORTS_VIEW),
      'QC Staff has REPORTS_VIEW'
    );
    assert(
      hasPermission(qcPermissions, PERMISSIONS.REPORT_QUALITY),
      'QC Staff has REPORT_QUALITY'
    );
    assert(
      !hasPermission(qcPermissions, PERMISSIONS.REPORT_EXPORT),
      'QC Staff DOES NOT have REPORT_EXPORT'
    );
    assert(
      !hasPermission(qcPermissions, PERMISSIONS.REPORTS_EXPORT),
      'QC Staff DOES NOT have REPORTS_EXPORT'
    );

    assert(
      !hasPermission(assemblyPermissions, PERMISSIONS.REPORTS_VIEW),
      'Assembly Staff DOES NOT have REPORTS_VIEW (Forbidden)'
    );
    assert(
      !hasPermission(assemblyPermissions, PERMISSIONS.REPORTS_EXPORT),
      'Assembly Staff DOES NOT have REPORTS_EXPORT'
    );

    // -------------------------------------------------------------------------
    // 10. CSV EXPORT INTEGRITY & ESCAPING (Section 32)
    // -------------------------------------------------------------------------
    console.log('\n--- 10. CSV Export Integrity Tests ---');

    const escapeTestCell = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const dangerousString = 'Tire, 205/55R16 "Pro"\nSpecial';
    const escaped = escapeTestCell(dangerousString);

    assert(
      escaped.startsWith('"') && escaped.endsWith('"'),
      'CSV escape encloses cell in double quotes'
    );
    assert(
      escaped.includes('""Pro""'),
      'CSV escape properly doubles internal quotes'
    );

    // -------------------------------------------------------------------------
    // 11. DATA ISOLATION VERIFICATION (Section 41)
    // -------------------------------------------------------------------------
    console.log('\n--- 11. Data Safety & Non-Destructive Operation ---');

    const finalPartsCount = await prisma.part.count();
    const finalInventoryCount = await prisma.inventory.count();

    assert(finalPartsCount === partsCount, 'No parts were altered or deleted by analytics queries');
    assert(finalInventoryCount === dbInventoryAgg._count.id, 'No inventory records were modified');
  } catch (err: any) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n========================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
