-- AlterTable
ALTER TABLE "export_receipts" ADD COLUMN "warehouseId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "export_receipts_warehouseId_idx" ON "export_receipts"("warehouseId");

-- AddForeignKey
ALTER TABLE "export_receipts" ADD CONSTRAINT "export_receipts_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
