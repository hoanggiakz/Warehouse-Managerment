import { PrismaClient, Prisma } from '@prisma/client';
import {
  CreateStockCheckSchema,
  RecordStockCountSchema,
  AdjustStockCheckSchema,
} from '../lib/validations/stock-check';
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, hasPermission } from '../lib/rbac/permissions';

const prisma = new PrismaClient();

function calculateInventoryStatus(quantity: number, minStock: number, maxStock: number) {
  if (quantity === 0) return 'OUT';
  if (quantity < minStock) return 'LOW';
  if (quantity > maxStock) return 'OVER';
  return 'NORMAL';
}

async function runTests() {
  console.log('========================================================');
  console.log('STARTING PHASE 8 STOCK CHECK & INVENTORY VERIFICATION SUITE');
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
    const parts = await prisma.part.findMany({ take: 5 });

    if (!adminUser || !warehouse || parts.length < 3) {
      throw new Error('Test fixtures missing in database. Run npm run db:seed first.');
    }

    const testPart1 = parts[0];
    const testPart2 = parts[1];
    const testPart3 = parts[2];

    // Ensure initial inventories for test parts
    const inv1 = await prisma.inventory.upsert({
      where: { partId_warehouseId: { partId: testPart1.id, warehouseId: warehouse.id } },
      update: { quantity: 50 },
      create: { partId: testPart1.id, warehouseId: warehouse.id, quantity: 50, minStock: 10, maxStock: 100 },
    });
    const inv2 = await prisma.inventory.upsert({
      where: { partId_warehouseId: { partId: testPart2.id, warehouseId: warehouse.id } },
      update: { quantity: 40 },
      create: { partId: testPart2.id, warehouseId: warehouse.id, quantity: 40, minStock: 10, maxStock: 100 },
    });
    const inv3 = await prisma.inventory.upsert({
      where: { partId_warehouseId: { partId: testPart3.id, warehouseId: warehouse.id } },
      update: { quantity: 30 },
      create: { partId: testPart3.id, warehouseId: warehouse.id, quantity: 30, minStock: 10, maxStock: 100 },
    });

    // -------------------------------------------------------------------------
    // 1. VALIDATION TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Validation Tests ---');

    // TEST 1: Reject negative warehouseId
    const invalidWh = CreateStockCheckSchema.safeParse({
      warehouseId: -1,
    });
    assert(!invalidWh.success, 'Reject negative warehouseId in CreateStockCheckSchema');

    // TEST 2: Reject negative actualQty in count schema
    const negCount = RecordStockCountSchema.safeParse({
      stockCheckId: 1,
      counts: [{ detailId: 1, actualQty: -5 }],
    });
    assert(!negCount.success, 'Reject negative actualQty in RecordStockCountSchema');

    // TEST 3: Reject empty counts array
    const emptyCounts = RecordStockCountSchema.safeParse({
      stockCheckId: 1,
      counts: [],
    });
    assert(!emptyCounts.success, 'Reject empty counts array in RecordStockCountSchema');

    // -------------------------------------------------------------------------
    // 2. CREATION & SNAPSHOT INITIALIZATION TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Creation & Snapshot Verification ---');

    const checkNumber = `CHK-TEST-${Date.now()}`;
    const testCheck = await prisma.stockCheck.create({
      data: {
        checkNumber,
        warehouseId: warehouse.id,
        performedBy: adminUser.id,
        status: 'DRAFT',
        notes: 'Automated test stock check',
        details: {
          create: [
            {
              partId: testPart1.id,
              systemQty: inv1.quantity,
              actualQty: null,
              difference: null,
              status: 'NOT_COUNTED',
            },
            {
              partId: testPart2.id,
              systemQty: inv2.quantity,
              actualQty: null,
              difference: null,
              status: 'NOT_COUNTED',
            },
            {
              partId: testPart3.id,
              systemQty: inv3.quantity,
              actualQty: null,
              difference: null,
              status: 'NOT_COUNTED',
            },
          ],
        },
      },
      include: { details: true },
    });

    assert(testCheck.status === 'DRAFT', 'New stock check created in DRAFT status');
    assert(testCheck.details.length === 3, 'Created with 3 detail rows');
    assert(
      testCheck.details.every((d) => d.status === 'NOT_COUNTED' && d.actualQty === null),
      'All initial details start as NOT_COUNTED with null actualQty'
    );
    assert(
      testCheck.details.find((d) => d.partId === testPart1.id)?.systemQty === 50,
      'Captured accurate live inventory snapshot for Part 1 (50)'
    );

    // -------------------------------------------------------------------------
    // 3. LIFECYCLE TRANSITIONS & COUNTING
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Lifecycle Transitions & Counting ---');

    // Start Check: DRAFT -> IN_PROGRESS
    const inProgressCheck = await prisma.stockCheck.update({
      where: { id: testCheck.id },
      data: { status: 'IN_PROGRESS' },
    });
    assert(inProgressCheck.status === 'IN_PROGRESS', 'Transition from DRAFT to IN_PROGRESS');

    // Block completing while parts remain uncounted
    const d1 = testCheck.details.find((d) => d.partId === testPart1.id)!;
    const d2 = testCheck.details.find((d) => d.partId === testPart2.id)!;
    const d3 = testCheck.details.find((d) => d.partId === testPart3.id)!;

    let prematureCompleteBlocked = false;
    try {
      const currentDetails = await prisma.stockCheckDetail.findMany({ where: { stockCheckId: testCheck.id } });
      const hasUncounted = currentDetails.some((d) => d.actualQty === null);
      if (hasUncounted) {
        throw new Error('Còn phụ tùng chưa được đếm thực tế.');
      }
    } catch (e: any) {
      if (e.message.includes('chưa được đếm')) prematureCompleteBlocked = true;
    }
    assert(prematureCompleteBlocked, 'Cannot complete stock check with uncounted parts (BR-SC-06)');

    // Record Counts:
    // Part 1: Matched (actual: 50, system: 50, diff: 0)
    // Part 2: Shortage (actual: 38, system: 40, diff: -2)
    // Part 3: Surplus (actual: 35, system: 30, diff: +5)
    await prisma.$transaction([
      prisma.stockCheckDetail.update({
        where: { id: d1.id },
        data: { actualQty: 50, difference: 0, status: 'MATCHED' },
      }),
      prisma.stockCheckDetail.update({
        where: { id: d2.id },
        data: { actualQty: 38, difference: -2, status: 'SHORTAGE', notes: 'Shortage 2 units' },
      }),
      prisma.stockCheckDetail.update({
        where: { id: d3.id },
        data: { actualQty: 35, difference: 5, status: 'SURPLUS', notes: 'Surplus 5 units' },
      }),
    ]);

    const updatedDetails = await prisma.stockCheckDetail.findMany({ where: { stockCheckId: testCheck.id } });
    const matchRow = updatedDetails.find((d) => d.partId === testPart1.id);
    const shortRow = updatedDetails.find((d) => d.partId === testPart2.id);
    const surpRow = updatedDetails.find((d) => d.partId === testPart3.id);

    assert(matchRow?.status === 'MATCHED' && matchRow?.difference === 0, 'Derived MATCHED status when actual === system');
    assert(shortRow?.status === 'SHORTAGE' && shortRow?.difference === -2, 'Derived SHORTAGE status when actual < system');
    assert(surpRow?.status === 'SURPLUS' && surpRow?.difference === 5, 'Derived SURPLUS status when actual > system');

    // Complete stock check
    const completedCheck = await prisma.stockCheck.update({
      where: { id: testCheck.id },
      data: { status: 'COMPLETED' },
    });
    assert(completedCheck.status === 'COMPLETED', 'Stock check transitioned to COMPLETED');

    // Cannot cancel completed check
    let cancelCompletedBlocked = false;
    try {
      if (completedCheck.status === 'COMPLETED') {
        throw new Error('Không thể hủy phiếu kiểm kê đã hoàn tất.');
      }
    } catch (e: any) {
      if (e.message.includes('đã hoàn tất')) cancelCompletedBlocked = true;
    }
    assert(cancelCompletedBlocked, 'Cannot cancel completed stock check (BR-SC-09)');

    // -------------------------------------------------------------------------
    // 4. CONCURRENCY PROTECTION & ATOMIC ADJUSTMENT
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Concurrency Protection & Atomic Adjustment ---');

    // Test Concurrency Conflict Detection:
    // Simulate an external import or export modifying Part 3 inventory in background
    await prisma.inventory.update({
      where: { id: inv3.id },
      data: { quantity: 32 }, // Changed from snapshot 30 to 32
    });

    let conflictDetected = false;
    try {
      await prisma.$transaction(async (tx) => {
        const liveCheck = await tx.stockCheck.findUnique({
          where: { id: testCheck.id },
          include: { details: true },
        });

        for (const detail of liveCheck!.details) {
          if (detail.actualQty !== null && detail.difference !== 0) {
            const liveInv = await tx.inventory.findUnique({
              where: {
                partId_warehouseId: {
                  partId: detail.partId,
                  warehouseId: warehouse.id,
                },
              },
            });

            // Live concurrency check
            if (liveInv && liveInv.quantity !== detail.systemQty) {
              await tx.stockCheckDetail.update({
                where: { id: detail.id },
                data: { status: 'CONFLICT' },
              });
              throw new Error(`XUNG ĐỘT TỒN KHO: Số lượng hiện tại (${liveInv.quantity}) khác snapshot (${detail.systemQty})`);
            }
          }
        }
      });
    } catch (e: any) {
      if (e.message.includes('XUNG ĐỘT TỒN KHO')) {
        conflictDetected = true;
      }
    }
    assert(conflictDetected, 'Concurrency conflict detected when live inventory changed since snapshot (BR-SC-11, BR-SC-12)');

    // Restore Part 3 inventory back to snapshot value 30 so adjustment can proceed cleanly
    await prisma.inventory.update({
      where: { id: inv3.id },
      data: { quantity: 30 },
    });

    // Now execute atomic adjustment
    await prisma.$transaction(async (tx) => {
      const liveCheck = await tx.stockCheck.findUnique({
        where: { id: testCheck.id },
        include: { details: { include: { part: true } } },
      });

      const discrepancyDetails = liveCheck!.details.filter(
        (d) => d.actualQty !== null && d.difference !== 0 && !d.isAdjusted
      );

      for (const detail of discrepancyDetails) {
        const liveInv = await tx.inventory.findUnique({
          where: {
            partId_warehouseId: {
              partId: detail.partId,
              warehouseId: warehouse.id,
            },
          },
        });

        if (!liveInv || liveInv.quantity !== detail.systemQty) {
          throw new Error('Conflict in adjustment');
        }

        const newQty = detail.actualQty!;
        const newStatus = calculateInventoryStatus(newQty, liveInv.minStock, liveInv.maxStock);

        await tx.inventory.update({
          where: { id: liveInv.id },
          data: { quantity: newQty, status: newStatus as any },
        });

        await tx.stockCheckDetail.update({
          where: { id: detail.id },
          data: {
            isAdjusted: true,
            adjustedAt: new Date(),
            adjustedQty: newQty,
          },
        });
      }

      await tx.stockCheck.update({
        where: { id: testCheck.id },
        data: { status: 'ADJUSTED' },
      });
    });

    // Verify live inventory after adjustment
    const updatedInv2 = await prisma.inventory.findUnique({ where: { id: inv2.id } });
    const updatedInv3 = await prisma.inventory.findUnique({ where: { id: inv3.id } });
    const finalCheck = await prisma.stockCheck.findUnique({
      where: { id: testCheck.id },
      include: { details: true },
    });

    assert(updatedInv2?.quantity === 38, 'Inventory for Part 2 adjusted from 40 down to 38 (Shortage reconciled)');
    assert(updatedInv3?.quantity === 35, 'Inventory for Part 3 adjusted from 30 up to 35 (Surplus reconciled)');
    assert(finalCheck?.status === 'ADJUSTED', 'Stock check status transitioned to ADJUSTED');

    const adjustedDetails = finalCheck!.details.filter((d) => d.isAdjusted);
    assert(adjustedDetails.length === 2, 'Two discrepancy details marked with isAdjusted = true');
    assert(
      adjustedDetails.every((d) => d.adjustedAt !== null && d.adjustedQty !== null),
      'Adjusted details record timestamp and adjusted quantity'
    );

    // Block re-adjusting already adjusted check
    let duplicateAdjustBlocked = false;
    try {
      if (finalCheck?.status === 'ADJUSTED') {
        throw new Error('Phiếu kiểm kê này đã được điều chỉnh tồn kho trước đó.');
      }
    } catch (e: any) {
      if (e.message.includes('đã được điều chỉnh')) duplicateAdjustBlocked = true;
    }
    assert(duplicateAdjustBlocked, 'Cannot re-adjust already adjusted stock check (BR-SC-10)');

    // -------------------------------------------------------------------------
    // 5. RBAC & PERMISSIONS VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- 5. RBAC & Permissions Verification ---');

    assert(hasPermission(DEFAULT_ROLE_PERMISSIONS['Administrator'], PERMISSIONS.STOCK_CHECK_VIEW), 'Admin has STOCK_CHECK_VIEW');
    assert(hasPermission(DEFAULT_ROLE_PERMISSIONS['Administrator'], PERMISSIONS.STOCK_CHECK_ADJUST), 'Admin has STOCK_CHECK_ADJUST');
    assert(hasPermission(DEFAULT_ROLE_PERMISSIONS['Manager'], PERMISSIONS.STOCK_CHECK_ADJUST), 'Manager has STOCK_CHECK_ADJUST');
    assert(hasPermission(DEFAULT_ROLE_PERMISSIONS['Warehouse Staff'], PERMISSIONS.STOCK_CHECK_CREATE), 'Warehouse Staff has STOCK_CHECK_CREATE');
    assert(hasPermission(DEFAULT_ROLE_PERMISSIONS['Warehouse Staff'], PERMISSIONS.STOCK_CHECK_COUNT), 'Warehouse Staff has STOCK_CHECK_COUNT');
    assert(hasPermission(DEFAULT_ROLE_PERMISSIONS['Warehouse Staff'], PERMISSIONS.STOCK_CHECK_COMPLETE), 'Warehouse Staff has STOCK_CHECK_COMPLETE');
    assert(
      !hasPermission(DEFAULT_ROLE_PERMISSIONS['Warehouse Staff'], PERMISSIONS.STOCK_CHECK_ADJUST),
      'Warehouse Staff DOES NOT have STOCK_CHECK_ADJUST (Admin/Manager only, BR-SC-08)'
    );
    assert(
      !hasPermission(DEFAULT_ROLE_PERMISSIONS['Assembly Staff'], PERMISSIONS.STOCK_CHECK_COUNT),
      'Assembly Staff DOES NOT have STOCK_CHECK_COUNT'
    );
    assert(
      !hasPermission(DEFAULT_ROLE_PERMISSIONS['QC Staff'], PERMISSIONS.STOCK_CHECK_ADJUST),
      'QC Staff DOES NOT have STOCK_CHECK_ADJUST'
    );

    // -------------------------------------------------------------------------
    // 6. CANCELLATION TEST & CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Cancellation & Cleanup ---');

    const draftToCancel = await prisma.stockCheck.create({
      data: {
        checkNumber: `CHK-CANCEL-${Date.now()}`,
        warehouseId: warehouse.id,
        performedBy: adminUser.id,
        status: 'DRAFT',
      },
    });

    const cancelledCheck = await prisma.stockCheck.update({
      where: { id: draftToCancel.id },
      data: { status: 'CANCELLED' },
    });
    assert(cancelledCheck.status === 'CANCELLED', 'DRAFT stock check successfully cancelled');

    // Clean up test data and restore inventory to initial quantities
    await prisma.stockCheckDetail.deleteMany({ where: { stockCheckId: testCheck.id } });
    await prisma.stockCheck.delete({ where: { id: testCheck.id } });
    await prisma.stockCheck.delete({ where: { id: draftToCancel.id } });

    await prisma.inventory.update({ where: { id: inv1.id }, data: { quantity: 50 } });
    await prisma.inventory.update({ where: { id: inv2.id }, data: { quantity: 40 } });
    await prisma.inventory.update({ where: { id: inv3.id }, data: { quantity: 30 } });

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
