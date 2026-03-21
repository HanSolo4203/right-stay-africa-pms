-- CreateEnum
CREATE TYPE "StatementSource" AS ENUM ('UPLOADED', 'GENERATED');

-- CreateEnum
CREATE TYPE "StatementStatus" AS ENUM ('DRAFT', 'FINAL');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "right_stay_commission_percent" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "Statement" ADD COLUMN "source" "StatementSource" NOT NULL DEFAULT 'UPLOADED';
ALTER TABLE "Statement" ADD COLUMN "status" "StatementStatus";
ALTER TABLE "Statement" ADD COLUMN "snapshot" JSONB;
ALTER TABLE "Statement" ALTER COLUMN "file_url" DROP NOT NULL;
ALTER TABLE "Statement" ALTER COLUMN "file_name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "owner_statement_id" TEXT;

-- CreateIndex
CREATE INDEX "Booking_owner_statement_id_idx" ON "Booking"("owner_statement_id");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_owner_statement_id_fkey" FOREIGN KEY ("owner_statement_id") REFERENCES "Statement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- At most one finalized generated statement per property per calendar month
CREATE UNIQUE INDEX "Statement_one_final_generated_per_month" ON "Statement" ("property_id", "month", "year") WHERE ("source" = 'GENERATED'::"StatementSource" AND "status" = 'FINAL'::"StatementStatus");
