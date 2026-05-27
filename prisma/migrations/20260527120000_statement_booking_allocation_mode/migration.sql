-- CreateEnum
CREATE TYPE "StatementBookingAllocationMode" AS ENUM ('FULL_PAYMENT', 'MANUAL');

-- AlterTable
ALTER TABLE "StatementBookingOverride" ADD COLUMN "allocation_mode" "StatementBookingAllocationMode" NOT NULL DEFAULT 'MANUAL';
