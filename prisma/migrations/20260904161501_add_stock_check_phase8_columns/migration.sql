-- AlterTable
ALTER TABLE "stock_check_details" ADD COLUMN     "adjustedAt" TIMESTAMP(3),
ADD COLUMN     "adjustedQty" INTEGER,
ADD COLUMN     "isAdjusted" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "actualQty" DROP NOT NULL,
ALTER COLUMN "difference" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'NOT_COUNTED';
