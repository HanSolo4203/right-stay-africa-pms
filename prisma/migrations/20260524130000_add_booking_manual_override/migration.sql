-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "is_manual_override" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ADD COLUMN "manual_monthly_note" TEXT;
