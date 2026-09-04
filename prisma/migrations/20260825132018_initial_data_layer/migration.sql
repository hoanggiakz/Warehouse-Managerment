-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PartStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "WarehouseStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('NORMAL', 'LOW', 'OUT', 'OVER');

-- CreateEnum
CREATE TYPE "ImportReceiptStatus" AS ENUM ('DRAFT', 'PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExportReceiptStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockCheckStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ADJUSTED');

-- CreateEnum
CREATE TYPE "StockCheckDetailStatus" AS ENUM ('MATCHED', 'SURPLUS', 'SHORTAGE');

-- CreateEnum
CREATE TYPE "QualityCheckSeverity" AS ENUM ('MINOR', 'MODERATE', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "QualityCheckAction" AS ENUM ('RETURN', 'RECYCLE', 'DISPOSE', 'REPAIR');

-- CreateEnum
CREATE TYPE "QualityCheckStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('INVENTORY', 'IMPORT_EXPORT', 'QUALITY', 'DASHBOARD');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,
    "department" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" INTEGER,
    "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "taxCode" TEXT,
    "bankAccount" TEXT,
    "rating" DECIMAL(2,1) NOT NULL DEFAULT 5.0,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "brand" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "purchasePrice" DECIMAL(12,2) NOT NULL,
    "salePrice" DECIMAL(12,2) NOT NULL,
    "supplierId" INTEGER,
    "specifications" JSONB,
    "imageUrl" TEXT,
    "minStock" INTEGER NOT NULL DEFAULT 10,
    "maxStock" INTEGER NOT NULL DEFAULT 1000,
    "locationDefault" TEXT,
    "status" "PartStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "description" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 10000,
    "currentOccupancy" INTEGER NOT NULL DEFAULT 0,
    "status" "WarehouseStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventories" (
    "id" SERIAL NOT NULL,
    "partId" INTEGER NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 10,
    "maxStock" INTEGER NOT NULL DEFAULT 1000,
    "location" TEXT,
    "status" "InventoryStatus" NOT NULL DEFAULT 'NORMAL',
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_receipts" (
    "id" SERIAL NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "importDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "poNumber" TEXT,
    "deliveryNote" TEXT,
    "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" "ImportReceiptStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_receipt_details" (
    "id" SERIAL NOT NULL,
    "importId" INTEGER NOT NULL,
    "partId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "import_receipt_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_receipts" (
    "id" SERIAL NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "requestDepartment" TEXT,
    "exportDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "approvedBy" INTEGER,
    "status" "ExportReceiptStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_receipt_details" (
    "id" SERIAL NOT NULL,
    "exportId" INTEGER NOT NULL,
    "partId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(14,2) NOT NULL,
    "locationPicked" TEXT,

    CONSTRAINT "export_receipt_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_checks" (
    "id" SERIAL NOT NULL,
    "checkNumber" TEXT NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "performedBy" INTEGER NOT NULL,
    "checkDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StockCheckStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_check_details" (
    "id" SERIAL NOT NULL,
    "stockCheckId" INTEGER NOT NULL,
    "partId" INTEGER NOT NULL,
    "systemQty" INTEGER NOT NULL,
    "actualQty" INTEGER NOT NULL,
    "difference" INTEGER NOT NULL,
    "status" "StockCheckDetailStatus" NOT NULL DEFAULT 'MATCHED',
    "notes" TEXT,

    CONSTRAINT "stock_check_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_checks" (
    "id" SERIAL NOT NULL,
    "checkNumber" TEXT NOT NULL,
    "partId" INTEGER NOT NULL,
    "importId" INTEGER,
    "checkedBy" INTEGER NOT NULL,
    "checkDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantityChecked" INTEGER NOT NULL,
    "quantityPassed" INTEGER NOT NULL,
    "quantityFailed" INTEGER NOT NULL,
    "failureType" TEXT,
    "failureDescription" TEXT,
    "severity" "QualityCheckSeverity" NOT NULL DEFAULT 'MINOR',
    "images" JSONB,
    "action" "QualityCheckAction" NOT NULL DEFAULT 'RETURN',
    "status" "QualityCheckStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "title" TEXT NOT NULL,
    "parameters" JSONB,
    "generatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" INTEGER NOT NULL,
    "dataSummary" JSONB,
    "fileUrl" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_roleId_idx" ON "users"("roleId");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE INDEX "categories_status_idx" ON "categories"("status");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_name_key" ON "suppliers"("name");

-- CreateIndex
CREATE INDEX "suppliers_status_idx" ON "suppliers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "parts_sku_key" ON "parts"("sku");

-- CreateIndex
CREATE INDEX "parts_name_idx" ON "parts"("name");

-- CreateIndex
CREATE INDEX "parts_categoryId_idx" ON "parts"("categoryId");

-- CreateIndex
CREATE INDEX "parts_supplierId_idx" ON "parts"("supplierId");

-- CreateIndex
CREATE INDEX "parts_status_idx" ON "parts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE INDEX "warehouses_status_idx" ON "warehouses"("status");

-- CreateIndex
CREATE INDEX "inventories_status_idx" ON "inventories"("status");

-- CreateIndex
CREATE UNIQUE INDEX "inventories_partId_warehouseId_key" ON "inventories"("partId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "import_receipts_receiptNumber_key" ON "import_receipts"("receiptNumber");

-- CreateIndex
CREATE INDEX "import_receipts_supplierId_idx" ON "import_receipts"("supplierId");

-- CreateIndex
CREATE INDEX "import_receipts_warehouseId_idx" ON "import_receipts"("warehouseId");

-- CreateIndex
CREATE INDEX "import_receipts_importDate_idx" ON "import_receipts"("importDate");

-- CreateIndex
CREATE INDEX "import_receipts_status_idx" ON "import_receipts"("status");

-- CreateIndex
CREATE INDEX "import_receipt_details_importId_idx" ON "import_receipt_details"("importId");

-- CreateIndex
CREATE INDEX "import_receipt_details_partId_idx" ON "import_receipt_details"("partId");

-- CreateIndex
CREATE UNIQUE INDEX "export_receipts_receiptNumber_key" ON "export_receipts"("receiptNumber");

-- CreateIndex
CREATE INDEX "export_receipts_exportDate_idx" ON "export_receipts"("exportDate");

-- CreateIndex
CREATE INDEX "export_receipts_status_idx" ON "export_receipts"("status");

-- CreateIndex
CREATE INDEX "export_receipt_details_exportId_idx" ON "export_receipt_details"("exportId");

-- CreateIndex
CREATE INDEX "export_receipt_details_partId_idx" ON "export_receipt_details"("partId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_checks_checkNumber_key" ON "stock_checks"("checkNumber");

-- CreateIndex
CREATE INDEX "stock_checks_warehouseId_idx" ON "stock_checks"("warehouseId");

-- CreateIndex
CREATE INDEX "stock_checks_checkDate_idx" ON "stock_checks"("checkDate");

-- CreateIndex
CREATE INDEX "stock_checks_status_idx" ON "stock_checks"("status");

-- CreateIndex
CREATE INDEX "stock_check_details_stockCheckId_idx" ON "stock_check_details"("stockCheckId");

-- CreateIndex
CREATE INDEX "stock_check_details_partId_idx" ON "stock_check_details"("partId");

-- CreateIndex
CREATE UNIQUE INDEX "quality_checks_checkNumber_key" ON "quality_checks"("checkNumber");

-- CreateIndex
CREATE INDEX "quality_checks_partId_idx" ON "quality_checks"("partId");

-- CreateIndex
CREATE INDEX "quality_checks_checkDate_idx" ON "quality_checks"("checkDate");

-- CreateIndex
CREATE INDEX "quality_checks_status_idx" ON "quality_checks"("status");

-- CreateIndex
CREATE INDEX "reports_reportType_idx" ON "reports"("reportType");

-- CreateIndex
CREATE INDEX "reports_generatedDate_idx" ON "reports"("generatedDate");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parts" ADD CONSTRAINT "parts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parts" ADD CONSTRAINT "parts_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_receipts" ADD CONSTRAINT "import_receipts_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_receipts" ADD CONSTRAINT "import_receipts_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_receipts" ADD CONSTRAINT "import_receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_receipt_details" ADD CONSTRAINT "import_receipt_details_importId_fkey" FOREIGN KEY ("importId") REFERENCES "import_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_receipt_details" ADD CONSTRAINT "import_receipt_details_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_receipts" ADD CONSTRAINT "export_receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_receipts" ADD CONSTRAINT "export_receipts_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_receipt_details" ADD CONSTRAINT "export_receipt_details_exportId_fkey" FOREIGN KEY ("exportId") REFERENCES "export_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_receipt_details" ADD CONSTRAINT "export_receipt_details_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_checks" ADD CONSTRAINT "stock_checks_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_checks" ADD CONSTRAINT "stock_checks_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_check_details" ADD CONSTRAINT "stock_check_details_stockCheckId_fkey" FOREIGN KEY ("stockCheckId") REFERENCES "stock_checks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_check_details" ADD CONSTRAINT "stock_check_details_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_importId_fkey" FOREIGN KEY ("importId") REFERENCES "import_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_checkedBy_fkey" FOREIGN KEY ("checkedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Business-rule check constraints. Prisma does not model PostgreSQL CHECK
-- constraints directly, so these are maintained in the reviewed migration.
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_rating_range" CHECK ("rating" >= 0 AND "rating" <= 5);
ALTER TABLE "parts" ADD CONSTRAINT "parts_price_nonnegative" CHECK ("purchasePrice" >= 0 AND "salePrice" >= 0);
ALTER TABLE "parts" ADD CONSTRAINT "parts_stock_range" CHECK ("minStock" >= 0 AND "maxStock" >= "minStock");
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_capacity_range" CHECK ("capacity" >= 0 AND "currentOccupancy" >= 0 AND "currentOccupancy" <= "capacity");
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_quantity_nonnegative" CHECK ("quantity" >= 0);
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_stock_range" CHECK ("minStock" >= 0 AND "maxStock" >= "minStock");
ALTER TABLE "import_receipts" ADD CONSTRAINT "import_receipts_total_nonnegative" CHECK ("totalAmount" >= 0);
ALTER TABLE "import_receipt_details" ADD CONSTRAINT "import_receipt_details_values_valid" CHECK ("quantity" > 0 AND "unitPrice" >= 0 AND "totalPrice" >= 0);
ALTER TABLE "export_receipts" ADD CONSTRAINT "export_receipts_total_nonnegative" CHECK ("totalAmount" >= 0);
ALTER TABLE "export_receipt_details" ADD CONSTRAINT "export_receipt_details_values_valid" CHECK ("quantity" > 0 AND "unitPrice" >= 0 AND "totalPrice" >= 0);
ALTER TABLE "stock_check_details" ADD CONSTRAINT "stock_check_details_quantities_nonnegative" CHECK ("systemQty" >= 0 AND "actualQty" >= 0);
ALTER TABLE "stock_check_details" ADD CONSTRAINT "stock_check_details_difference_valid" CHECK ("difference" = "actualQty" - "systemQty");
ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_quantities_valid" CHECK ("quantityChecked" >= 0 AND "quantityPassed" >= 0 AND "quantityFailed" >= 0 AND "quantityChecked" = "quantityPassed" + "quantityFailed");
