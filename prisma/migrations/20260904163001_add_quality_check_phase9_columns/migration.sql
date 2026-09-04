-- AlterTable
ALTER TABLE "quality_checks" ADD COLUMN     "adjustedAt" TIMESTAMP(3),
ADD COLUMN     "adjustedBy" INTEGER,
ADD COLUMN     "dispositionNotes" TEXT,
ADD COLUMN     "isAdjusted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "result" "QualityCheckResult",
ADD COLUMN     "warehouseId" INTEGER,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "quality_checks_warehouseId_idx" ON "quality_checks"("warehouseId");

-- CreateIndex
CREATE INDEX "quality_checks_result_idx" ON "quality_checks"("result");

-- AddForeignKey
ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
