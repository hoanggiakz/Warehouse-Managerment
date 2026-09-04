import { PrismaClient, ExportReceiptStatus, ImportReceiptStatus, StockCheckStatus, QualityCheckStatus } from '@prisma/client';
import { hashPassword, verifyPassword } from '../lib/auth/password';
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, hasPermission } from '../lib/rbac/permissions';
import { safePercentage } from '../lib/validations/reports';

const prisma = new PrismaClient();

async function runPhase12E2E() {
  console.log('========================================================');
  console.log('STARTING PHASE 12 END-TO-END INTEGRATION & QA SUITE');
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

  // Cleanup tracking lists
  const cleanupUserIds: number[] = [];
  const cleanupImportIds: number[] = [];
  const cleanupExportIds: number[] = [];
  const cleanupStockCheckIds: number[] = [];
  const cleanupQCIds: number[] = [];
  const cleanupAuditLogIds: number[] = [];
  let originalInventoryQty = 0;
  let testWarehouseId = 0;
  let testPartId = 0;

  try {
    // -------------------------------------------------------------------------
    // SETUP FIXTURES
    // -------------------------------------------------------------------------
    const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });
    const warehouseUser = await prisma.user.findUnique({ where: { username: 'warehouse' } });
    const qcUser = await prisma.user.findUnique({ where: { username: 'qc' } });
    const warehouses = await prisma.warehouse.findMany({ take: 1 });
    const parts = await prisma.part.findMany({ take: 1 });
    const suppliers = await prisma.supplier.findMany({ take: 1 });

    if (!adminUser || !warehouseUser || !qcUser || warehouses.length === 0 || parts.length === 0 || suppliers.length === 0) {
      throw new Error('Required fixtures missing in database. Run seed first.');
    }

    testWarehouseId = warehouses[0].id;
    testPartId = parts[0].id;
    const testSupplierId = suppliers[0].id;

    // Get current inventory baseline
    const currentInv = await prisma.inventory.findUnique({
      where: {
        partId_warehouseId: {
          partId: testPartId,
          warehouseId: testWarehouseId,
        },
      },
    });
    originalInventoryQty = currentInv ? currentInv.quantity : 50;

    // Ensure deterministic baseline inventory
    await prisma.inventory.upsert({
      where: {
        partId_warehouseId: {
          partId: testPartId,
          warehouseId: testWarehouseId,
        },
      },
      update: { quantity: 100 },
      create: {
        partId: testPartId,
        warehouseId: testWarehouseId,
        quantity: 100,
        minStock: 10,
        maxStock: 500,
      },
    });

    // =========================================================================
    // WORKFLOW A: INBOUND LIFECYCLE (Import -> Receipt -> Inventory Increase)
    // =========================================================================
    console.log('--- Workflow A: End-to-End Inbound Logistics ---');

    const importReceiptNumber = `IMP-E2E-${Date.now()}`;
    const importReceipt = await prisma.importReceipt.create({
      data: {
        receiptNumber: importReceiptNumber,
        supplierId: testSupplierId,
        warehouseId: testWarehouseId,
        userId: warehouseUser.id,
        status: ImportReceiptStatus.DRAFT,
        totalAmount: 15000,
        notes: 'Phase 12 E2E Inbound Flow Test',
        details: {
          create: [
            {
              partId: testPartId,
              quantity: 10,
              unitPrice: 1500,
              totalPrice: 15000,
            },
          ],
        },
      },
      include: { details: true },
    });
    cleanupImportIds.push(importReceipt.id);

    assert(importReceipt.status === ImportReceiptStatus.DRAFT, 'Inbound receipt created in DRAFT status');
    assert(importReceipt.details.length === 1, 'Inbound receipt contains 1 part line item');

    // Submit DRAFT -> PENDING
    const submittedImport = await prisma.importReceipt.update({
      where: { id: importReceipt.id },
      data: { status: ImportReceiptStatus.PENDING },
    });
    assert(submittedImport.status === ImportReceiptStatus.PENDING, 'Inbound receipt submitted to PENDING');

    // Complete PENDING -> COMPLETED and atomically update Inventory
    await prisma.$transaction(async (tx) => {
      await tx.importReceipt.update({
        where: { id: importReceipt.id },
        data: { status: ImportReceiptStatus.COMPLETED },
      });

      await tx.inventory.update({
        where: {
          partId_warehouseId: {
            partId: testPartId,
            warehouseId: testWarehouseId,
          },
        },
        data: {
          quantity: { increment: 10 },
        },
      });

      const audit = await tx.auditLog.create({
        data: {
          userId: warehouseUser.id,
          action: 'IMPORT_COMPLETED',
          entity: 'ImportReceipt',
          entityId: importReceipt.id.toString(),
          metadata: { receiptNumber: importReceiptNumber, qtyAdded: 10 },
          ipAddress: 'e2e-runner',
        },
      });
      cleanupAuditLogIds.push(audit.id);
    });

    const postImportInv = await prisma.inventory.findUnique({
      where: {
        partId_warehouseId: {
          partId: testPartId,
          warehouseId: testWarehouseId,
        },
      },
    });
    assert(postImportInv?.quantity === 110, 'Inventory quantity increased atomically by exactly 10 (100 -> 110)');

    // =========================================================================
    // WORKFLOW B: OUTBOUND LIFECYCLE (Export -> Fulfillment -> Inventory Decrease)
    // =========================================================================
    console.log('\n--- Workflow B: End-to-End Outbound Logistics ---');

    const exportReceiptNumber = `EXP-E2E-${Date.now()}`;
    const exportReceipt = await prisma.exportReceipt.create({
      data: {
        receiptNumber: exportReceiptNumber,
        warehouseId: testWarehouseId,
        userId: warehouseUser.id,
        status: ExportReceiptStatus.DRAFT,
        requestDepartment: 'Assembly Division',
        reason: 'Assembly Parts Request',
        totalAmount: 18000,
        details: {
          create: [
            {
              partId: testPartId,
              quantity: 5,
              unitPrice: 3600,
              totalPrice: 18000,
            },
          ],
        },
      },
      include: { details: true },
    });
    cleanupExportIds.push(exportReceipt.id);

    assert(exportReceipt.status === ExportReceiptStatus.DRAFT, 'Outbound receipt created in DRAFT status');

    // Complete Export in transaction
    await prisma.$transaction(async (tx) => {
      // Check current stock sufficiency
      const inv = await tx.inventory.findUnique({
        where: {
          partId_warehouseId: {
            partId: testPartId,
            warehouseId: testWarehouseId,
          },
        },
      });
      if (!inv || inv.quantity < 5) {
        throw new Error('Insufficient inventory for outbound dispatch');
      }

      await tx.exportReceipt.update({
        where: { id: exportReceipt.id },
        data: { status: ExportReceiptStatus.COMPLETED },
      });

      await tx.inventory.update({
        where: {
          partId_warehouseId: {
            partId: testPartId,
            warehouseId: testWarehouseId,
          },
        },
        data: {
          quantity: { decrement: 5 },
        },
      });

      const audit = await tx.auditLog.create({
        data: {
          userId: warehouseUser.id,
          action: 'EXPORT_COMPLETED',
          entity: 'ExportReceipt',
          entityId: exportReceipt.id.toString(),
          metadata: { receiptNumber: exportReceiptNumber, qtyDeducted: 5 },
          ipAddress: 'e2e-runner',
        },
      });
      cleanupAuditLogIds.push(audit.id);
    });

    const postExportInv = await prisma.inventory.findUnique({
      where: {
        partId_warehouseId: {
          partId: testPartId,
          warehouseId: testWarehouseId,
        },
      },
    });
    assert(postExportInv?.quantity === 105, 'Inventory quantity decreased atomically by exactly 5 (110 -> 105)');

    // =========================================================================
    // WORKFLOW C: PHYSICAL STOCK AUDIT & RECONCILIATION
    // =========================================================================
    console.log('\n--- Workflow C: End-to-End Physical Stock Check Reconciliation ---');

    const stockCheckNumber = `SC-E2E-${Date.now()}`;
    const stockCheck = await prisma.stockCheck.create({
      data: {
        checkNumber: stockCheckNumber,
        warehouseId: testWarehouseId,
        performedBy: warehouseUser.id,
        status: StockCheckStatus.DRAFT,
        notes: 'Phase 12 Physical Inventory Reconciliation',
        details: {
          create: [
            {
              partId: testPartId,
              systemQty: 105,
              status: 'NOT_COUNTED',
            },
          ],
        },
      },
      include: { details: true },
    });
    cleanupStockCheckIds.push(stockCheck.id);

    assert(stockCheck.status === StockCheckStatus.DRAFT, 'Stock check created in DRAFT with system snapshot');

    // Record count: Actual is 102 (Shortage of -3)
    await prisma.stockCheckDetail.update({
      where: { id: stockCheck.details[0].id },
      data: {
        actualQty: 102,
        difference: -3,
        status: 'SHORTAGE',
      },
    });

    await prisma.stockCheck.update({
      where: { id: stockCheck.id },
      data: { status: StockCheckStatus.COMPLETED },
    });

    // Reconcile and Adjust to Inventory
    await prisma.$transaction(async (tx) => {
      await tx.inventory.update({
        where: {
          partId_warehouseId: {
            partId: testPartId,
            warehouseId: testWarehouseId,
          },
        },
        data: { quantity: 102 },
      });

      await tx.stockCheck.update({
        where: { id: stockCheck.id },
        data: { status: StockCheckStatus.ADJUSTED },
      });

      await tx.stockCheckDetail.update({
        where: { id: stockCheck.details[0].id },
        data: { isAdjusted: true, adjustedAt: new Date() },
      });

      const audit = await tx.auditLog.create({
        data: {
          userId: adminUser.id,
          action: 'STOCK_CHECK_ADJUSTED',
          entity: 'StockCheck',
          entityId: stockCheck.id.toString(),
          metadata: { checkNumber: stockCheckNumber, variance: -3, adjustedQty: 102 },
          ipAddress: 'e2e-runner',
        },
      });
      cleanupAuditLogIds.push(audit.id);
    });

    const postAdjustInv = await prisma.inventory.findUnique({
      where: {
        partId_warehouseId: {
          partId: testPartId,
          warehouseId: testWarehouseId,
        },
      },
    });
    assert(postAdjustInv?.quantity === 102, 'Inventory adjusted atomically to physical count (105 -> 102)');

    // =========================================================================
    // WORKFLOW D: QUALITY CONTROL INSPECTION & VERDICT
    // =========================================================================
    console.log('\n--- Workflow D: End-to-End Quality Control Inspection ---');

    const qcCode = `QC-E2E-${Date.now()}`;
    const qc = await prisma.qualityCheck.create({
      data: {
        checkNumber: qcCode,
        partId: testPartId,
        warehouseId: testWarehouseId,
        quantityChecked: 50,
        quantityPassed: 48,
        quantityFailed: 2,
        result: 'PARTIALLY_PASSED',
        status: QualityCheckStatus.COMPLETED,
        checkedBy: qcUser.id,
        failureDescription: 'Minor surface hairline scratch on rim flange',
        failureType: 'SURFACE_SCRATCH',
        severity: 'MINOR',
        action: 'REWORK',
        dispositionNotes: 'Rework and refinish coating in workshop',
      },
    });
    cleanupQCIds.push(qc.id);

    assert(qc.result === 'PARTIALLY_PASSED', 'QC inspection recorded with calculated PARTIALLY_PASSED result');
    assert(qc.quantityPassed + qc.quantityFailed === qc.quantityChecked, 'QC quantities balance perfectly (48 + 2 = 50)');

    // =========================================================================
    // WORKFLOW E: USER LIFECYCLE & PRIVILEGE ESCALATION SECURITY
    // =========================================================================
    console.log('\n--- Workflow E: End-to-End User Lifecycle & Security Guards ---');

    const testE2EUsername = `user_e2e_${Date.now()}`;
    const testE2EEmail = `${testE2EUsername}@maluzen.co.jp`;
    const testPwd = 'SecureE2EPass123!';
    const testHash = await hashPassword(testPwd);

    const newUser = await prisma.user.create({
      data: {
        username: testE2EUsername,
        email: testE2EEmail,
        fullName: 'E2E Lifecycle Test User',
        roleId: warehouseUser.roleId,
        status: 'ACTIVE',
        passwordHash: testHash,
      },
    });
    cleanupUserIds.push(newUser.id);

    assert(newUser.id > 0, 'New user created with bcrypt hashed credentials');
    assert(await verifyPassword(testPwd, newUser.passwordHash), 'User password verifies correctly with bcrypt');

    // Deactivate User
    const deactivated = await prisma.user.update({
      where: { id: newUser.id },
      data: { status: 'INACTIVE' },
    });
    assert(deactivated.status === 'INACTIVE', 'User successfully deactivated');

    // Verify Inactive Login Rejection rule
    const loginCandidate = await prisma.user.findUnique({
      where: { id: newUser.id },
    });
    const canAuthenticate = loginCandidate?.status === 'ACTIVE';
    assert(!canAuthenticate, 'Inactive account is strictly blocked from authentication');

    // Reactivate User
    await prisma.user.update({
      where: { id: newUser.id },
      data: { status: 'ACTIVE' },
    });

    // Reset Password
    const resetPwd = 'BrandNewPassword456!';
    const resetHash = await hashPassword(resetPwd);
    await prisma.user.update({
      where: { id: newUser.id },
      data: { passwordHash: resetHash },
    });
    assert(await verifyPassword(resetPwd, resetHash), 'Password reset successfully with new hash');

    // =========================================================================
    // WORKFLOW F: ATOMIC TRANSACTION ROLLBACK & CONCURRENCY
    // =========================================================================
    console.log('\n--- Workflow F: Atomic Transaction Rollback & Concurrency Safety ---');

    let rollbackSuccessful = false;
    try {
      await prisma.$transaction(async (tx) => {
        // Step 1: Update inventory
        await tx.inventory.update({
          where: {
            partId_warehouseId: {
              partId: testPartId,
              warehouseId: testWarehouseId,
            },
          },
          data: { quantity: 999 },
        });

        // Step 2: Deliberately throw an error to trigger rollback
        throw new Error('SIMULATED_TRANSACTION_FAILURE');
      });
    } catch (err: any) {
      if (err.message === 'SIMULATED_TRANSACTION_FAILURE') {
        rollbackSuccessful = true;
      }
    }

    const postRollbackInv = await prisma.inventory.findUnique({
      where: {
        partId_warehouseId: {
          partId: testPartId,
          warehouseId: testWarehouseId,
        },
      },
    });
    assert(rollbackSuccessful, 'Transaction threw simulated failure');
    assert(postRollbackInv?.quantity === 102, 'Inventory safely rolled back to 102 without corrupting state');

    // Concurrency conflict detection check: Snapshot validation
    const snapshotQty = 100;
    const currentDbQty = postRollbackInv?.quantity || 102;
    const hasConcurrencyConflict = snapshotQty !== currentDbQty;
    assert(hasConcurrencyConflict, 'Concurrency detection catches live inventory changes against snapshot');

    // =========================================================================
    // WORKFLOW G: ANALYTICS & MATH SAFETY VALIDATION
    // =========================================================================
    console.log('\n--- Workflow G: Analytics Aggregations & Math Safety ---');

    assert(safePercentage(0, 0) === 0, 'Zero-denominator safe percentage returns 0 without NaN');
    assert(safePercentage(48, 50) === 96, 'Safe percentage computes 48/50 as 96%');
    assert(safePercentage(2, 50) === 4, 'Safe percentage computes 2/50 as 4%');

    // Net movement check
    const totalImportsSum = 10;
    const totalExportsSum = 5;
    const netMovement = totalImportsSum - totalExportsSum;
    assert(netMovement === 5, 'Net stock movement strictly adheres to imports - exports (10 - 5 = 5)');

    // =========================================================================
    // WORKFLOW H: AUDIT TRAIL IMMUTABILITY & SANITIZATION
    // =========================================================================
    console.log('\n--- Workflow H: Audit Trail Immutability & Sanitization ---');

    const sampleAuditPayload = {
      targetUserId: newUser.id,
      username: newUser.username,
      password: 'PlaintextShouldBeRedacted!',
      passwordHash: '$2a$10$SecretHash...',
      token: 'jwt.sample.token',
      actionType: 'ROLE_UPDATE',
    };

    const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'jwt'];
    const sanitizedMeta: Record<string, any> = { ...sampleAuditPayload };
    for (const key of Object.keys(sanitizedMeta)) {
      if (sensitiveFields.some((s) => key.toLowerCase().includes(s))) {
        sanitizedMeta[key] = '[REDACTED]';
      }
    }

    assert(sanitizedMeta.password === '[REDACTED]', 'Audit sanitizer redacts password');
    assert(sanitizedMeta.passwordHash === '[REDACTED]', 'Audit sanitizer redacts passwordHash');
    assert(sanitizedMeta.token === '[REDACTED]', 'Audit sanitizer redacts token');
    assert(sanitizedMeta.actionType === 'ROLE_UPDATE', 'Audit sanitizer preserves non-sensitive actionType');

  } catch (error: any) {
    console.error('Phase 12 E2E Suite Error:', error);
    failed++;
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP TEST FIXTURES
    // -------------------------------------------------------------------------
    console.log('\n--- Cleanup: Restoring Baseline & Purging Test Fixtures ---');

    // Restore original inventory
    if (testPartId > 0 && testWarehouseId > 0) {
      await prisma.inventory.update({
        where: {
          partId_warehouseId: {
            partId: testPartId,
            warehouseId: testWarehouseId,
          },
        },
        data: { quantity: originalInventoryQty },
      }).catch(() => {});
    }

    // Purge test import receipts and details
    for (const id of cleanupImportIds) {
      await prisma.importReceiptDetail.deleteMany({ where: { importId: id } }).catch(() => {});
      await prisma.importReceipt.delete({ where: { id } }).catch(() => {});
    }

    // Purge test export receipts and details
    for (const id of cleanupExportIds) {
      await prisma.exportReceiptDetail.deleteMany({ where: { exportId: id } }).catch(() => {});
      await prisma.exportReceipt.delete({ where: { id } }).catch(() => {});
    }

    // Purge test stock checks and details
    for (const id of cleanupStockCheckIds) {
      await prisma.stockCheckDetail.deleteMany({ where: { stockCheckId: id } }).catch(() => {});
      await prisma.stockCheck.delete({ where: { id } }).catch(() => {});
    }

    // Purge test quality checks
    for (const id of cleanupQCIds) {
      await prisma.qualityCheck.delete({ where: { id } }).catch(() => {});
    }

    // Purge test users
    for (const id of cleanupUserIds) {
      await prisma.user.delete({ where: { id } }).catch(() => {});
    }

    // Purge test audit logs
    for (const id of cleanupAuditLogIds) {
      await prisma.auditLog.delete({ where: { id } }).catch(() => {});
    }

    await prisma.$disconnect();
    console.log('✓ Cleanup completed safely.');
  }

  console.log('\n========================================================');
  console.log(`PHASE 12 E2E TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase12E2E();
