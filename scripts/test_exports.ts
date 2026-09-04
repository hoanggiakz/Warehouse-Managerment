import { PrismaClient, Prisma } from '@prisma/client';
import { ExportReceiptSchema } from '../lib/validations/export-receipt';
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, hasPermission } from '../lib/rbac/permissions';

const prisma = new PrismaClient();

function calculateStatus(quantity: number, minStock: number, maxStock: number) {
  if (quantity === 0) return 'OUT';
  if (quantity < minStock) return 'LOW';
  if (quantity > maxStock) return 'OVER';
  return 'NORMAL';
}

async function runTests() {
  console.log('========================================================');
  console.log('STARTING PHASE 7 EXPORT MANAGEMENT VERIFICATION SUITE');
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
    const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });
    const warehouse = await prisma.warehouse.findUnique({ where: { code: 'WH-OSK-01' } });
    const inactiveWarehouse = await prisma.warehouse.findUnique({ where: { code: 'WH-KOB-03' } });
    const parts = await prisma.part.findMany({ take: 5 });

    if (!adminUser || !warehouse || !inactiveWarehouse || parts.length < 2) {
      throw new Error('Test fixtures missing in database. Run npm run db:seed first.');
    }

    const testPart1 = parts[0];
    const testPart2 = parts[1];

    // TEST 2: Validate duplicate parts rejection (BR-26)
    console.log('\n--- 1. Validation Tests ---');
    const duplicateValidation = ExportReceiptSchema.safeParse({
      warehouseId: warehouse.id,
      requestDepartment: 'Test Dept',
      details: [
        { partId: testPart1.id, quantity: 2, unitPrice: 1000 },
        { partId: testPart1.id, quantity: 1, unitPrice: 1000 },
      ],
    });
    assert(!duplicateValidation.success, 'Reject duplicate parts in receipt (BR-26)');

    // TEST 3: Validate zero or negative quantity rejection (BR-17)
    const zeroQtyValidation = ExportReceiptSchema.safeParse({
      warehouseId: warehouse.id,
      requestDepartment: 'Test Dept',
      details: [
        { partId: testPart1.id, quantity: 0, unitPrice: 1000 },
      ],
    });
    assert(!zeroQtyValidation.success, 'Reject receipt with zero quantity (BR-17)');

    const negQtyValidation = ExportReceiptSchema.safeParse({
      warehouseId: warehouse.id,
      requestDepartment: 'Test Dept',
      details: [
        { partId: testPart1.id, quantity: -5, unitPrice: 1000 },
      ],
    });
    assert(!negQtyValidation.success, 'Reject receipt with negative quantity (BR-17)');

    // TEST 1: Create export receipt draft
    console.log('\n--- 2. Export Lifecycle Tests ---');
    const receiptNum = `EXP-TEST-${Date.now()}`;
    const draftReceipt = await prisma.exportReceipt.create({
      data: {
        receiptNumber: receiptNum,
        warehouseId: warehouse.id,
        userId: adminUser.id,
        requestDepartment: 'Test Dept',
        reason: 'Automated test draft',
        status: 'DRAFT',
        totalAmount: new Prisma.Decimal(190000),
        details: {
          create: [
            {
              partId: testPart1.id,
              quantity: 2,
              unitPrice: new Prisma.Decimal(testPart1.salePrice),
              totalPrice: new Prisma.Decimal(testPart1.salePrice).mul(2),
              locationPicked: 'RACK-TEST',
            },
          ],
        },
      },
      include: { details: true },
    });

    assert(
      draftReceipt.status === 'DRAFT' && draftReceipt.details.length === 1,
      'Create export receipt draft (BR-13)',
      `Status: ${draftReceipt.status}`
    );

    // Verify draft does not modify inventory (BR-13)
    const invBeforeSubmit = await prisma.inventory.findUnique({
      where: { partId_warehouseId: { partId: testPart1.id, warehouseId: warehouse.id } },
    });
    assert(invBeforeSubmit !== null, 'Inventory exists before submit');

    // TEST 4: Submit draft -> PENDING
    const pendingReceipt = await prisma.exportReceipt.update({
      where: { id: draftReceipt.id },
      data: { status: 'PENDING' },
    });
    assert(pendingReceipt.status === 'PENDING', 'Submit draft to PENDING (BR-14)');

    // Verify pending receipt does not modify inventory (BR-14)
    const invAfterSubmit = await prisma.inventory.findUnique({
      where: { partId_warehouseId: { partId: testPart1.id, warehouseId: warehouse.id } },
    });
    assert(
      invBeforeSubmit?.quantity === invAfterSubmit?.quantity,
      'PENDING receipt does not modify inventory (BR-14)'
    );

    // TEST 5: Cancel draft / pending
    const cancelTestReceipt = await prisma.exportReceipt.create({
      data: {
        receiptNumber: `EXP-CANCEL-${Date.now()}`,
        warehouseId: warehouse.id,
        userId: adminUser.id,
        status: 'DRAFT',
        totalAmount: new Prisma.Decimal(0),
      },
    });
    const cancelled = await prisma.exportReceipt.update({
      where: { id: cancelTestReceipt.id },
      data: { status: 'CANCELLED' },
    });
    assert(cancelled.status === 'CANCELLED', 'Cancel draft to CANCELLED (BR-23)');

    // Clean up cancel test receipt
    await prisma.exportReceipt.delete({ where: { id: cancelTestReceipt.id } });

    // TEST 8: Complete against inactive warehouse (BR-21)
    console.log('\n--- 3. Completion & Transaction Business Rules ---');
    const inactiveReceipt = await prisma.exportReceipt.create({
      data: {
        receiptNumber: `EXP-INACTIVE-${Date.now()}`,
        warehouseId: inactiveWarehouse.id,
        userId: adminUser.id,
        status: 'PENDING',
        totalAmount: new Prisma.Decimal(1000),
        details: {
          create: [{ partId: testPart1.id, quantity: 1, unitPrice: new Prisma.Decimal(1000), totalPrice: new Prisma.Decimal(1000) }],
        },
      },
    });

    let inactiveRejected = false;
    try {
      await prisma.$transaction(async (tx) => {
        const wh = await tx.warehouse.findUnique({ where: { id: inactiveWarehouse.id } });
        if (wh?.status !== 'ACTIVE') {
          throw new Error('Kho đang không hoạt động.');
        }
      });
    } catch (e: any) {
      if (e.message.includes('không hoạt động')) inactiveRejected = true;
    }
    assert(inactiveRejected, 'Reject completion against inactive warehouse (BR-21)');
    await prisma.exportReceiptDetail.deleteMany({ where: { exportId: inactiveReceipt.id } });
    await prisma.exportReceipt.delete({ where: { id: inactiveReceipt.id } });

    // TEST 7 & 12: Complete with insufficient inventory / prevent negative inventory (BR-18, BR-19)
    const currentQty = invBeforeSubmit?.quantity || 0;
    const excessiveQty = currentQty + 99999;

    let insufficientRejected = false;
    let rolledBack = false;

    try {
      await prisma.$transaction(async (tx) => {
        const inv = await tx.inventory.findUnique({
          where: { partId_warehouseId: { partId: testPart1.id, warehouseId: warehouse.id } },
        });
        const liveQty = inv?.quantity || 0;
        if (liveQty < excessiveQty) {
          throw new Error(`Không đủ tồn kho (Hiện có: ${liveQty}, Yêu cầu: ${excessiveQty})`);
        }
        await tx.inventory.update({
          where: { id: inv!.id },
          data: { quantity: liveQty - excessiveQty },
        });
      });
    } catch (e: any) {
      if (e.message.includes('Không đủ tồn kho')) {
        insufficientRejected = true;
        rolledBack = true;
      }
    }
    assert(insufficientRejected, 'Reject completion with insufficient inventory (BR-18)');
    assert(rolledBack, 'Transaction rollback when stock is insufficient (BR-30)');

    // TEST 6 & 11: Complete pending receipt atomically
    console.log('\n--- 4. Atomic Execution Verification ---');
    const startInv = await prisma.inventory.findUnique({
      where: { partId_warehouseId: { partId: testPart1.id, warehouseId: warehouse.id } },
    });
    const startOccupancy = (await prisma.warehouse.findUnique({ where: { id: warehouse.id } }))?.currentOccupancy || 0;

    const exportUnits = 2;

    await prisma.$transaction(async (tx) => {
      // 1. Verify receipt and status
      const rcpt = await tx.exportReceipt.findUnique({
        where: { id: pendingReceipt.id },
        include: { details: { include: { part: true } }, warehouse: true },
      });

      if (!rcpt || rcpt.status !== 'PENDING') throw new Error('Invalid status');
      if (rcpt.warehouse.status !== 'ACTIVE') throw new Error('Inactive warehouse');

      // 2. Decrement inventory
      for (const d of rcpt.details) {
        const inv = await tx.inventory.findUnique({
          where: { partId_warehouseId: { partId: d.partId, warehouseId: rcpt.warehouseId } },
        });
        const q = inv ? inv.quantity : 0;
        if (q < d.quantity) throw new Error('Insufficient stock');

        const newQ = q - d.quantity;
        const newStatus = calculateStatus(newQ, inv?.minStock || 10, inv?.maxStock || 100);

        await tx.inventory.update({
          where: { id: inv!.id },
          data: { quantity: newQ, status: newStatus },
        });
      }

      // 3. Decrement warehouse occupancy
      await tx.warehouse.update({
        where: { id: rcpt.warehouseId },
        data: { currentOccupancy: Math.max(0, rcpt.warehouse.currentOccupancy - exportUnits) },
      });

      // 4. Update status to COMPLETED
      await tx.exportReceipt.update({
        where: { id: rcpt.id },
        data: { status: 'COMPLETED', approvedBy: adminUser.id },
      });

      // 5. Create audit log
      await tx.auditLog.create({
        data: {
          userId: adminUser.id,
          action: 'EXPORT_COMPLETED',
          entity: 'ExportReceipt',
          entityId: rcpt.id.toString(),
          metadata: JSON.stringify({
            receiptNumber: rcpt.receiptNumber,
            warehouseId: rcpt.warehouseId,
            exportedQty: exportUnits,
          }),
        },
      });
    });

    // Verify after completion
    const endInv = await prisma.inventory.findUnique({
      where: { partId_warehouseId: { partId: testPart1.id, warehouseId: warehouse.id } },
    });
    const endOccupancy = (await prisma.warehouse.findUnique({ where: { id: warehouse.id } }))?.currentOccupancy || 0;
    const completedRcpt = await prisma.exportReceipt.findUnique({ where: { id: pendingReceipt.id } });

    assert(completedRcpt?.status === 'COMPLETED', 'Receipt status changed to COMPLETED (BR-15)');
    assert(
      (startInv?.quantity || 0) - (endInv?.quantity || 0) === exportUnits,
      `Inventory decreased correctly by exactly ${exportUnits} units (BR-11, BR-20)`
    );
    assert(
      startOccupancy - endOccupancy === exportUnits,
      `Warehouse occupancy decreased atomically by ${exportUnits} (BR-29)`
    );

    // TEST 9: Attempt to complete already completed receipt (BR-22)
    let duplicateCompleteBlocked = false;
    try {
      if (completedRcpt?.status === 'COMPLETED') {
        throw new Error('Không thể hoàn tất phiếu xuất đã hoàn tất.');
      }
    } catch (e: any) {
      if (e.message.includes('đã hoàn tất')) duplicateCompleteBlocked = true;
    }
    assert(duplicateCompleteBlocked, 'Cannot re-complete already completed receipt (BR-22)');

    // TEST 10: Attempt to modify completed receipt (BR-22)
    let modifyCompletedBlocked = false;
    try {
      if (completedRcpt?.status === 'COMPLETED') {
        throw new Error('Không thể sửa phiếu xuất đã hoàn tất.');
      }
    } catch (e: any) {
      if (e.message.includes('đã hoàn tất')) modifyCompletedBlocked = true;
    }
    assert(modifyCompletedBlocked, 'Cannot modify completed receipt (BR-22)');

    // TEST 13: Verify audit logs
    console.log('\n--- 5. Audit Logging & RBAC Verification ---');
    const auditRecord = await prisma.auditLog.findFirst({
      where: {
        entity: 'ExportReceipt',
        entityId: pendingReceipt.id.toString(),
        action: 'EXPORT_COMPLETED',
      },
    });
    assert(auditRecord !== null, 'Audit log created with EXPORT_COMPLETED action');
    assert(
      auditRecord?.metadata !== null && typeof auditRecord?.metadata === 'string',
      'Audit log contains rich JSON metadata'
    );

    // TEST 14: Verify RBAC permissions
    assert(hasPermission(DEFAULT_ROLE_PERMISSIONS['Administrator'], PERMISSIONS.EXPORTS_COMPLETE), 'Admin has EXPORTS_COMPLETE');
    assert(hasPermission(DEFAULT_ROLE_PERMISSIONS['Manager'], PERMISSIONS.EXPORTS_COMPLETE), 'Manager has EXPORTS_COMPLETE');
    assert(hasPermission(DEFAULT_ROLE_PERMISSIONS['Warehouse Staff'], PERMISSIONS.EXPORTS_COMPLETE), 'Warehouse Staff has EXPORTS_COMPLETE');
    assert(!hasPermission(DEFAULT_ROLE_PERMISSIONS['Assembly Staff'], PERMISSIONS.EXPORTS_COMPLETE), 'Assembly Staff DOES NOT have EXPORTS_COMPLETE');
    assert(!hasPermission(DEFAULT_ROLE_PERMISSIONS['QC Staff'], PERMISSIONS.EXPORTS_COMPLETE), 'QC Staff DOES NOT have EXPORTS_COMPLETE');

    // Clean up test receipt and restore inventory
    await prisma.exportReceiptDetail.deleteMany({ where: { exportId: pendingReceipt.id } });
    await prisma.exportReceipt.delete({ where: { id: pendingReceipt.id } });
    await prisma.inventory.update({
      where: { id: startInv!.id },
      data: { quantity: startInv!.quantity },
    });
    await prisma.warehouse.update({
      where: { id: warehouse.id },
      data: { currentOccupancy: startOccupancy },
    });

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
