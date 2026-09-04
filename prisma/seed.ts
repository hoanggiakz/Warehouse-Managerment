import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_ROLE_PERMISSIONS } from '../lib/rbac/permissions';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Roles
  const rolesData = Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([name, permissions]) => ({
    name,
    description: `${name} Role`,
    permissions: JSON.stringify(permissions),
  }));

  const roles: Record<string, number> = {};

  for (const roleData of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: { permissions: roleData.permissions },
      create: roleData,
    });
    roles[role.name] = role.id;
    console.log(`Upserted role: ${role.name}`);
  }

  // 2. Demo Users
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const usersData = [
    { username: 'admin', email: 'admin@maluzen.co.jp', fullName: 'System Administrator', roleId: roles['Administrator'] },
    { username: 'manager', email: 'manager@maluzen.co.jp', fullName: 'Operations Manager', roleId: roles['Manager'] },
    { username: 'warehouse', email: 'warehouse@maluzen.co.jp', fullName: 'Warehouse Staff A', roleId: roles['Warehouse Staff'] },
    { username: 'assembly', email: 'assembly@maluzen.co.jp', fullName: 'Assembly Staff A', roleId: roles['Assembly Staff'] },
    { username: 'qc', email: 'qc@maluzen.co.jp', fullName: 'Quality Control Staff', roleId: roles['QC Staff'] },
  ];

  for (const userData of usersData) {
    const user = await prisma.user.upsert({
      where: { username: userData.username },
      update: { roleId: userData.roleId, passwordHash },
      create: { ...userData, passwordHash, status: 'ACTIVE' },
    });
    console.log(`Upserted user: ${user.username}`);
  }

  // 3. Categories
  const catTires = await prisma.category.upsert({
    where: { name: 'Tires' }, update: {}, create: { name: 'Tires' }
  });
  const catWheels = await prisma.category.upsert({
    where: { name: 'Wheels' }, update: {}, create: { name: 'Wheels' }
  });
  const catAccessories = await prisma.category.upsert({
    where: { name: 'Accessories' }, update: {}, create: { name: 'Accessories' }
  });

  const subCategories = [
    { name: 'Summer Tires', parentId: catTires.id },
    { name: 'Winter Tires', parentId: catTires.id },
    { name: 'All-Season Tires', parentId: catTires.id },
    { name: 'Alloy Wheels', parentId: catWheels.id },
    { name: 'Steel Wheels', parentId: catWheels.id },
    { name: 'Forged Wheels', parentId: catWheels.id },
    { name: 'TPMS Sensors', parentId: catAccessories.id },
    { name: 'Lug Nuts', parentId: catAccessories.id },
    { name: 'Valves', parentId: catAccessories.id },
    { name: 'Wheel Spacers', parentId: catAccessories.id },
  ];

  const categoryMap: Record<string, number> = {
    'Tires': catTires.id,
    'Wheels': catWheels.id,
    'Accessories': catAccessories.id
  };

  for (const cat of subCategories) {
    const c = await prisma.category.upsert({
      where: { name: cat.name },
      update: { parentId: cat.parentId },
      create: cat,
    });
    categoryMap[c.name] = c.id;
  }
  console.log('Upserted Categories');

  // 4. Suppliers
  const supplierNames = [
    'Michelin Japan', 'Bridgestone Corporation', 'Dunlop Tires', 
    'Yokohama Rubber', 'BBS Wheels', 'Work Wheels', 'Enkei Tuning'
  ];
  const supplierMap: Record<string, number> = {};

  for (const name of supplierNames) {
    const s = await prisma.supplier.upsert({
      where: { name },
      update: {},
      create: { name, rating: 4.5, status: 'ACTIVE' },
    });
    supplierMap[s.name] = s.id;
  }
  console.log('Upserted Suppliers');

  // 5. Parts
  const partsData = [
    // Wheels
    {
      sku: 'W-BBS-RI-A-18', name: 'BBS RI-A 18inch', brand: 'BBS', categoryId: categoryMap['Forged Wheels'], supplierId: supplierMap['BBS Wheels'],
      unit: 'pcs', purchasePrice: 75000, salePrice: 95000, minStock: 4, maxStock: 20,
      specifications: { size: 18, width: 8.5, pcd: '5x114.3', et: 35, holes: 5, material: 'Forged Aluminum' }
    },
    {
      sku: 'W-ENK-RPF1-17', name: 'Enkei RPF1 17inch', brand: 'Enkei', categoryId: categoryMap['Alloy Wheels'], supplierId: supplierMap['Enkei Tuning'],
      unit: 'pcs', purchasePrice: 25000, salePrice: 35000, minStock: 8, maxStock: 40,
      specifications: { size: 17, width: 7.5, pcd: '4x100', et: 42, holes: 4, material: 'Cast Aluminum' }
    },
    {
      sku: 'W-WRK-EMO-19', name: 'Work Emotion CR Kiwami 19inch', brand: 'Work', categoryId: categoryMap['Alloy Wheels'], supplierId: supplierMap['Work Wheels'],
      unit: 'pcs', purchasePrice: 45000, salePrice: 60000, minStock: 4, maxStock: 16,
      specifications: { size: 19, width: 9.5, pcd: '5x114.3', et: 38, holes: 5, material: 'Cast Aluminum' }
    },
    // Tires
    {
      sku: 'T-MIC-PS4S-235', name: 'Michelin Pilot Sport 4S 235/40R18', brand: 'Michelin', categoryId: categoryMap['Summer Tires'], supplierId: supplierMap['Michelin Japan'],
      unit: 'pcs', purchasePrice: 22000, salePrice: 32000, minStock: 8, maxStock: 50,
      specifications: { width: 235, aspectRatio: 40, diameter: 18, loadIndex: 95, speedRating: 'Y', dot: '2423' }
    },
    {
      sku: 'T-BRI-RE71RS-255', name: 'Bridgestone Potenza RE-71RS 255/35R19', brand: 'Bridgestone', categoryId: categoryMap['Summer Tires'], supplierId: supplierMap['Bridgestone Corporation'],
      unit: 'pcs', purchasePrice: 35000, salePrice: 48000, minStock: 4, maxStock: 20,
      specifications: { width: 255, aspectRatio: 35, diameter: 19, loadIndex: 96, speedRating: 'W', dot: '1823' }
    },
    {
      sku: 'T-YOK-AD09-225', name: 'Yokohama Advan Neova AD09 225/45R17', brand: 'Yokohama', categoryId: categoryMap['Summer Tires'], supplierId: supplierMap['Yokohama Rubber'],
      unit: 'pcs', purchasePrice: 20000, salePrice: 28000, minStock: 12, maxStock: 40,
      specifications: { width: 225, aspectRatio: 45, diameter: 17, loadIndex: 94, speedRating: 'W', dot: '0524' }
    },
    {
      sku: 'T-DUN-WM03-195', name: 'Dunlop Winter Maxx 03 195/65R15', brand: 'Dunlop', categoryId: categoryMap['Winter Tires'], supplierId: supplierMap['Dunlop Tires'],
      unit: 'pcs', purchasePrice: 12000, salePrice: 18000, minStock: 20, maxStock: 100,
      specifications: { width: 195, aspectRatio: 65, diameter: 15, loadIndex: 91, speedRating: 'Q', dot: '3023' }
    },
    // Accessories
    {
      sku: 'A-TPMS-PAC-01', name: 'Pacific Industrial TPMS Sensor', brand: 'Pacific', categoryId: categoryMap['TPMS Sensors'], supplierId: supplierMap['Bridgestone Corporation'],
      unit: 'pcs', purchasePrice: 4000, salePrice: 6500, minStock: 10, maxStock: 50,
      specifications: { type: 'TPMS Sensor', compatibleModels: ['Toyota Corolla', 'Toyota Camry', 'Lexus IS'] }
    },
    {
      sku: 'A-NUT-KYO-M12', name: 'KYO-EI Lug Nut M12x1.5', brand: 'KYO-EI', categoryId: categoryMap['Lug Nuts'], supplierId: supplierMap['Enkei Tuning'],
      unit: 'set', purchasePrice: 3500, salePrice: 5000, minStock: 5, maxStock: 30,
      specifications: { type: 'Lug Nut', compatibleModels: ['Toyota', 'Honda', 'Mazda'] }
    },
    {
      sku: 'A-VAL-RAYS-BK', name: 'RAYS Air Valve Black', brand: 'RAYS', categoryId: categoryMap['Valves'], supplierId: supplierMap['Work Wheels'],
      unit: 'pcs', purchasePrice: 800, salePrice: 1500, minStock: 20, maxStock: 100,
      specifications: { type: 'Air Valve', compatibleModels: ['RAYS Wheels'] }
    }
  ];

  // Adding 15 more parts dynamically to reach 25 parts requirement
  for (let i = 1; i <= 15; i++) {
    partsData.push({
      sku: `T-GEN-AST-${100 + i}`,
      name: `Generic All-Season Tire ${i}`,
      brand: 'Generic',
      categoryId: categoryMap['All-Season Tires'],
      supplierId: supplierMap['Dunlop Tires'],
      unit: 'pcs',
      purchasePrice: 10000 + (i * 500),
      salePrice: 15000 + (i * 700),
      minStock: 10,
      maxStock: 60,
      specifications: { width: 205, aspectRatio: 55, diameter: 16, loadIndex: 91, speedRating: 'V', dot: '0124' }
    });
  }

  for (const part of partsData) {
    await prisma.part.upsert({
      where: { sku: part.sku },
      update: {
        purchasePrice: new Prisma.Decimal(part.purchasePrice),
        salePrice: new Prisma.Decimal(part.salePrice),
        specifications: part.specifications,
      },
      create: {
        ...part,
        purchasePrice: new Prisma.Decimal(part.purchasePrice),
        salePrice: new Prisma.Decimal(part.salePrice),
        specifications: part.specifications,
      },
    });
  }
  console.log(`Upserted ${partsData.length} Parts`);

  // 6. Warehouses
  const warehousesData = [
    { code: 'WH-OSK-01', name: 'Osaka Central Warehouse', address: '1-1-1 Umeda, Kita-ku, Osaka', phone: '06-1234-5678', capacity: 5000, status: 'ACTIVE' },
    { code: 'WH-TKY-02', name: 'Tokyo Regional Depot', address: '2-2-2 Shibuya, Shibuya-ku, Tokyo', phone: '03-9876-5432', capacity: 3000, status: 'ACTIVE' },
    { code: 'WH-KOB-03', name: 'Kobe Assembly Storage', address: '3-3-3 Sannomiya, Chuo-ku, Kobe', phone: '078-111-2222', capacity: 1500, status: 'MAINTENANCE' },
  ];

  const warehouseMap: Record<string, any> = {};

  for (const wh of warehousesData) {
    const w = await prisma.warehouse.upsert({
      where: { code: wh.code },
      update: { name: wh.name, capacity: wh.capacity, status: wh.status as any },
      create: { ...wh, status: wh.status as any },
    });
    warehouseMap[w.code] = w;
  }
  console.log('Upserted Warehouses');

  // 7. Inventory
  // Fetch parts to create logical inventory relationships
  const allParts = await prisma.part.findMany();
  let inventoryUpserts = 0;

  for (let i = 0; i < allParts.length; i++) {
    const part = allParts[i];
    
    // WH-OSK-01 (All parts, mixed status)
    let qty1 = 50; // NORMAL
    if (i % 5 === 0) qty1 = 3; // LOW
    if (i % 7 === 0) qty1 = 0; // OUT
    if (i % 9 === 0) qty1 = 120; // OVER (maxStock is usually 20-60)

    const status1 = qty1 === 0 ? 'OUT' : qty1 < part.minStock ? 'LOW' : qty1 > part.maxStock ? 'OVER' : 'NORMAL';

    await prisma.inventory.upsert({
      where: { partId_warehouseId: { partId: part.id, warehouseId: warehouseMap['WH-OSK-01'].id } },
      update: { quantity: qty1, status: status1 },
      create: { partId: part.id, warehouseId: warehouseMap['WH-OSK-01'].id, quantity: qty1, status: status1, minStock: part.minStock, maxStock: part.maxStock, location: `RACK-A-${i}` },
    });
    inventoryUpserts++;

    // WH-TKY-02 (Only half of the parts)
    if (i % 2 === 0) {
      let qty2 = 25; // NORMAL
      if (i % 4 === 0) qty2 = 0; // OUT
      const status2 = qty2 === 0 ? 'OUT' : qty2 < part.minStock ? 'LOW' : qty2 > part.maxStock ? 'OVER' : 'NORMAL';

      await prisma.inventory.upsert({
        where: { partId_warehouseId: { partId: part.id, warehouseId: warehouseMap['WH-TKY-02'].id } },
        update: { quantity: qty2, status: status2 },
        create: { partId: part.id, warehouseId: warehouseMap['WH-TKY-02'].id, quantity: qty2, status: status2, minStock: part.minStock, maxStock: part.maxStock, location: `RACK-T-${i}` },
      });
      inventoryUpserts++;
    }
  }

  console.log(`Upserted ${inventoryUpserts} Inventory records`);

  // 8. Update Warehouse Occupancies
  for (const code of Object.keys(warehouseMap)) {
    const wh = warehouseMap[code];
    const totalQty = await prisma.inventory.aggregate({
      where: { warehouseId: wh.id },
      _sum: { quantity: true }
    });
    
    await prisma.warehouse.update({
      where: { id: wh.id },
      data: { currentOccupancy: totalQty._sum.quantity || 0 }
    });
  }
  console.log('Updated Warehouse Occupancies');

  // 9. Import Receipts
  // Clean existing details to allow upserting receipts cleanly for the seed
  await prisma.importReceiptDetail.deleteMany({});
  
  const importReceiptsData = [
    {
      receiptNumber: 'IMP-2026-000001',
      supplierId: supplierMap['Michelin Japan'],
      warehouseId: warehouseMap['WH-OSK-01'].id,
      userId: roles['Administrator'], // admin
      poNumber: 'PO-2026-001',
      deliveryNote: 'DN-001',
      status: 'COMPLETED' as any,
      details: [
        { partId: allParts[3].id, quantity: 20, unitPrice: 22000, totalPrice: 440000, notes: 'Restock' }
      ]
    },
    {
      receiptNumber: 'IMP-2026-000002',
      supplierId: supplierMap['BBS Wheels'],
      warehouseId: warehouseMap['WH-TKY-02'].id,
      userId: roles['Manager'],
      poNumber: 'PO-2026-002',
      status: 'PENDING' as any,
      details: [
        { partId: allParts[0].id, quantity: 10, unitPrice: 75000, totalPrice: 750000, notes: 'Urgent' }
      ]
    },
    {
      receiptNumber: 'IMP-2026-000003',
      supplierId: supplierMap['Enkei Tuning'],
      warehouseId: warehouseMap['WH-OSK-01'].id,
      userId: roles['Warehouse Staff'],
      status: 'DRAFT' as any,
      details: [
        { partId: allParts[1].id, quantity: 5, unitPrice: 25000, totalPrice: 125000, notes: '' },
        { partId: allParts[8].id, quantity: 50, unitPrice: 3500, totalPrice: 175000, notes: '' }
      ]
    }
  ];

  for (const ir of importReceiptsData) {
    const totalAmount = ir.details.reduce((sum, d) => sum + d.totalPrice, 0);

    await prisma.importReceipt.upsert({
      where: { receiptNumber: ir.receiptNumber },
      update: {
        status: ir.status,
        totalAmount,
        details: {
          create: ir.details
        }
      },
      create: {
        receiptNumber: ir.receiptNumber,
        supplierId: ir.supplierId,
        warehouseId: ir.warehouseId,
        userId: 1, // Admin fallback
        poNumber: ir.poNumber,
        deliveryNote: ir.deliveryNote,
        status: ir.status,
        totalAmount,
        details: {
          create: ir.details
        }
      }
    });
  }
  console.log('Upserted Import Receipts');

  // 10. Export Receipts
  await prisma.exportReceiptDetail.deleteMany({});

  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });
  const managerUser = await prisma.user.findUnique({ where: { username: 'manager' } });
  const warehouseUser = await prisma.user.findUnique({ where: { username: 'warehouse' } });
  const assemblyUser = await prisma.user.findUnique({ where: { username: 'assembly' } });

  const exportReceiptsData = [
    {
      receiptNumber: 'EXP-2026-000001',
      warehouseId: warehouseMap['WH-OSK-01'].id,
      userId: warehouseUser?.id || 1,
      approvedBy: managerUser?.id || adminUser?.id || 1,
      requestDepartment: 'Assembly Line 1',
      reason: 'Standard parts dispatch for sports wheel kit assembly',
      status: 'COMPLETED' as any,
      details: [
        {
          partId: allParts[0].id,
          quantity: 2,
          unitPrice: 95000,
          totalPrice: 190000,
          locationPicked: 'RACK-A-0',
        },
        {
          partId: allParts[1].id,
          quantity: 4,
          unitPrice: 35000,
          totalPrice: 140000,
          locationPicked: 'RACK-A-1',
        },
      ],
    },
    {
      receiptNumber: 'EXP-2026-000002',
      warehouseId: warehouseMap['WH-OSK-01'].id,
      userId: assemblyUser?.id || warehouseUser?.id || 1,
      approvedBy: null,
      requestDepartment: 'Tokyo Dealership',
      reason: 'Urgent tire replenishment for customer order',
      status: 'PENDING' as any,
      details: [
        {
          partId: allParts[2].id,
          quantity: 2,
          unitPrice: 60000,
          totalPrice: 120000,
          locationPicked: 'RACK-A-2',
        },
      ],
    },
    {
      receiptNumber: 'EXP-2026-000003',
      warehouseId: warehouseMap['WH-TKY-02'].id,
      userId: warehouseUser?.id || 1,
      approvedBy: null,
      requestDepartment: 'Kobe Branch Transfer',
      reason: 'Internal logistics transfer draft',
      status: 'DRAFT' as any,
      details: [
        {
          partId: allParts[0].id,
          quantity: 1,
          unitPrice: 95000,
          totalPrice: 95000,
          locationPicked: 'RACK-T-0',
        },
      ],
    },
    {
      receiptNumber: 'EXP-2026-000004',
      warehouseId: warehouseMap['WH-OSK-01'].id,
      userId: warehouseUser?.id || 1,
      approvedBy: null,
      requestDepartment: 'QC Testing Lab',
      reason: 'Order cancelled due to test schedule postponement',
      status: 'CANCELLED' as any,
      details: [
        {
          partId: allParts[7].id,
          quantity: 5,
          unitPrice: 6500,
          totalPrice: 32500,
          locationPicked: 'RACK-A-7',
        },
      ],
    },
  ];

  for (const er of exportReceiptsData) {
    const totalAmount = er.details.reduce((sum, d) => sum + d.totalPrice, 0);

    await prisma.exportReceipt.upsert({
      where: { receiptNumber: er.receiptNumber },
      update: {
        warehouseId: er.warehouseId,
        status: er.status,
        totalAmount: new Prisma.Decimal(totalAmount),
        requestDepartment: er.requestDepartment,
        reason: er.reason,
        approvedBy: er.approvedBy,
        details: {
          create: er.details.map((d) => ({
            partId: d.partId,
            quantity: d.quantity,
            unitPrice: new Prisma.Decimal(d.unitPrice),
            totalPrice: new Prisma.Decimal(d.totalPrice),
            locationPicked: d.locationPicked,
          })),
        },
      },
      create: {
        receiptNumber: er.receiptNumber,
        warehouseId: er.warehouseId,
        userId: er.userId,
        approvedBy: er.approvedBy,
        requestDepartment: er.requestDepartment,
        reason: er.reason,
        status: er.status,
        totalAmount: new Prisma.Decimal(totalAmount),
        details: {
          create: er.details.map((d) => ({
            partId: d.partId,
            quantity: d.quantity,
            unitPrice: new Prisma.Decimal(d.unitPrice),
            totalPrice: new Prisma.Decimal(d.totalPrice),
            locationPicked: d.locationPicked,
          })),
        },
      },
    });
  }
  console.log('Upserted Export Receipts');

  // 9. Stock Checks (Phase 8)
  const stockChecksData = [
    {
      checkNumber: 'CHK-2026-000001',
      warehouseId: warehouseMap['WH-TKY-02'].id,
      performedBy: warehouseUser?.id || 1,
      status: 'DRAFT' as const,
      notes: 'Đợt kiểm kê dự thảo định kỳ đầu quý 3',
      details: [
        { partId: allParts[0].id, systemQty: 50, actualQty: null, difference: null, status: 'NOT_COUNTED' as const },
        { partId: allParts[1].id, systemQty: 40, actualQty: null, difference: null, status: 'NOT_COUNTED' as const },
      ],
    },
    {
      checkNumber: 'CHK-2026-000002',
      warehouseId: warehouseMap['WH-TKY-02'].id,
      performedBy: warehouseUser?.id || 1,
      status: 'IN_PROGRESS' as const,
      notes: 'Đợt kiểm kê đang tiến hành đếm thực tế tại kệ A & B',
      details: [
        { partId: allParts[2].id, systemQty: 30, actualQty: 30, difference: 0, status: 'MATCHED' as const },
        { partId: allParts[3].id, systemQty: 25, actualQty: null, difference: null, status: 'NOT_COUNTED' as const },
      ],
    },
    {
      checkNumber: 'CHK-2026-000003',
      warehouseId: warehouseMap['WH-OSK-01'].id,
      performedBy: warehouseUser?.id || 1,
      status: 'COMPLETED' as const,
      notes: 'Đã hoàn tất đếm, phát hiện chênh lệch thừa/thiếu chờ quản lý duyệt điều chỉnh',
      details: [
        { partId: allParts[4].id, systemQty: 20, actualQty: 18, difference: -2, status: 'SHORTAGE' as const, notes: '2 lốp bị rách mép loại bỏ chưa xuất' },
        { partId: allParts[5].id, systemQty: 15, actualQty: 17, difference: 2, status: 'SURPLUS' as const, notes: '2 vành trả về từ lắp ráp chưa nhập kho' },
        { partId: allParts[6].id, systemQty: 22, actualQty: 22, difference: 0, status: 'MATCHED' as const, notes: 'Khớp 100%' },
      ],
    },
    {
      checkNumber: 'CHK-2026-000004',
      warehouseId: warehouseMap['WH-TKY-02'].id,
      performedBy: warehouseUser?.id || 1,
      status: 'COMPLETED' as const,
      notes: 'Kiểm kê chuyên đề phụ kiện - Khớp 100% không phát sinh chênh lệch',
      details: [
        { partId: allParts[7].id, systemQty: 10, actualQty: 10, difference: 0, status: 'MATCHED' as const },
        { partId: allParts[8].id, systemQty: 12, actualQty: 12, difference: 0, status: 'MATCHED' as const },
      ],
    },
    {
      checkNumber: 'CHK-2026-000005',
      warehouseId: warehouseMap['WH-OSK-01'].id,
      performedBy: warehouseUser?.id || 1,
      status: 'ADJUSTED' as const,
      notes: 'Đợt kiểm kê tháng 5 - Quản lý đã cân bằng kho cho các mục lệch',
      details: [
        {
          partId: allParts[0].id,
          systemQty: 35,
          actualQty: 33,
          difference: -2,
          status: 'SHORTAGE' as const,
          isAdjusted: true,
          adjustedAt: new Date(),
          adjustedQty: 33,
          notes: 'Đã xuất phiếu điều chỉnh giảm tồn',
        },
        {
          partId: allParts[1].id,
          systemQty: 28,
          actualQty: 28,
          difference: 0,
          status: 'MATCHED' as const,
          isAdjusted: false,
        },
      ],
    },
    {
      checkNumber: 'CHK-2026-000006',
      warehouseId: warehouseMap['WH-TKY-02'].id,
      performedBy: warehouseUser?.id || 1,
      status: 'CANCELLED' as const,
      notes: 'Hủy đợt kiểm kê do phát sinh lịch bảo trì đột xuất',
      details: [
        { partId: allParts[2].id, systemQty: 30, actualQty: null, difference: null, status: 'NOT_COUNTED' as const },
      ],
    },
  ];

  for (const sc of stockChecksData) {
    const existing = await prisma.stockCheck.findUnique({
      where: { checkNumber: sc.checkNumber },
      include: { details: true },
    });

    if (existing) {
      await prisma.stockCheck.update({
        where: { id: existing.id },
        data: {
          warehouseId: sc.warehouseId,
          performedBy: sc.performedBy,
          status: sc.status,
          notes: sc.notes,
        },
      });
    } else {
      await prisma.stockCheck.create({
        data: {
          checkNumber: sc.checkNumber,
          warehouseId: sc.warehouseId,
          performedBy: sc.performedBy,
          status: sc.status,
          notes: sc.notes,
          details: {
            create: sc.details.map((d: any) => ({
              partId: d.partId,
              systemQty: d.systemQty,
              actualQty: d.actualQty,
              difference: d.difference,
              status: d.status,
              notes: d.notes || null,
              isAdjusted: d.isAdjusted || false,
              adjustedAt: d.adjustedAt || null,
              adjustedQty: d.adjustedQty || null,
            })),
          },
        },
      });
    }
  }
  console.log('Upserted Stock Checks (Phase 8)');

  // 10. Quality Checks (Phase 9)
  const qcUser = await prisma.user.findUnique({ where: { username: 'qc' } });

  const qualityChecksData = [
    {
      checkNumber: 'QC-2026-000001',
      partId: allParts[0].id,
      warehouseId: warehouseMap['WH-OSK-01'].id,
      checkedBy: qcUser?.id || 1,
      quantityChecked: 20,
      quantityPassed: 20,
      quantityFailed: 0,
      failureType: null,
      failureDescription: null,
      severity: 'MINOR' as const,
      action: 'ACCEPT' as const,
      result: 'PASSED' as const,
      status: 'DRAFT' as const,
    },
    {
      checkNumber: 'QC-2026-000002',
      partId: allParts[1].id,
      warehouseId: warehouseMap['WH-OSK-01'].id,
      checkedBy: qcUser?.id || 1,
      quantityChecked: 15,
      quantityPassed: 13,
      quantityFailed: 2,
      failureType: 'SURFACE',
      failureDescription: 'Vết xước bề mặt mâm đúc hợp kim do ma sát vận chuyển',
      severity: 'MODERATE' as const,
      action: 'REWORK' as const,
      result: 'PARTIALLY_PASSED' as const,
      status: 'IN_PROGRESS' as const,
    },
    {
      checkNumber: 'QC-2026-000003',
      partId: allParts[2].id,
      warehouseId: warehouseMap['WH-TKY-02'].id,
      checkedBy: qcUser?.id || 1,
      quantityChecked: 50,
      quantityPassed: 50,
      quantityFailed: 0,
      failureType: null,
      failureDescription: null,
      severity: 'MINOR' as const,
      action: 'ACCEPT' as const,
      result: 'PASSED' as const,
      status: 'COMPLETED' as const,
    },
    {
      checkNumber: 'QC-2026-000004',
      partId: allParts[3].id,
      warehouseId: warehouseMap['WH-OSK-01'].id,
      checkedBy: qcUser?.id || 1,
      quantityChecked: 30,
      quantityPassed: 27,
      quantityFailed: 3,
      failureType: 'DIMENSIONAL',
      failureDescription: 'Sai lệch đường kính trong 0.2mm so với bản vẽ thiết kế',
      severity: 'MAJOR' as const,
      action: 'QUARANTINE' as const,
      result: 'PARTIALLY_PASSED' as const,
      status: 'COMPLETED' as const,
    },
    {
      checkNumber: 'QC-2026-000005',
      partId: allParts[4].id,
      warehouseId: warehouseMap['WH-TKY-02'].id,
      checkedBy: qcUser?.id || 1,
      quantityChecked: 10,
      quantityPassed: 0,
      quantityFailed: 10,
      failureType: 'MATERIAL',
      failureDescription: 'Hợp chất cao su không đạt độ cứng Shore A theo tiêu chuẩn JIS D4230',
      severity: 'CRITICAL' as const,
      action: 'REJECT' as const,
      result: 'FAILED' as const,
      status: 'COMPLETED' as const,
    },
    {
      checkNumber: 'QC-2026-000006',
      partId: allParts[5].id,
      warehouseId: warehouseMap['WH-OSK-01'].id,
      checkedBy: qcUser?.id || 1,
      quantityChecked: 25,
      quantityPassed: 20,
      quantityFailed: 5,
      failureType: 'FUNCTIONAL',
      failureDescription: 'Lực siết van áp suất không kín, phát hiện rò rỉ khí áp suất 3.0 bar',
      severity: 'HIGH' as const,
      action: 'RETURN_TO_SUPPLIER' as const,
      result: 'PARTIALLY_PASSED' as const,
      status: 'COMPLETED' as const,
    },
    {
      checkNumber: 'QC-2026-000007',
      partId: allParts[6].id,
      warehouseId: warehouseMap['WH-OSK-01'].id,
      checkedBy: qcUser?.id || 1,
      quantityChecked: 40,
      quantityPassed: 36,
      quantityFailed: 4,
      failureType: 'ASSEMBLY',
      failureDescription: 'Nứt vi mô tại vị trí lỗ bắt bu-lông, nguy cơ gãy vỡ khi chịu tải',
      severity: 'CRITICAL' as const,
      action: 'DISPOSE' as const,
      result: 'PARTIALLY_PASSED' as const,
      status: 'COMPLETED' as const,
      isAdjusted: true,
      adjustedAt: new Date(),
      dispositionNotes: 'Đã xuất hủy 4 sản phẩm lỗi nứt mâm theo phê duyệt của Quản lý vận hành',
    },
    {
      checkNumber: 'QC-2026-000008',
      partId: allParts[7].id,
      warehouseId: warehouseMap['WH-OSK-01'].id,
      checkedBy: qcUser?.id || 1,
      quantityChecked: 10,
      quantityPassed: 10,
      quantityFailed: 0,
      failureType: null,
      failureDescription: null,
      severity: 'MINOR' as const,
      action: 'ACCEPT' as const,
      result: 'PASSED' as const,
      status: 'CANCELLED' as const,
    },
  ];

  for (const qc of qualityChecksData) {
    await prisma.qualityCheck.upsert({
      where: { checkNumber: qc.checkNumber },
      update: {
        partId: qc.partId,
        warehouseId: qc.warehouseId,
        checkedBy: qc.checkedBy,
        quantityChecked: qc.quantityChecked,
        quantityPassed: qc.quantityPassed,
        quantityFailed: qc.quantityFailed,
        failureType: qc.failureType,
        failureDescription: qc.failureDescription,
        severity: qc.severity,
        action: qc.action,
        result: qc.result,
        status: qc.status,
        isAdjusted: qc.isAdjusted || false,
        adjustedAt: qc.adjustedAt || null,
        dispositionNotes: qc.dispositionNotes || null,
      },
      create: {
        checkNumber: qc.checkNumber,
        partId: qc.partId,
        warehouseId: qc.warehouseId,
        checkedBy: qc.checkedBy,
        quantityChecked: qc.quantityChecked,
        quantityPassed: qc.quantityPassed,
        quantityFailed: qc.quantityFailed,
        failureType: qc.failureType,
        failureDescription: qc.failureDescription,
        severity: qc.severity,
        action: qc.action,
        result: qc.result,
        status: qc.status,
        isAdjusted: qc.isAdjusted || false,
        adjustedAt: qc.adjustedAt || null,
        dispositionNotes: qc.dispositionNotes || null,
      },
    });
  }
  console.log('Upserted Quality Checks (Phase 9)');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
