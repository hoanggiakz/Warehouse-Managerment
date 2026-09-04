-- CreateIndex
CREATE UNIQUE INDEX "quality_checks_checkNumber_key" ON "quality_checks"("checkNumber");

-- CreateIndex
CREATE INDEX "quality_checks_partId_idx" ON "quality_checks"("partId");

-- CreateIndex
CREATE INDEX "quality_checks_checkDate_idx" ON "quality_checks"("checkDate");

-- CreateIndex
CREATE INDEX "quality_checks_status_idx" ON "quality_checks"("status");
