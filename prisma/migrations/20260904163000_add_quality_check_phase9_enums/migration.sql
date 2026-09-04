-- CreateEnum
CREATE TYPE "QualityCheckResult" AS ENUM ('PASSED', 'PARTIALLY_PASSED', 'FAILED');

-- AlterEnum
ALTER TYPE "QualityCheckSeverity" ADD VALUE 'LOW';
ALTER TYPE "QualityCheckSeverity" ADD VALUE 'MEDIUM';
ALTER TYPE "QualityCheckSeverity" ADD VALUE 'HIGH';

-- AlterEnum
ALTER TYPE "QualityCheckAction" ADD VALUE 'ACCEPT';
ALTER TYPE "QualityCheckAction" ADD VALUE 'REWORK';
ALTER TYPE "QualityCheckAction" ADD VALUE 'REINSPECT';
ALTER TYPE "QualityCheckAction" ADD VALUE 'QUARANTINE';
ALTER TYPE "QualityCheckAction" ADD VALUE 'REJECT';
ALTER TYPE "QualityCheckAction" ADD VALUE 'RETURN_TO_SUPPLIER';

-- AlterEnum
ALTER TYPE "QualityCheckStatus" ADD VALUE 'DRAFT';
ALTER TYPE "QualityCheckStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "QualityCheckStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "QualityCheckStatus" ADD VALUE 'CANCELLED';
