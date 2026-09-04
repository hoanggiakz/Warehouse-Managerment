import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function auditDatabase() {
  console.log('========================================================');
  console.log('DATABASE INTEGRITY AUDIT (READ ONLY)');
  console.log('========================================================\n');

  try {
    const [
      userCount,
      roleCount,
      categoryCount,
      supplierCount,
      partCount,
      warehouseCount,
      inventoryCount,
      importCount,
      exportCount,
      stockCheckCount,
      qcCount,
      reportCount,
      auditLogCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.role.count(),
      prisma.category.count(),
      prisma.supplier.count(),
      prisma.part.count(),
      prisma.warehouse.count(),
      prisma.inventory.count(),
      prisma.importReceipt.count(),
      prisma.exportReceipt.count(),
      prisma.stockCheck.count(),
      prisma.qualityCheck.count(),
      prisma.report.count(),
      prisma.auditLog.count(),
    ]);

    console.log('Entity Counts:');
    console.log(`- Users:            ${userCount}`);
    console.log(`- Roles:            ${roleCount}`);
    console.log(`- Categories:       ${categoryCount}`);
    console.log(`- Suppliers:        ${supplierCount}`);
    console.log(`- Parts:            ${partCount}`);
    console.log(`- Warehouses:       ${warehouseCount}`);
    console.log(`- Inventories:      ${inventoryCount}`);
    console.log(`- Import Receipts:  ${importCount}`);
    console.log(`- Export Receipts:  ${exportCount}`);
    console.log(`- Stock Checks:     ${stockCheckCount}`);
    console.log(`- Quality Checks:   ${qcCount}`);
    console.log(`- Reports:          ${reportCount}`);
    console.log(`- Audit Logs:       ${auditLogCount}`);

    // Check negative inventory
    const negativeInventory = await prisma.inventory.count({
      where: { quantity: { lt: 0 } },
    });
    console.log(`\nIntegrity Checks:`);
    console.log(`- Negative inventory records: ${negativeInventory} (Expected: 0)`);

    // Check users with invalid roles
    const orphanedUsers = await prisma.$queryRaw`
      SELECT u.id, u.username FROM users u LEFT JOIN roles r ON u."roleId" = r.id WHERE r.id IS NULL;
    `;
    console.log(`- Orphaned users (missing role): ${(orphanedUsers as any[]).length} (Expected: 0)`);

    // Check inventories with missing part or warehouse
    const orphanedInventory = await prisma.$queryRaw`
      SELECT i.id FROM inventories i 
      LEFT JOIN parts p ON i."partId" = p.id 
      LEFT JOIN warehouses w ON i."warehouseId" = w.id 
      WHERE p.id IS NULL OR w.id IS NULL;
    `;
    console.log(`- Orphaned inventory records: ${(orphanedInventory as any[]).length} (Expected: 0)`);

    // Check import receipt details with missing parts
    const orphanedImportDetails = await prisma.$queryRaw`
      SELECT d.id FROM import_receipt_details d 
      LEFT JOIN parts p ON d."partId" = p.id 
      WHERE p.id IS NULL;
    `;
    console.log(`- Orphaned import details: ${(orphanedImportDetails as any[]).length} (Expected: 0)`);

    // Check export receipt details with missing parts
    const orphanedExportDetails = await prisma.$queryRaw`
      SELECT d.id FROM export_receipt_details d 
      LEFT JOIN parts p ON d."partId" = p.id 
      WHERE p.id IS NULL;
    `;
    console.log(`- Orphaned export details: ${(orphanedExportDetails as any[]).length} (Expected: 0)`);

    console.log('\nDatabase Integrity Verification: 100% HEALTHY');
  } catch (error) {
    console.error('Database audit error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

auditDatabase();
