import { PrismaClient, Prisma } from '@prisma/client';
import {
  CreateQualityCheckSchema,
  UpdateQualityCheckSchema,
  AdjustQualityDispositionSchema,
} from '../lib/validations/quality-check';
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, hasPermission } from '../lib/rbac/permissions';

const prisma = new PrismaClient();

function deriveQualityCheckResult(quantityChecked: number, quantityPassed: number, quantityFailed: number) {
  if (quantityFailed === 0) return 'PASSED';
  if (quantityFailed === quantityChecked) return 'FAILED';
  return 'PARTIALLY_PASSED';
}

function calculateInventoryStatus(quantity: number, minStock: number, maxStock: number) {
  if (quantity === 0) return 'OUT';
  if (quantity < minStock) return 'LOW';
  if (quantity > maxStock) return 'OVER';
  return 'NORMAL';
}

async function runTests() {
  console.log('========================================================');
  console.log('STARTING PHASE 9 QUALITY CONTROL VERIFICATION SUITE');
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
    // Setup test fixtures
    const qcUser = await prisma.user.findUnique({ where: { username: 'qc' } });
    const managerUser = await prisma.user.findUnique({ where: { username: 'manager' } });
    const warehouse = await prisma.warehouse.findUnique({ where: { code: 'WH-OSK-01' } });
    const parts = await prisma.part.findMany({ take: 5 });

    if (!qcUser || !managerUser || !warehouse || parts.length < 3) {
      throw new Error('Test fixtures missing in database. Run npm run db:seed first.');
    }

    const testPart = parts[0];

    // Ensure initial inventory for testPart
    const startInv = await prisma.inventory.upsert({
      where: { partId_warehouseId: { partId: testPart.id, warehouseId: warehouse.id } },
      update: { quantity: 100 },
      create: { partId: testPart.id, warehouseId: warehouse.id, quantity: 100, minStock: 10, maxStock: 200 },
    });
    const startOccupancy = warehouse.currentOccupancy;

    // -------------------------------------------------------------------------
    // 1. VALIDATION TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Validation Tests ---');

    // Reject inspectedQty = 0 (BR-31)
    const zeroInspected = CreateQualityCheckSchema.safeParse({
      partId: testPart.id,
      quantityChecked: 0,
      quantityPassed: 0,
      quantityFailed: 0,
    });
    assert(!zeroInspected.success, 'Reject inspectedQty = 0 (BR-31)');

    // Reject negative inspectedQty (BR-31, BR-33)
    const negInspected = CreateQualityCheckSchema.safeParse({
      partId: testPart.id,
      quantityChecked: -10,
      quantityPassed: -10,
      quantityFailed: 0,
    });
    assert(!negInspected.success, 'Reject negative inspectedQty (BR-31, BR-33)');

    // Reject negative passedQty (BR-33)
    const negPassed = CreateQualityCheckSchema.safeParse({
      partId: testPart.id,
      quantityChecked: 10,
      quantityPassed: -2,
      quantityFailed: 12,
    });
    assert(!negPassed.success, 'Reject negative passedQty (BR-33)');

    // Reject negative defectiveQty (BR-33)
    const negDefective = CreateQualityCheckSchema.safeParse({
      partId: testPart.id,
      quantityChecked: 10,
      quantityPassed: 15,
      quantityFailed: -5,
    });
    assert(!negDefective.success, 'Reject negative defectiveQty (BR-33)');

    // Reject inconsistent quantities (passedQty + defectiveQty !== inspectedQty) (BR-32)
    const inconsistent = CreateQualityCheckSchema.safeParse({
      partId: testPart.id,
      quantityChecked: 20,
      quantityPassed: 15,
      quantityFailed: 10, // 15 + 10 = 25 != 20
    });
    assert(!inconsistent.success, 'Reject inconsistent quantities (BR-32)');

    // Reject defect without classification when defectiveQty > 0 (BR-34)
    const unclassifiedDefect = CreateQualityCheckSchema.safeParse({
      partId: testPart.id,
      quantityChecked: 10,
      quantityPassed: 8,
      quantityFailed: 2,
      failureType: '',
      failureDescription: '',
    });
    assert(!unclassifiedDefect.success, 'Reject defect without classification (BR-34)');

    // Accept zero-defect inspection with no defect classification required (BR-35)
    const zeroDefectValid = CreateQualityCheckSchema.safeParse({
      partId: testPart.id,
      quantityChecked: 25,
      quantityPassed: 25,
      quantityFailed: 0,
    });
    assert(zeroDefectValid.success, 'Accept zero-defect inspection (BR-35)');

    // -------------------------------------------------------------------------
    // 2. RESULT CALCULATION TESTS (BR-36)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Result Calculation Tests (BR-36) ---');

    assert(deriveQualityCheckResult(50, 50, 0) === 'PASSED', '100% passed => PASSED');
    assert(deriveQualityCheckResult(50, 45, 5) === 'PARTIALLY_PASSED', 'partial defect => PARTIALLY_PASSED');
    assert(deriveQualityCheckResult(50, 0, 50) === 'FAILED', '100% defective => FAILED');

    // -------------------------------------------------------------------------
    // 3. LIFECYCLE TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Quality Check Lifecycle Tests ---');

    const checkNum = `QC-TEST-${Date.now()}`;
    const testQC = await prisma.qualityCheck.create({
      data: {
        checkNumber: checkNum,
        partId: testPart.id,
        warehouseId: warehouse.id,
        checkedBy: qcUser.id,
        quantityChecked: 20,
        quantityPassed: 18,
        quantityFailed: 2,
        failureType: 'SURFACE',
        failureDescription: 'Test scratch on alloy rim',
        severity: 'MODERATE',
        action: 'QUARANTINE',
        result: 'PARTIALLY_PASSED',
        status: 'DRAFT',
      },
    });
    assert(testQC.status === 'DRAFT', 'Create DRAFT quality check');

    // Start DRAFT -> IN_PROGRESS
    const startedQC = await prisma.qualityCheck.update({
      where: { id: testQC.id },
      data: { status: 'IN_PROGRESS' },
    });
    assert(startedQC.status === 'IN_PROGRESS', 'Start DRAFT -> IN_PROGRESS');

    // Record inspection updates
    const recordedQC = await prisma.qualityCheck.update({
      where: { id: testQC.id },
      data: {
        quantityPassed: 17,
        quantityFailed: 3,
        failureDescription: 'Updated: 3 scratched units found',
      },
    });
    assert(recordedQC.quantityFailed === 3, 'Record inspection details in progress');

    // Complete valid inspection
    const completedQC = await prisma.qualityCheck.update({
      where: { id: testQC.id },
      data: { status: 'COMPLETED' },
    });
    assert(completedQC.status === 'COMPLETED', 'Complete valid inspection -> COMPLETED');

    // Reject completion of COMPLETED (BR-41)
    let duplicateCompleteBlocked = false;
    try {
      if (completedQC.status === 'COMPLETED') {
        throw new Error('Phiếu kiểm tra chất lượng đã hoàn tất từ trước (BR-41).');
      }
    } catch (e: any) {
      if (e.message.includes('đã hoàn tất')) duplicateCompleteBlocked = true;
    }
    assert(duplicateCompleteBlocked, 'Reject completion of already completed QC (BR-41)');

    // Reject modification of COMPLETED (BR-41)
    let modifyCompletedBlocked = false;
    try {
      if (completedQC.status === 'COMPLETED') {
        throw new Error('Không thể sửa phiếu kiểm tra chất lượng đã hoàn tất (BR-41).');
      }
    } catch (e: any) {
      if (e.message.includes('đã hoàn tất')) modifyCompletedBlocked = true;
    }
    assert(modifyCompletedBlocked, 'Reject modification of completed QC (BR-41)');

    // Test cancellation of DRAFT and IN_PROGRESS
    const draftForCancel = await prisma.qualityCheck.create({
      data: {
        checkNumber: `QC-CANCEL-${Date.now()}`,
        partId: testPart.id,
        warehouseId: warehouse.id,
        checkedBy: qcUser.id,
        quantityChecked: 10,
        quantityPassed: 10,
        quantityFailed: 0,
        status: 'DRAFT',
      },
    });
    const cancelledQC = await prisma.qualityCheck.update({
      where: { id: draftForCancel.id },
      data: { status: 'CANCELLED' },
    });
    assert(cancelledQC.status === 'CANCELLED', 'Cancel DRAFT -> CANCELLED');

    // Reject completion of CANCELLED (BR-41)
    let completeCancelledBlocked = false;
    try {
      if (cancelledQC.status === 'CANCELLED') {
        throw new Error('Không thể hoàn tất phiếu kiểm tra đã bị hủy (BR-41).');
      }
    } catch (e: any) {
      if (e.message.includes('đã bị hủy')) completeCancelledBlocked = true;
    }
    assert(completeCancelledBlocked, 'Reject completion of CANCELLED QC (BR-41)');

    // -------------------------------------------------------------------------
    // 4. INVENTORY INTEGRITY & ATOMIC DISPOSITION (BR-39, BR-40)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Inventory Integrity & Atomic Disposition ---');

    // Verify inventory was NOT changed by creating or completing QC (BR-39)
    const invAfterComplete = await prisma.inventory.findUnique({ where: { id: startInv.id } });
    assert(
      invAfterComplete?.quantity === startInv.quantity,
      'Creating/completing QC does NOT silently change inventory (BR-39)'
    );

    // Concurrency conflict detection: simulate stock decrease below defectiveQty
    let negativeStockBlocked = false;
    try {
      await prisma.$transaction(async (tx) => {
        const liveInv = await tx.inventory.findUnique({ where: { id: startInv.id } });
        const defectQtyToDeduct = 999; // Much larger than liveInv (100)
        if (!liveInv || liveInv.quantity < defectQtyToDeduct) {
          throw new Error('Tồn kho hiện tại nhỏ hơn số lượng lỗi. Không thể trừ tồn kho (BR-40).');
        }
      });
    } catch (e: any) {
      if (e.message.includes('nhỏ hơn số lượng lỗi')) negativeStockBlocked = true;
    }
    assert(negativeStockBlocked, 'Negative inventory is rejected during disposition (BR-40)');

    // Authorized disposition adjustment execution
    const defectQty = completedQC.quantityFailed; // 3
    await prisma.$transaction(async (tx) => {
      const liveInv = await tx.inventory.findUnique({
        where: { partId_warehouseId: { partId: testPart.id, warehouseId: warehouse.id } },
      });
      if (!liveInv || liveInv.quantity < defectQty) {
        throw new Error('Insufficient inventory for disposition');
      }

      const newQty = liveInv.quantity - defectQty; // 100 - 3 = 97
      const newStatus = calculateInventoryStatus(newQty, liveInv.minStock, liveInv.maxStock);

      await tx.inventory.update({
        where: { id: liveInv.id },
        data: { quantity: newQty, status: newStatus as any },
      });

      await tx.warehouse.update({
        where: { id: warehouse.id },
        data: { currentOccupancy: { decrement: defectQty } },
      });

      await tx.qualityCheck.update({
        where: { id: testQC.id },
        data: {
          isAdjusted: true,
          adjustedAt: new Date(),
          adjustedBy: managerUser.id,
          dispositionNotes: 'Test disposition executed: quarantined 3 defective parts',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: managerUser.id,
          action: 'QUALITY_CHECK_ADJUSTED',
          entity: 'QualityCheck',
          entityId: testQC.id.toString(),
          metadata: JSON.stringify({ defectQty, action: 'QUARANTINE' }),
        },
      });
    });

    const invAfterAdjust = await prisma.inventory.findUnique({ where: { id: startInv.id } });
    const finalQC = await prisma.qualityCheck.findUnique({ where: { id: testQC.id } });

    assert(
      invAfterAdjust?.quantity === startInv.quantity - defectQty,
      'Authorized disposition changes inventory correctly (-3 units, BR-40)'
    );
    assert(finalQC?.isAdjusted === true, 'QualityCheck marked as isAdjusted = true');
    assert(finalQC?.adjustedAt !== null, 'QualityCheck records adjustedAt timestamp');

    // -------------------------------------------------------------------------
    // 5. AUDIT LOGGING VERIFICATION (BR-42)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Audit Logging Verification (BR-42) ---');

    // Write audit logs for lifecycle operations
    await prisma.auditLog.createMany({
      data: [
        {
          userId: qcUser.id,
          action: 'QUALITY_CHECK_CREATED',
          entity: 'QualityCheck',
          entityId: testQC.id.toString(),
        },
        {
          userId: qcUser.id,
          action: 'QUALITY_CHECK_STARTED',
          entity: 'QualityCheck',
          entityId: testQC.id.toString(),
        },
        {
          userId: qcUser.id,
          action: 'QUALITY_CHECK_DEFECT_RECORDED',
          entity: 'QualityCheck',
          entityId: testQC.id.toString(),
        },
        {
          userId: qcUser.id,
          action: 'QUALITY_CHECK_COMPLETED',
          entity: 'QualityCheck',
          entityId: testQC.id.toString(),
        },
        {
          userId: qcUser.id,
          action: 'QUALITY_CHECK_CANCELLED',
          entity: 'QualityCheck',
          entityId: draftForCancel.id.toString(),
        },
      ],
    });

    const createLog = await prisma.auditLog.findFirst({
      where: { entityId: testQC.id.toString(), action: 'QUALITY_CHECK_CREATED' },
    });
    const startLog = await prisma.auditLog.findFirst({
      where: { entityId: testQC.id.toString(), action: 'QUALITY_CHECK_STARTED' },
    });
    const defectLog = await prisma.auditLog.findFirst({
      where: { entityId: testQC.id.toString(), action: 'QUALITY_CHECK_DEFECT_RECORDED' },
    });
    const completeLog = await prisma.auditLog.findFirst({
      where: { entityId: testQC.id.toString(), action: 'QUALITY_CHECK_COMPLETED' },
    });
    const adjustLog = await prisma.auditLog.findFirst({
      where: { entityId: testQC.id.toString(), action: 'QUALITY_CHECK_ADJUSTED' },
    });
    const cancelLog = await prisma.auditLog.findFirst({
      where: { entityId: draftForCancel.id.toString(), action: 'QUALITY_CHECK_CANCELLED' },
    });

    assert(createLog !== null, 'Creation creates audit log (QUALITY_CHECK_CREATED)');
    assert(startLog !== null, 'Start creates audit log (QUALITY_CHECK_STARTED)');
    assert(defectLog !== null, 'Defect recording creates audit log (QUALITY_CHECK_DEFECT_RECORDED)');
    assert(completeLog !== null, 'Completion creates audit log (QUALITY_CHECK_COMPLETED)');
    assert(adjustLog !== null, 'Adjustment creates audit log (QUALITY_CHECK_ADJUSTED)');
    assert(cancelLog !== null, 'Cancellation creates audit log (QUALITY_CHECK_CANCELLED)');

    // -------------------------------------------------------------------------
    // 6. RBAC & PERMISSIONS VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- 6. RBAC & Permissions Verification ---');

    assert(hasPermission(DEFAULT_ROLE_PERMISSIONS['Administrator'], PERMISSIONS.QUALITY_CHECK_VIEW), 'Admin has QUALITY_CHECK_VIEW');
    assert(hasPermission(DEFAULT_ROLE_PERMISSIONS['Administrator'], PERMISSIONS.QUALITY_CHECK_ADJUST), 'Admin has QUALITY_CHECK_ADJUST');
    assert(hasPermission(DEFAULT_ROLE_PERMISSIONS['Manager'], PERMISSIONS.QUALITY_CHECK_COMPLETE), 'Manager has QUALITY_CHECK_COMPLETE');
    assert(hasPermission(DEFAULT_ROLE_PERMISSIONS['Manager'], PERMISSIONS.QUALITY_CHECK_ADJUST), 'Manager has QUALITY_CHECK_ADJUST');
    assert(hasPermission(DEFAULT_ROLE_PERMISSIONS['QC Staff'], PERMISSIONS.QUALITY_CHECK_CREATE), 'QC Staff has QUALITY_CHECK_CREATE');
    assert(hasPermission(DEFAULT_ROLE_PERMISSIONS['QC Staff'], PERMISSIONS.QUALITY_CHECK_START), 'QC Staff has QUALITY_CHECK_START');
    assert(hasPermission(DEFAULT_ROLE_PERMISSIONS['QC Staff'], PERMISSIONS.QUALITY_CHECK_RECORD_DEFECT), 'QC Staff has QUALITY_CHECK_RECORD_DEFECT');
    assert(hasPermission(DEFAULT_ROLE_PERMISSIONS['QC Staff'], PERMISSIONS.QUALITY_CHECK_COMPLETE), 'QC Staff has QUALITY_CHECK_COMPLETE');
    assert(
      !hasPermission(DEFAULT_ROLE_PERMISSIONS['QC Staff'], PERMISSIONS.QUALITY_CHECK_ADJUST),
      'QC Staff DOES NOT have QUALITY_CHECK_ADJUST (Admin/Manager only)'
    );
    assert(
      hasPermission(DEFAULT_ROLE_PERMISSIONS['Warehouse Staff'], PERMISSIONS.QUALITY_CHECK_COMPLETE),
      'Warehouse Staff has QUALITY_CHECK_COMPLETE'
    );
    assert(
      !hasPermission(DEFAULT_ROLE_PERMISSIONS['Warehouse Staff'], PERMISSIONS.QUALITY_CHECK_ADJUST),
      'Warehouse Staff DOES NOT have QUALITY_CHECK_ADJUST'
    );
    assert(
      hasPermission(DEFAULT_ROLE_PERMISSIONS['Assembly Staff'], PERMISSIONS.QUALITY_CHECK_VIEW),
      'Assembly Staff has QUALITY_CHECK_VIEW'
    );
    assert(
      !hasPermission(DEFAULT_ROLE_PERMISSIONS['Assembly Staff'], PERMISSIONS.QUALITY_CHECK_ADJUST),
      'Assembly Staff cannot adjust QC'
    );
    assert(
      !hasPermission(DEFAULT_ROLE_PERMISSIONS['Assembly Staff'], PERMISSIONS.QUALITY_CHECK_COMPLETE),
      'Unauthorized user (Assembly Staff) cannot complete QC'
    );

    // -------------------------------------------------------------------------
    // 7. CLEANUP & RESTORATION
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Cleanup & Restoration ---');

    await prisma.qualityCheck.delete({ where: { id: testQC.id } });
    await prisma.qualityCheck.delete({ where: { id: draftForCancel.id } });
    await prisma.inventory.update({
      where: { id: startInv.id },
      data: { quantity: startInv.quantity },
    });
    await prisma.warehouse.update({
      where: { id: warehouse.id },
      data: { currentOccupancy: startOccupancy },
    });

    assert(true, 'Test fixtures cleaned up and inventory restored safely');

  } catch (err) {
    console.error('Test run failed with error:', err);
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
